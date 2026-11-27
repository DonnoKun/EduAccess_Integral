import { useTranslation } from 'react-i18next';
import { Loader2, Pencil, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { LessonContent } from '@/lib/courses';

export default function LessonQualityPanel({ quality, busy = false, onReview, onEdit, onRegenerate, audience = 'teacher' }: {
  quality: LessonContent['quality']; busy?: boolean; onReview?: () => void;
  onEdit?: (sectionIndex?: number, exerciseIndex?: number) => void; onRegenerate?: (index: number) => void;
  audience?: 'teacher' | 'student';
}) {
  const { i18n } = useTranslation();
  const es = i18n.language.startsWith('es');
  const student = audience === 'student';
  const labels = es ? {
    title: 'Cobertura y revisión', coverage: 'Cobertura', confidence: 'Confianza estimada',
    low: 'Baja', medium: 'Media', high: 'Alta', covered: 'Temas cubiertos', missing: 'Posibles faltantes', superficial: 'Temas superficiales',
    flags: student ? 'Aspectos señalados para revisar' : 'Revisar antes de publicar', review: 'Evaluar cobertura', edit: 'Editar', regenerate: 'Regenerar sección',
    unreviewed: 'Sin evaluación de cobertura', stale: 'El contenido cambió después de la evaluación. Las señales anteriores requieren una nueva revisión.',
    caution: student
      ? 'Señales orientativas de IA, no una verificación de los hechos. Revisa las fuentes y consulta a tu docente si tienes dudas.'
      : 'Señales orientativas de IA, no verificación factual. La revisión y aprobación corresponden al docente.',
    length: 'Extensión', target: 'Objetivo: 3000 palabras', met: 'Objetivo alcanzado', short: 'Por debajo del objetivo', none: 'Ninguno señalado',
  } : {
    title: 'Coverage and review', coverage: 'Coverage', confidence: 'Estimated confidence',
    low: 'Low', medium: 'Medium', high: 'High', covered: 'Covered topics', missing: 'Possible gaps', superficial: 'Superficial topics',
    flags: student ? 'Points to review' : 'Review before publishing', review: 'Assess coverage', edit: 'Edit', regenerate: 'Regenerate section',
    unreviewed: 'Coverage not assessed', stale: 'Content changed after assessment. Previous signals need a new review.',
    caution: student
      ? 'Advisory AI signals, not factual verification. Check the sources and ask your teacher if you have questions.'
      : 'Advisory AI signals, not factual verification. Teachers are responsible for review and approval.',
    length: 'Length', target: 'Target: 3000 words', met: 'Target reached', short: 'Below target', none: 'None flagged',
  };
  return <section aria-label={labels.title} className="min-w-0 space-y-4 border-y py-5">
    <h2 className="font-semibold break-words">{labels.title}</h2>
    <p className="text-sm text-muted-foreground break-words">{labels.caution}</p>
    {!quality || quality.status === 'unavailable' ? <p role="status">{labels.unreviewed}</p> : <>
      {quality.status === 'stale' && <p role="status" className="font-medium">{labels.stale}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2"><p>{labels.coverage}: <strong>{quality.coverage}%</strong></p><Progress value={quality.coverage} aria-label={labels.coverage} /></div>
        <p className="break-words">{labels.confidence}: <strong>{labels[quality.confidence]}</strong></p>
      </div>
      {[{ label: labels.covered, topics: quality.covered_topics }, { label: labels.missing, topics: quality.missing_topics }, { label: labels.superficial, topics: quality.superficial_topics }].map(group => <div key={group.label}>
        <h3 className="font-medium break-words">{group.label}</h3>
        {group.topics.length ? <ul className="list-disc space-y-1 pl-6">{group.topics.map(topic => <li key={topic} className="break-words">{topic}</li>)}</ul> : <p className="text-sm text-muted-foreground">{labels.none}</p>}
      </div>)}
    </>}
    {quality && <p className="break-words">{labels.length}: {quality.word_count} · {quality.length_ok ? labels.met : labels.short}. <span className="text-muted-foreground">{labels.target}</span></p>}
    {Boolean(quality?.review_flags.length) && <div className="space-y-3">
      <h3 className="font-semibold break-words">{labels.flags}</h3>
      <ul className="space-y-3">{quality?.review_flags.map((flag, i) => <li key={i} className="space-y-2 border-l-2 border-border pl-3">
        <p className="break-words">{flag.message}</p>
        {!student && <div className="flex flex-wrap gap-2">
          {(flag.section_index !== undefined || flag.exercise_index !== undefined) && onEdit && <Button type="button" variant="outline" disabled={busy} onClick={() => onEdit(flag.section_index, flag.exercise_index)}><Pencil aria-hidden="true" />{labels.edit}</Button>}
          {flag.section_index !== undefined && onRegenerate && <Button type="button" variant="outline" disabled={busy} onClick={() => { if (flag.section_index !== undefined) onRegenerate(flag.section_index); }}><RefreshCw aria-hidden="true" />{labels.regenerate}</Button>}
        </div>}
      </li>)}</ul>
    </div>}
    {!student && onReview && <Button type="button" variant="outline" disabled={busy} onClick={onReview}>{busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}{labels.review}</Button>}
  </section>;
}
