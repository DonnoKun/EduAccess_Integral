import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { buildQualityReportHtml, compareQuality, downloadQualityReport, qualityVerdict, QUALITY_COVERAGE_TARGET } from '@/lib/lessonQualityReport';
import type { LessonContent } from '@/lib/courses';

function Comparison({ before, after, es }: { before: NonNullable<LessonContent['quality']>; after: NonNullable<LessonContent['quality']>; es: boolean }) {
  const delta = compareQuality(before, after);
  const signed = (value: number) => `${value > 0 ? '+' : ''}${value}`;
  const rows = [
    { label: es ? 'Cobertura' : 'Coverage', before: `${before.coverage}%`, after: `${after.coverage}%`, delta: `${signed(delta.coverageDelta)} ${es ? 'puntos' : 'points'}` },
    { label: es ? 'Observaciones' : 'Observations', before: before.review_flags.length, after: after.review_flags.length, delta: signed(delta.flagsDelta) },
    { label: es ? 'Posibles faltantes' : 'Possible gaps', before: before.missing_topics.length, after: after.missing_topics.length, delta: signed(delta.missingDelta) },
    { label: es ? 'Temas superficiales' : 'Superficial topics', before: before.superficial_topics.length, after: after.superficial_topics.length, delta: signed(delta.superficialDelta) },
    { label: es ? 'Extensión' : 'Length', before: before.word_count, after: after.word_count, delta: signed(delta.wordsDelta) },
  ];
  return <div className="space-y-3">
    <h3 className="font-semibold">{es ? 'Inicio y resultado final' : 'Start and final result'}</h3>
    <p className="text-sm text-muted-foreground break-words">{es ? `Primera evaluación${before.reviewed_at ? ` (${new Date(before.reviewed_at).toLocaleString('es')})` : ''} comparada con la actual.` : `First assessment${before.reviewed_at ? ` (${new Date(before.reviewed_at).toLocaleString('en')})` : ''} compared with the current one.`}</p>
    <dl className="grid gap-3 sm:grid-cols-2">
      {rows.map(row => <div key={row.label} className="min-w-0 rounded-md border p-3">
        <dt className="font-medium break-words">{row.label}</dt>
        <dd className="flex flex-wrap items-center gap-2 break-words"><span>{row.before}</span><ArrowRight aria-hidden="true" /><strong>{row.after}</strong><span className="text-muted-foreground">({row.delta})</span></dd>
      </div>)}
    </dl>
  </div>;
}

export default function LessonQualityReport({ title, quality, history = [], audience }: {
  title?: string;
  quality: LessonContent['quality'];
  history?: LessonContent['quality_history'];
  audience: 'teacher' | 'student';
}) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const es = i18n.language.startsWith('es');
  const language = es ? 'es' : 'en';
  const teacher = audience === 'teacher';
  const lessonTitle = title || (es ? 'Lección' : 'Lesson');
  const verdict = qualityVerdict(quality, language, audience);
  const before = teacher ? history[0] : undefined;
  const confidence = quality ? ({ low: es ? 'Baja' : 'Low', medium: es ? 'Media' : 'Medium', high: es ? 'Alta' : 'High' })[quality.confidence] : null;
  const reportInput = { title: lessonTitle, quality, history, language, audience } as const;
  const download = () => { void downloadQualityReport(reportInput); };

  return <div className="space-y-3 rounded-md border p-3">
    <div role="status" className="space-y-1">
      <p className="font-semibold break-words">{verdict.title}</p>
      <p className="text-sm text-muted-foreground break-words">{verdict.description}</p>
    </div>
    {before && quality && <Comparison before={before} after={quality} es={es} />}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button type="button" variant="outline" className="h-auto whitespace-normal"><FileText aria-hidden="true" />{es ? 'Ver / descargar reporte' : 'View / download report'}</Button></DialogTrigger>
      <DialogContent className="max-h-[85dvh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>{es ? 'Reporte de cobertura y revisión' : 'Coverage and review report'}</DialogTitle><DialogDescription className="break-words">{lessonTitle}</DialogDescription></DialogHeader>
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground break-words">{quality?.automatic ? (es ? 'Reporte informativo de generación automática, sin mínimo de cobertura.' : 'Informational automatic-generation report, without a coverage minimum.') : (es ? `Referencia mínima docente: ${QUALITY_COVERAGE_TARGET}%.` : `Teacher minimum reference: ${QUALITY_COVERAGE_TARGET}%.`)}</p>
          <section className="space-y-2 rounded-md border p-3" aria-label={es ? 'Resultado actual' : 'Current result'}>
            <h3 className="font-semibold break-words">{verdict.title}</h3><p className="break-words">{verdict.description}</p>
            {quality && <><p><strong>{es ? 'Cobertura' : 'Coverage'}: {quality.status === 'unavailable' ? (es ? 'No evaluada' : 'Not assessed') : `${quality.coverage}%`}</strong></p><p>{es ? 'Confianza estimada' : 'Estimated confidence'}: {confidence}</p><p>{es ? 'Extensión' : 'Length'}: {quality.word_count} {es ? 'palabras' : 'words'}{!quality.automatic && <> · {quality.length_ok ? (es ? 'objetivo alcanzado' : 'target reached') : (es ? 'por debajo del objetivo' : 'below target')}</>}</p>{quality.reviewed_at && <p>{es ? 'Última evaluación' : 'Latest assessment'}: <time dateTime={quality.reviewed_at}>{new Date(quality.reviewed_at).toLocaleString(language)}</time></p>}</>}
          </section>
          {before && quality && <Comparison before={before} after={quality} es={es} />}
          {quality && <section className="space-y-3"><h3 className="font-semibold">{es ? 'Observaciones detalladas' : 'Detailed observations'}</h3>{quality.review_flags.length ? <ul className="space-y-2">{quality.review_flags.map((flag, index) => <li key={index} className="border-l-2 border-border pl-3 break-words">{flag.message}</li>)}</ul> : <p>{es ? 'Sin observaciones automáticas pendientes.' : 'No pending automatic observations.'}</p>}</section>}
          <Button type="button" onClick={download} className="h-auto whitespace-normal"><Download aria-hidden="true" />{es ? 'Descargar reporte PDF' : 'Download PDF report'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}

// Kept exported for lightweight consumer checks without creating a download.
export { buildQualityReportHtml };
