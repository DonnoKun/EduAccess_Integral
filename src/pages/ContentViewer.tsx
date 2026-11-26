/** Search lesson loader; shares the reading surface with group lessons. */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bookmark, BookmarkCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LessonReader from '@/components/LessonReader';
import LessonToolbar from '@/components/LessonToolbar';
import GenerationSteps from '@/components/GenerationSteps';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useLibrarySync } from '@/hooks/useLibrarySync';
import { useCourseCache } from '@/hooks/useCourseCache';
import { useSessionTracker } from '@/hooks/useSessionTracker';
import { supabase } from '@/integrations/supabase/client';
import { cachedAI, aiCacheKey } from '@/lib/aiCache';
import { checkAnswer, type LessonContent } from '@/lib/courses';
import { searchLessonIdentity } from '@/lib/lessonReading';
import { toast } from 'sonner';

export default function ContentViewer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { contentId } = useParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language.split('-')[0] === 'en' ? 'en' : 'es';
  const { currentUser } = useAuthStore();
  const { currentContent, recentContent, savedContent, completedContent, selectContent, incrementContentViewed } = useStore();
  const { saveContentToDB, updateProgressInDB } = useLibrarySync();
  const { getCachedCourse, saveCourseToCache } = useCourseCache();
  const { incrementTasksCompleted } = useSessionTracker();
  const [content, setContent] = useState<LessonContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, 'correct' | 'partial' | 'incorrect'>>({});
  const started = useRef(Date.now());
  const current = currentContent?.id === contentId ? currentContent : recentContent.find(c => c.id === contentId) || savedContent.find(c => c.id === contentId);
  const saved = savedContent.some(c => c.id === current?.id);
  const completed = completedContent.some(c => c.id === current?.id);
  const searchState = location.state as { fromSearch?: boolean; searchQuery?: string } | null;
  const back = () => navigate(searchState?.fromSearch ? `/search${searchState.searchQuery ? `?q=${encodeURIComponent(searchState.searchQuery)}` : ''}` : '/dashboard');

  useEffect(() => {
    if (current && currentContent?.id !== current.id) selectContent(current);
  }, [current?.id, currentContent?.id, selectContent]);

  useEffect(() => {
    if (!current || !currentUser) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true); setFailed(false); setAnswers({}); setResults({});
      started.current = Date.now();
      incrementContentViewed();
      // Record opening before inference, and preserve pin/completion if already present.
      await saveContentToDB(current, 'recent');
      const { data: progress } = await supabase.from('user_library').select('content_data').eq('user_id', currentUser.id).eq('content_data->>id', current.id).maybeSingle();
      const stored = progress?.content_data as unknown as { exerciseAnswers?: Record<number, string>; exerciseResults?: Record<number, 'correct' | 'partial' | 'incorrect'> } | null;
      if (!cancelled) { setAnswers(stored?.exerciseAnswers || {}); setResults(stored?.exerciseResults || {}); }
      try {
        const key = searchLessonIdentity(current);
        let lesson: LessonContent | null = current.lessonContent?.language === lang ? current.lessonContent : await getCachedCourse(key, lang);
        if (!lesson) {
          const original = current.lessonContent || await getCachedCourse(key, lang === 'es' ? 'en' : 'es');
          const data = await cachedAI(aiCacheKey('search-lesson-v4', key, lang), current.title, lang, async () => {
            const { data, error } = await supabase.functions.invoke('generate-course-content', { body: {
              title: current.title, description: current.description, contentType: current.contentType === 'video' ? 'article' : current.contentType,
              educationLevel: current.educationLevel, source: current.source, sourceUrl: current.url, language: lang, directSearch: true,
              ...(original ? { originalContent: original } : {}),
            } });
            if (error || !data?.success || !data.content) throw new Error(data?.error || error?.message || 'Lesson unavailable');
            return data.content;
          }, value => Boolean(value?.introduction));
          lesson = { ...data, language: lang };
          if (lesson) await saveCourseToCache(key, lang, lesson as Parameters<typeof saveCourseToCache>[2]);
        }
        if (cancelled || !lesson) return;
        setContent(lesson);
        await saveContentToDB({ ...current, lessonContent: lesson }, 'recent');
      } catch {
        if (!cancelled) { setFailed(true); setContent(null); }
      } finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; const elapsed = Math.round((Date.now() - started.current) / 1000); if (elapsed > 0) updateProgressInDB(current.id, { time_spent_seconds: elapsed }); };
  }, [current?.id, lang, currentUser?.id]);

  const exerciseState = useRef({ answers, results });
  exerciseState.current = { answers, results };
  useEffect(() => {
    if (!current || loading || !content) return;
    const save = async () => {
      const { data: row } = await supabase.from('user_library').select('id,content_data').eq('user_id', currentUser?.id || '').eq('content_data->>id', current.id).maybeSingle();
      if (!row) return;
      const state = exerciseState.current;
      const correct = Object.values(state.results).filter(r => r === 'correct').length;
      await supabase.from('user_library').update({ content_data: { ...(row.content_data as object), exerciseAnswers: state.answers, exerciseResults: state.results }, exercises_completed: correct, exercises_total: content.exercises?.length || 0,
        ...(!completed ? { progress_percentage: content.exercises?.length ? Math.round(100 * correct / content.exercises.length) : 0 } : {}) }).eq('id', row.id);
    };
    const timer = window.setTimeout(save, 600);
    return () => { window.clearTimeout(timer); save(); };
  }, [answers, results, loading, content, current?.id, completed]);

  const togglePin = async () => {
    if (!current) return;
    await saveContentToDB({ ...current, ...(content ? { lessonContent: content } : {}) }, saved ? 'unpinned' : 'saved');
    toast.success(saved ? (lang === 'es' ? 'Quitada de guardadas; continúa en recientes.' : 'Unpinned; still in recent lessons.') : (lang === 'es' ? 'Lección guardada.' : 'Lesson saved.'));
  };
  const check = (index: number) => {
    const exercise = content?.exercises?.[index];
    if (!exercise) return;
    const result = checkAnswer(answers[index] || '', exercise.answer_keywords, exercise.solution);
    if (result === 'correct' && results[index] !== 'correct') incrementTasksCompleted();
    setResults(prev => ({ ...prev, [index]: result }));
  };
  if (!current) return <main className="container mx-auto px-4 py-6"><p>{lang === 'es' ? 'Lección no encontrada.' : 'Lesson not found.'}</p><Button onClick={() => navigate('/search')}>{t('navigation.search')}</Button></main>;
  return <div className="min-h-screen bg-background">
    <a href="#lesson-main" className="skip-link">{t('common.skipToMain')}</a>
    <LessonToolbar title={current.title} onBack={back} actions={<Button variant={saved ? 'default' : 'outline'} size="icon" onClick={togglePin} aria-label={lang === 'es' ? 'Guardar lección' : 'Save lesson'} aria-pressed={saved}>{saved ? <BookmarkCheck /> : <Bookmark />}</Button>} />
    <main id="lesson-main" className="container mx-auto max-w-3xl space-y-6 px-4 py-6" aria-busy={loading}>
      {(current.educationLevel || current.contentType) && <p className="text-muted-foreground break-words">{[current.educationLevel && `${t('search.filters.level')}: ${t(`search.educationLevels.${current.educationLevel}`)}`, current.contentType && `${t('search.filters.contentType')}: ${t(`search.contentTypes.${current.contentType}`, current.contentType)}`].filter(Boolean).join(' · ')}</p>}
      {loading && <GenerationSteps lang={lang} />}
      {failed && <p role="alert">{lang === 'es' ? 'No se pudo preparar la lección. Se conserva en recientes para volver a abrirla.' : 'The lesson could not be prepared. It remains in recent lessons.'}</p>}
      {!loading && content && <>
        <LessonReader content={content} lang={lang} storageKey={`${currentUser?.id}:${current.id}`} answers={answers} results={results} onAnswer={(i, value) => setAnswers(prev => ({ ...prev, [i]: value }))} onCheck={check} />
        <Button disabled={completed} onClick={async () => { await saveContentToDB({ ...current, lessonContent: content }, 'completed'); toast.success(t('courses.lessonCompleted')); }}><CheckCircle2 className="mr-2 h-4 w-4" />{completed ? (lang === 'es' ? 'Completada' : 'Completed') : t('courses.markCompleted')}</Button>
      </>}
    </main>
  </div>;
}
