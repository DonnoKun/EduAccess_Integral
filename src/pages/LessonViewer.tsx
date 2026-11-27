/**
 * EduAccess - Group lesson viewer
 * Accessible lesson reader with per-section audio, exercises and progress saving.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import LessonReader from '@/components/LessonReader';
import LessonQualityPanel from '@/components/LessonQualityPanel';
import LessonToolbar from '@/components/LessonToolbar';
import { useCourseCache } from '@/hooks/useCourseCache';
import CourseImage from '@/components/CourseImage';

import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { checkAnswer, safeSourceUrl, type GroupLesson, type LessonContent } from '@/lib/courses';
import { cachedAI } from '@/lib/aiCache';
import { lessonPercentage } from '@/lib/lessonProgress';
import { useStore } from '@/store/useStore';
import { configureSpeech } from '@/lib/speech';
import { translateLesson } from '@/lib/lessonAssessment';
import { ownerLessonPreview, type LessonDraft } from '@/lib/lessonRevision';

export default function LessonViewerPage() {
  const { groupId, lessonId } = useParams<{ groupId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] || 'es';
  const { currentUser, role } = useAuthStore();
  const isStudent = role !== 'teacher';

  const [lesson, setLesson] = useState<GroupLesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, 'correct' | 'partial' | 'incorrect'>>({});
  const [progressId, setProgressId] = useState<string | null>(null);
  const [savedSeconds, setSavedSeconds] = useState(0);
  const [savedPercentage, setSavedPercentage] = useState(0);
  const [savedCorrectCount, setSavedCorrectCount] = useState(0);
  const completedRef = useRef(false);
  const startedAt = useRef(Date.now());

  const [ownerPreview, setOwnerPreview] = useState(false);
  const [translatedTitle, setTranslatedTitle] = useState('');
  const [translated, setTranslated] = useState<LessonContent | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translationFailed, setTranslationFailed] = useState(false);
  const [translationReason, setTranslationReason] = useState('');
  const [translationAttempt, setTranslationAttempt] = useState(0);
  const ttsEnabled = useStore(s => s.visualProfile?.technicalParameters?.enableTTS !== false);
  const { getCachedCourse, saveCourseToCache } = useCourseCache();
  const original: LessonContent = (lesson?.content as LessonContent) || {};
  const content: LessonContent = translated || original;
  const readingLanguage = content.language || (translationFailed ? ((`${content.introduction || ''}`.match(/\b(the|and|of|to)\b/gi) || []).length > 3 ? 'en' : 'es') : lang);

  // Show the lesson in the user's current language (translate once, then cache)
  useEffect(() => {
    if (!lesson) return;
    setTranslated(null);
    setTranslationFailed(false);
    setTranslating(false);
    setTranslatedTitle('');
    let cancelled = false;
    setTranslating(true);
    translateLesson({ title: lesson.title, description: lesson.description || '', content: original }, lang === 'en' ? 'en' : 'es')
      .then(value => { if (!cancelled) { setTranslated(value.content); setTranslatedTitle(value.title); } })
      .catch(error => { if (!cancelled) { setTranslationFailed(true); setTranslationReason(error instanceof Error ? error.message : ''); } })
      .finally(() => { if (!cancelled) setTranslating(false); });
    return () => { cancelled = true; };
  }, [lesson, lang, translationAttempt]);
  const exercises = content.exercises || [];

  const correctCount = useMemo(
    () => Math.max(savedCorrectCount, Object.values(results).filter((r) => r === 'correct').length),
    [results, savedCorrectCount]
  );
  const percentage = lessonPercentage(savedPercentage, correctCount, exercises.length, completedRef.current);

  const notice = [isStudent ? t('courses.pinnedVersion') : '', translating ? t('courses.translating') : '', translationFailed ? t('courses.translationFailed') : ''].filter(Boolean).join('. ');
  useEffect(() => {
    if (!notice || isLoading || !ttsEnabled || !window.speechSynthesis) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const synth = window.speechSynthesis;
      if (synth.speaking) return;
      const utterance = new SpeechSynthesisUtterance(notice);
      await configureSpeech(utterance, lang);
      if (cancelled || synth.speaking) return;
      synth.speak(utterance);
    }, 400);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [notice, lang, isLoading, ttsEnabled]);

  useEffect(() => {
    const load = async () => {
      if (!lessonId) return;
      setIsLoading(true);
      setAnswers({}); setResults({}); setProgressId(null);
      setSavedCorrectCount(0); setSavedPercentage(0); setSavedSeconds(0);
      completedRef.current = false;
      startedAt.current = Date.now();
      const { data } = await supabase.from('group_lessons').select('*').eq('id', lessonId).maybeSingle();
      const loaded = (data as unknown as GroupLesson) || null;
      setOwnerPreview(false);
      if (loaded && !isStudent) {
        const { data: row } = await supabase.from('lesson_drafts').select('payload').eq('lesson_id', lessonId).maybeSingle();
        const draft = row?.payload as unknown as LessonDraft | null;
        setLesson(ownerLessonPreview(loaded, draft));
        setOwnerPreview(Boolean(draft) || loaded.status === 'draft');
      } else setLesson(loaded);

      if (currentUser?.id && isStudent) {
        const { data: p } = await supabase
          .from('lesson_progress')
          .select('*')
          .eq('lesson_id', lessonId)
          .eq('student_id', currentUser.id)
          .maybeSingle();
        if (p) {
          setProgressId((p as any).id);
          setSavedSeconds((p as any).time_spent_seconds || 0);
          setSavedPercentage(p.progress_percentage);
          setSavedCorrectCount(p.exercises_completed);
          setAnswers(p.exercise_answers as Record<number, string> || {});
          setResults(p.exercise_results as Record<number, 'correct' | 'partial' | 'incorrect'> || {});
          completedRef.current = p.completed;
          if (p.lesson_snapshot) setLesson(p.lesson_snapshot as unknown as GroupLesson);
        } else if (data && groupId) {
          const { data: created, error } = await supabase.from('lesson_progress').insert({ lesson_id: lessonId, group_id: groupId, student_id: currentUser.id }).select().single();
          if (created) {
            setProgressId(created.id);
            if (created.lesson_snapshot) setLesson(created.lesson_snapshot as unknown as GroupLesson);
          } else if (error) toast.error(t('courses.progressSaveError'));
        }
      }
      setIsLoading(false);
    };
    load();
  }, [lessonId, currentUser?.id, isStudent]);

  const saveProgress = async (completed = false) => {
    if (!currentUser?.id || !groupId || !lessonId || !isStudent || isLoading || !progressId) return;
    if (completed) completedRef.current = true;
    const elapsed = savedSeconds + Math.round((Date.now() - startedAt.current) / 1000);
    const payload = {
      lesson_id: lessonId,
      group_id: groupId,
      student_id: currentUser.id,
      completed: completedRef.current,
      progress_percentage: completedRef.current ? 100 : percentage,
      exercises_completed: correctCount,
      exercises_total: exercises.length,
      time_spent_seconds: elapsed,
      exercise_answers: answers,
      exercise_results: results,
    };

    const { error } = await supabase.from('lesson_progress').update(payload).eq('id', progressId);
    if (error) throw error;
  };

  const saveRef = useRef(saveProgress);
  saveRef.current = saveProgress;
  // Autosave answers, preserve completion, and flush current data on exit.
  useEffect(() => {
    if (!progressId || isLoading) return;
    const timer = window.setTimeout(() => { saveRef.current().catch(() => toast.error(t('courses.progressSaveError'))); }, 600);
    return () => window.clearTimeout(timer);
  }, [answers, results, progressId, isLoading]);
  useEffect(() => {
    const flush = () => { saveRef.current().catch(() => {}); };
    const timer = window.setInterval(flush, 15000);
    const hidden = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', hidden);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', hidden); flush(); };
  }, []);

  const fullText = useMemo(() => {
    const parts: string[] = [];
    if (content.introduction) parts.push(content.introduction);
    (content.sections || []).forEach((s) => {
      parts.push(s.title, s.content);
      if (s.image_alt) parts.push(`${t('contentViewer.imageDescription', 'Descripción de la imagen')}: ${s.image_alt}`);
      (s.keyPoints || []).forEach((k) => parts.push(k));
    });
    return parts.join('. ');
  }, [content, t]);

  const examplesText = (content.examples || []).map((e) => `${e.title}. ${e.description}`).join('. ');
  const exercisesText = exercises.map((e, i) => `${i + 1}. ${e.question}`).join('. ');

  const handleCheck = (index: number) => {
    const exercise = exercises[index];
    const result = checkAnswer(answers[index] || '', exercise.answer_keywords, exercise.solution);
    setResults((prev) => ({ ...prev, [index]: result }));
  };

  const handleComplete = async () => {
    try {
      await saveProgress(true);
      setSavedPercentage(100);
      toast.success(t('courses.lessonCompleted'));
    } catch { toast.error(t('courses.progressSaveError')); }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="container mx-auto p-6">
        <p>{t('courses.lessonNotFound')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LessonToolbar title={translatedTitle || lesson.title} onBack={() => navigate(`/courses/${groupId}`)} />

      <main className="container mx-auto max-w-3xl space-y-6 px-4 py-6" aria-busy={translating}>
        {isStudent && <p className="text-muted-foreground">{t('courses.pinnedVersion')}</p>}
        {notice && ttsEnabled && <Button variant="outline" className="h-auto whitespace-normal" onClick={async () => {
          window.speechSynthesis?.cancel();
          const utterance = new SpeechSynthesisUtterance(notice);
          await configureSpeech(utterance, lang);
          window.speechSynthesis?.speak(utterance);
        }}>{lang === 'es' ? 'Escuchar avisos' : 'Listen to notices'}</Button>}
        {translationFailed && <div className="space-y-3">
          <p role="alert" className="text-foreground">{t('courses.translationFailed')}</p>
          {/402|credits|PaymentRequired/i.test(translationReason) && <p>{lang === 'es' ? 'No hay créditos de IA disponibles para traducir.' : 'AI credits are unavailable for translation.'}</p>}
          <Button variant="outline" className="h-auto whitespace-normal" onClick={() => setTranslationAttempt(n => n + 1)}>{lang === 'es' ? 'Reintentar traducción' : 'Retry translation'}</Button>
        </div>}
        {translating && (
          <p role="status" className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {t('courses.translating')}
          </p>
        )}
        {ownerPreview && <p role="status" className="border-l-2 border-border pl-3 break-words">{lang === 'es' ? 'Vista previa privada del borrador. Guardar, abrir o recargar no publica los cambios; los estudiantes solo ven la versión publicada.' : 'Private draft preview. Saving, opening or reloading does not publish changes; students only see the published version.'}</p>}
        {!translating && !translationFailed && <>
        {isStudent && (
          <div className="space-y-2">
            <p className="text-muted-foreground">{t('courses.yourProgress')}: {percentage}%</p>
            <Progress value={percentage} />
            <p className="break-words text-muted-foreground">{lang === 'es' ? `Ejercicios correctos: ${correctCount} de ${exercises.length}. También puedes finalizar con «Marcar completada». El porcentaje del audio indica solo la lectura de ese bloque.` : `Correct exercises: ${correctCount} of ${exercises.length}. You can also finish with “Mark completed”. The audio percentage tracks only the reading of that block.`}</p>
          </div>
        )}

        <LessonReader content={content} original={original} lang={readingLanguage} storageKey={`${currentUser?.id}:${lessonId}`} answers={answers} results={results} onAnswer={(i, value) => setAnswers(prev => ({ ...prev, [i]: value }))} onCheck={handleCheck} />

        <LessonQualityPanel quality={content.quality || original.quality} history={content.quality_history || original.quality_history} lessonTitle={translatedTitle || lesson.title} audience={isStudent ? 'student' : 'teacher'} />

        {isStudent && (
          <Button disabled={!progressId} onClick={handleComplete}>
            <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('courses.markCompleted')}
          </Button>
        )}
        </>}
      </main>
    </div>
  );
}
