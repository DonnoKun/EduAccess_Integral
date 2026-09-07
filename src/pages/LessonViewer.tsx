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
import AudioPlayer from '@/components/AudioPlayer';
import CourseImage from '@/components/CourseImage';

import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { checkAnswer, type GroupLesson, type LessonContent } from '@/lib/courses';

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
  const startedAt = useRef(Date.now());

  const content: LessonContent = (lesson?.content as LessonContent) || {};
  const exercises = content.exercises || [];

  const correctCount = useMemo(
    () => Object.values(results).filter((r) => r === 'correct').length,
    [results]
  );
  const percentage = exercises.length > 0 ? Math.round((correctCount / exercises.length) * 100) : 0;

  useEffect(() => {
    const load = async () => {
      if (!lessonId) return;
      const { data } = await supabase.from('group_lessons').select('*').eq('id', lessonId).maybeSingle();
      setLesson((data as unknown as GroupLesson) || null);

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
        }
      }
      setIsLoading(false);
    };
    load();
  }, [lessonId, currentUser?.id, isStudent]);

  const saveProgress = async (completed = false) => {
    if (!currentUser?.id || !groupId || !lessonId || !isStudent) return;
    const elapsed = savedSeconds + Math.round((Date.now() - startedAt.current) / 1000);
    const payload = {
      lesson_id: lessonId,
      group_id: groupId,
      student_id: currentUser.id,
      completed,
      progress_percentage: completed ? 100 : percentage,
      exercises_completed: correctCount,
      exercises_total: exercises.length,
      time_spent_seconds: elapsed,
    };

    if (progressId) {
      await supabase.from('lesson_progress').update(payload).eq('id', progressId);
    } else {
      const { data } = await supabase.from('lesson_progress').insert(payload).select().single();
      if (data) setProgressId((data as any).id);
    }
  };

  // Persist time on unmount
  useEffect(() => {
    return () => {
      saveProgress(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressId, percentage, correctCount]);

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
    const result = checkAnswer(answers[index] || '', exercise.answer_keywords);
    setResults((prev) => ({ ...prev, [index]: result }));
  };

  const handleComplete = async () => {
    await saveProgress(true);
    toast.success(t('courses.lessonCompleted'));
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
      <header className="border-b">
        <div className="container mx-auto flex flex-wrap items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/courses/${groupId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('common.back')}
          </Button>
          <h1 className="break-words font-bold">{lesson.title}</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl space-y-6 px-4 py-6">
        {isStudent && exercises.length > 0 && (
          <div className="space-y-2">
            <p className="text-muted-foreground">{t('courses.yourProgress')}: {percentage}%</p>
            <Progress value={percentage} />
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t('contentViewer.introduction', 'Introducción')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AudioPlayer text={fullText} lang={lang} />
            <p className="whitespace-pre-line break-words">{content.introduction}</p>
          </CardContent>
        </Card>

        {(content.sections || []).map((section, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="break-words">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AudioPlayer
                text={`${section.title}. ${section.content}. ${section.image_alt || ''}`}
                lang={lang}
              />
              <p className="whitespace-pre-line break-words">{section.content}</p>
              {section.image_prompt && (
                <CourseImage
                  prompt={section.image_prompt}
                  alt={section.image_alt || section.title}
                  lang={lang}
                  sectionTitle={section.title}
                  sectionContext={section.content}
                />
              )}
              {section.keyPoints && section.keyPoints.length > 0 && (
                <ul className="list-disc space-y-1 pl-6">
                  {section.keyPoints.map((point, k) => (
                    <li key={k} className="break-words">{point}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}


        {(content.examples || []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('contentViewer.examples', 'Ejemplos prácticos')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AudioPlayer text={examplesText} lang={lang} />
              {(content.examples || []).map((example, i) => (
                <div key={i} className="space-y-1">
                  <h3 className="font-semibold break-words">{example.title}</h3>
                  <p className="whitespace-pre-line break-words">{example.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {exercises.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('contentViewer.exercises', 'Ejercicios de práctica')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <AudioPlayer text={exercisesText} lang={lang} />
              {exercises.map((exercise, i) => (
                <div key={i} className="space-y-2">
                  <p className="break-words font-medium">{i + 1}. {exercise.question}</p>
                  <Textarea
                    value={answers[i] || ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                    aria-label={t('courses.yourAnswer')}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" onClick={() => handleCheck(i)}>
                      {t('courses.checkAnswer')}
                    </Button>
                    {results[i] && (
                      <span role="status" className="break-words">
                        {t(`courses.answer_${results[i]}`)}
                      </span>
                    )}
                  </div>
                  {results[i] && results[i] !== 'correct' && exercise.solution && (
                    <p className="whitespace-pre-line break-words text-muted-foreground">
                      {exercise.solution}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {content.summary && (
          <Card>
            <CardHeader>
              <CardTitle>{t('contentViewer.summary', 'Resumen')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AudioPlayer text={content.summary} lang={lang} />
              <p className="whitespace-pre-line break-words">{content.summary}</p>
            </CardContent>
          </Card>
        )}

        {isStudent && (
          <Button onClick={handleComplete}>
            <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('courses.markCompleted')}
          </Button>
        )}
      </main>
    </div>
  );
}
