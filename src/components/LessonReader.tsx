import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import AudioPlayer from '@/components/AudioPlayer';
import LessonText from '@/components/LessonText';
import { stripMarkdown } from '@/lib/lessonMarkdown';
import CourseImage from '@/components/CourseImage';
import { safeSourceUrl, type LessonContent } from '@/lib/courses';
import { lessonNarration, sectionNarration } from '@/lib/lessonReading';
import { useStore } from '@/store/useStore';
import { lessonModality } from '@/lib/lessonModality';
import { ChevronDown, ChevronUp } from 'lucide-react';

type Result = 'correct' | 'partial' | 'incorrect';
interface Props {
  content: LessonContent;
  original?: LessonContent;
  lang: string;
  storageKey: string;
  answers: Record<number, string>;
  results: Record<number, Result>;
  onAnswer: (index: number, value: string) => void;
  onCheck: (index: number) => void;
}

/** One visual/audio reading surface for search and group lessons. Persistence stays with each page. */
export default function LessonReader({ content, original = content, lang, storageKey, answers, results, onAnswer, onCheck }: Props) {
  const { t } = useTranslation();
  const [solutions, setSolutions] = useState<Set<number>>(new Set());
  const [imageDescriptions, setImageDescriptions] = useState<Record<number, string>>({});
  const profile = useStore(s => s.visualProfile);
  const { showAudio, showImages } = lessonModality(profile?.preferences.preferredModality, profile?.technicalParameters.enableTTS);
  const audio = (text: string, key: string) => !showAudio ? null : <AudioPlayer text={stripMarkdown(text)} lang={lang} storageKey={`${storageKey}:${key}:${lang}`} />;
  return <div className="space-y-8 min-w-0">
    {audio(lessonNarration(content), 'all')}
    {content.introduction && <section className="space-y-4" aria-labelledby="lesson-introduction">
      <h2 id="lesson-introduction" className="font-bold break-words">{t('contentViewer.introduction', 'Introducción')}</h2>
      {audio(content.introduction, 'intro')}
      <LessonText text={content.introduction} />
    </section>}
    {(content.sections || []).map((section, i) => <section key={i} className="space-y-4 border-t pt-6" aria-labelledby={`lesson-section-${i}`}>
      <h2 id={`lesson-section-${i}`} className="font-bold break-words">{section.title}</h2>
      {audio(sectionNarration({ ...section, image_alt: imageDescriptions[i] || section.image_alt }), `s${i}`)}
      <LessonText text={section.content} />
      {showImages && section.image_prompt && <CourseImage prompt={section.image_prompt} alt={section.image_alt || section.title} lang={lang}
        cacheAlt={original.sections?.[i]?.image_alt || original.sections?.[i]?.title}
        sectionTitle={original.sections?.[i]?.title || section.title} sectionContext={original.sections?.[i]?.content || section.content}
        onDescription={description => setImageDescriptions(prev => ({ ...prev, [i]: description }))} />}
      {showAudio && showImages && section.image_prompt && (imageDescriptions[i] || section.image_alt) && <div className="space-y-1">
        <p className="text-sm font-medium">{lang === 'es' ? 'Escuchar solo la descripción de la imagen' : 'Listen to the image description only'}</p>
        {audio(imageDescriptions[i] || section.image_alt || '', `img${i}`)}
      </div>}
      {!!section.keyPoints?.length && <div className="space-y-2">
        <h3 className="font-semibold">{lang === 'es' ? 'Puntos clave' : 'Key points'}</h3>
        <ul className="list-disc space-y-2 pl-6">{section.keyPoints.map((point, k) => <li key={k} className="break-words">{stripMarkdown(point)}</li>)}</ul>
      </div>}
    </section>)}
    {!!content.examples?.length && <section className="space-y-4 border-t pt-6">
      <h2 className="font-bold">{t('contentViewer.examples', 'Ejemplos prácticos')}</h2>
      {audio(content.examples.map(e => `${e.title}. ${e.description}`).join('. '), 'examples')}
      {content.examples.map((example, i) => <div key={i} className="space-y-2"><h3 className="font-semibold break-words">{example.title}</h3><LessonText text={example.description} /></div>)}
    </section>}
    {!!content.exercises?.length && <section className="space-y-6 border-t pt-6">
      <h2 className="font-bold">{t('contentViewer.exercises', 'Ejercicios de práctica')}</h2>
      {audio(content.exercises.map((e, i) => `${i + 1}. ${e.question}. ${e.hint || ''}`).join('. '), 'exercises')}
      {content.exercises.map((exercise, i) => <div key={i} className="space-y-3">
        <p className="font-medium break-words">{i + 1}. {exercise.question}</p>
        {exercise.hint && <p className="text-muted-foreground break-words">{exercise.hint}</p>}
        <Textarea value={answers[i] || ''} onChange={e => onAnswer(i, e.target.value)} aria-label={`${t('courses.yourAnswer')} ${i + 1}`} />
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="outline" disabled={!answers[i]?.trim()} onClick={() => onCheck(i)}>{t('courses.checkAnswer')}</Button>
          {results[i] && <span role="status">{t(`courses.answer_${results[i]}`)}</span>}
          {exercise.solution && <Button variant="outline" aria-expanded={solutions.has(i)} onClick={() => setSolutions(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next; })}>
            {solutions.has(i) ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
            {solutions.has(i) ? (lang === 'es' ? 'Ocultar solución' : 'Hide solution') : (lang === 'es' ? 'Ver solución' : 'Show solution')}
          </Button>}
        </div>
        {solutions.has(i) && exercise.solution && <div className="space-y-3 border-l-2 border-primary pl-4">
          {audio(exercise.solution, `solution${i}`)}<LessonText text={exercise.solution} />
        </div>}
      </div>)}
    </section>}
    {content.summary && <section className="space-y-4 border-t pt-6">
      <h2 className="font-bold">{t('contentViewer.summary', 'Resumen')}</h2>{audio(content.summary, 'summary')}
      <LessonText text={content.summary} />
    </section>}
    {!!content.sources?.length && <section className="space-y-4 border-t pt-6">
      <h2 className="font-bold">{t('courses.sourcesTitle')}</h2><p className="text-muted-foreground">{t('courses.sourcesNote')}</p>
      <ul className="list-disc space-y-3 pl-6">{content.sources.map((source, i) => {
        const href = safeSourceUrl(source.url);
        return <li key={i} className="break-words">{href ? <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-primary">{source.name}</a> : source.name}{source.description && <p className="text-muted-foreground">{source.description}</p>}</li>;
      })}</ul>
    </section>}
  </div>;
}