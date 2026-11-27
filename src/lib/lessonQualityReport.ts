import type { LessonContent } from '@/lib/courses';
import type { LessonQuality } from '../../supabase/functions/generate-course-content/quality';

export const QUALITY_COVERAGE_TARGET = 90;
export const MAX_QUALITY_HISTORY = 6;

export type QualityVerdictKind = 'unavailable' | 'stale' | 'below' | 'pending' | 'ready' | 'informational';
export interface QualityVerdict { kind: QualityVerdictKind; title: string; description: string }

/** The 90% mark is an advisory gate, never a factual certification. */
export function qualityVerdict(quality: LessonQuality | undefined, language: string, audience: 'teacher' | 'student' = 'teacher'): QualityVerdict {
  const es = language === 'es';
  const teacher = audience === 'teacher';
  if (!quality || quality.status === 'unavailable') return {
    kind: 'unavailable',
    title: es ? 'Sin evaluación disponible' : 'No assessment available',
    description: es ? 'Todavía no hay una cobertura evaluada para esta versión.' : 'This version does not have an assessed coverage yet.',
  };
  if (quality.status === 'stale') return {
    kind: 'stale',
    title: es ? 'Revisión desactualizada' : 'Review is out of date',
    description: es ? 'El contenido cambió después de la última evaluación. Vuelve a evaluar antes de usar este resultado.' : 'The content changed after the last assessment. Assess it again before using this result.',
  };
  if (quality.automatic) return {
    kind: 'informational',
    title: es ? 'Reporte automático de la lección' : 'Automatic lesson report',
    description: es ? 'La cobertura se registra como información, sin exigir un porcentaje mínimo. Esta lección no tiene revisión docente y las señales automáticas no garantizan ausencia de errores.' : 'Coverage is recorded for information, without a minimum percentage requirement. This lesson has no teacher review and automatic signals do not guarantee correctness.',
  };
  if (quality.coverage < QUALITY_COVERAGE_TARGET) return {
    kind: 'below',
    title: es ? `Cobertura por debajo del ${QUALITY_COVERAGE_TARGET}%` : `Coverage below ${QUALITY_COVERAGE_TARGET}%`,
    description: es
      ? `Faltan ${QUALITY_COVERAGE_TARGET - quality.coverage} puntos porcentuales. Mejora los temas señalados y vuelve a evaluar.`
      : `${QUALITY_COVERAGE_TARGET - quality.coverage} percentage points are still needed. Improve the flagged topics and assess again.`,
  };
  const pending = quality.review_flags.length + (quality.length_ok ? 0 : 1);
  if (pending > 0) return {
    kind: 'pending',
    title: es ? `Cobertura suficiente con ${pending} pendiente${pending === 1 ? '' : 's'}` : `Sufficient coverage with ${pending} pending item${pending === 1 ? '' : 's'}`,
    description: es
      ? teacher ? 'Se alcanzó el 90%, pero debes resolver o validar las observaciones y la extensión antes de aprobarla.' : 'Se alcanzó el 90%, pero aún hay observaciones o extensión pendientes de revisión docente.'
      : teacher ? 'The 90% mark was reached, but you must resolve or validate the observations and length before approval.' : 'The 90% mark was reached, but observations or length still need teacher review.',
  };
  return {
    kind: 'ready',
    title: es ? teacher ? 'Lista para revisión docente final' : 'Cobertura de referencia alcanzada' : teacher ? 'Ready for final teacher review' : 'Coverage reference reached',
    description: es
      ? teacher ? 'Cumple el mínimo de 90%, la extensión objetivo y no tiene observaciones automáticas pendientes. La aprobación final es docente; esto no garantiza ausencia de errores.' : 'Cumple la referencia de 90% y no tiene observaciones automáticas pendientes. Las señales de IA no sustituyen las fuentes ni la revisión docente.'
      : teacher ? 'It meets the 90% minimum and length target, with no pending automatic observations. Final approval belongs to the teacher; this does not guarantee there are no errors.' : 'It meets the 90% reference and has no pending automatic observations. AI signals do not replace sources or teacher review.',
  };
}

export function compareQuality(before: LessonQuality, after: LessonQuality) {
  return {
    coverageDelta: after.coverage - before.coverage,
    flagsDelta: after.review_flags.length - before.review_flags.length,
    missingDelta: after.missing_topics.length - before.missing_topics.length,
    superficialDelta: after.superficial_topics.length - before.superficial_topics.length,
    wordsDelta: after.word_count - before.word_count,
  };
}

/** Archive the prior assessment only after a replacement review succeeds. */
export function recordQualityReview(previous: LessonContent, reviewed: LessonContent, reviewedAt = new Date().toISOString()): LessonContent {
  const history = [...(previous.quality_history || []), ...(previous.quality ? [previous.quality] : [])].slice(-MAX_QUALITY_HISTORY);
  return {
    ...reviewed,
    ...(reviewed.quality ? { quality: { ...reviewed.quality, reviewed_at: reviewed.quality.reviewed_at || reviewedAt } } : {}),
    quality_history: history,
  };
}

export interface QualityReportInput {
  title: string;
  quality?: LessonQuality;
  history?: LessonQuality[];
  language: string;
  audience: 'teacher' | 'student';
  generatedAt?: Date;
}

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char);
const listHtml = (items: string[], empty: string) => items.length ? `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : `<p>${escapeHtml(empty)}</p>`;
const signed = (value: number) => `${value > 0 ? '+' : ''}${value}`;

/** Standalone, printable report. All AI-authored strings are escaped before insertion. */
export function buildQualityReportHtml(input: QualityReportInput): string {
  const es = input.language === 'es';
  const teacher = input.audience === 'teacher';
  const quality = input.quality;
  const before = teacher ? input.history?.at(-1) : undefined;
  const verdict = qualityVerdict(quality, es ? 'es' : 'en', input.audience);
  const comparison = before && quality ? compareQuality(before, quality) : null;
  const labels = es ? {
    report: 'Reporte de cobertura y revisión', generated: 'Reporte generado', reviewed: 'Última evaluación', noDate: 'Fecha no registrada',
    coverage: 'Cobertura', confidence: 'Confianza estimada', length: 'Extensión', words: 'palabras', target: 'Objetivo: 3000 palabras', met: 'Objetivo alcanzado', short: 'Por debajo del objetivo',
    beforeAfter: 'Antes y después', before: 'Antes', after: 'Después', change: 'Cambio', observations: 'Observaciones', missing: 'Posibles faltantes', superficial: 'Temas superficiales', covered: 'Temas cubiertos', none: 'Ninguno señalado', flags: 'Observaciones detalladas', noFlags: 'Sin observaciones automáticas pendientes.',
    caution: teacher ? 'Señales orientativas de IA, no verificación factual. El 90% es el mínimo de cobertura; la aprobación final corresponde al docente y no garantiza ausencia de errores.' : 'Señales orientativas de IA, no verificación factual. Revisa las fuentes y consulta a tu docente si tienes dudas.',
    unavailable: 'Sin evaluación de cobertura', stale: 'El contenido cambió después de esta evaluación.', status: 'Estado',
  } : {
    report: 'Coverage and review report', generated: 'Report generated', reviewed: 'Latest assessment', noDate: 'Date not recorded',
    coverage: 'Coverage', confidence: 'Estimated confidence', length: 'Length', words: 'words', target: 'Target: 3000 words', met: 'Target reached', short: 'Below target',
    beforeAfter: 'Before and after', before: 'Before', after: 'After', change: 'Change', observations: 'Observations', missing: 'Possible gaps', superficial: 'Superficial topics', covered: 'Covered topics', none: 'None flagged', flags: 'Detailed observations', noFlags: 'No pending automatic observations.',
    caution: teacher ? 'Advisory AI signals, not factual verification. 90% is the coverage minimum; final approval belongs to the teacher and this does not guarantee there are no errors.' : 'Advisory AI signals, not factual verification. Check the sources and ask your teacher if you have questions.',
    unavailable: 'Coverage not assessed', stale: 'The content changed after this assessment.', status: 'Status',
  };
  const confidence = quality ? ({ low: es ? 'Baja' : 'Low', medium: es ? 'Media' : 'Medium', high: es ? 'Alta' : 'High' })[quality.confidence] : '—';
  const formatDate = (value?: string) => {
    if (!value) return labels.noDate;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? labels.noDate : date.toLocaleString(es ? 'es' : 'en');
  };
  if (quality?.automatic) labels.target = es ? 'Extensión según el nivel y el formato; sin mínimo de cobertura.' : 'Length follows level and format; no minimum coverage.';
  const status = !quality ? labels.unavailable : quality.status === 'stale' ? labels.stale : verdict.title;
  const rows = comparison && before && quality ? [
    [labels.coverage, `${before.coverage}%`, `${quality.coverage}%`, `${signed(comparison.coverageDelta)} ${es ? 'puntos' : 'points'}`],
    [labels.observations, String(before.review_flags.length), String(quality.review_flags.length), signed(comparison.flagsDelta)],
    [labels.missing, String(before.missing_topics.length), String(quality.missing_topics.length), signed(comparison.missingDelta)],
    [labels.superficial, String(before.superficial_topics.length), String(quality.superficial_topics.length), signed(comparison.superficialDelta)],
    [labels.length, `${before.word_count} ${labels.words}`, `${quality.word_count} ${labels.words}`, signed(comparison.wordsDelta)],
  ] : [];
  return `<!doctype html>
<html lang="${es ? 'es' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(labels.report)} — ${escapeHtml(input.title)}</title>
<style>body{font-family:Arial,sans-serif;line-height:1.55;max-width:960px;margin:0 auto;padding:24px;color:#172033;background:#fff}h1,h2{line-height:1.25;overflow-wrap:anywhere}h1{font-size:1.8rem}h2{font-size:1.2rem;margin-top:28px;border-bottom:2px solid #d7deea;padding-bottom:8px}.summary{border:2px solid #52657f;border-radius:10px;padding:16px;margin:20px 0}.caution{border-left:4px solid #52657f;padding:12px 16px;background:#f3f6fa}table{width:100%;border-collapse:collapse}th,td{border:1px solid #aebbd0;padding:10px;text-align:left;vertical-align:top}li{margin:7px 0}.flag{border-left:3px solid #aebbd0;padding-left:14px}@media(max-width:600px){body{padding:16px}table,thead,tbody,tr,th,td{display:block}thead{position:absolute;left:-9999px}td:before{font-weight:bold;display:block}td:nth-child(1):before{content:'${labels.status}'}td:nth-child(2):before{content:'${labels.before}'}td:nth-child(3):before{content:'${labels.after}'}td:nth-child(4):before{content:'${labels.change}'}}@media print{body{padding:0}.summary{break-inside:avoid}}</style></head>
<body><main><h1>${escapeHtml(labels.report)}</h1><p><strong>${escapeHtml(input.title)}</strong></p><p>${escapeHtml(labels.generated)}: ${escapeHtml((input.generatedAt || new Date()).toLocaleString(es ? 'es' : 'en'))}</p>
<p class="caution">${escapeHtml(labels.caution)}</p><section class="summary"><h2>${escapeHtml(labels.status)}</h2><p><strong>${escapeHtml(verdict.title)}</strong></p><p>${escapeHtml(verdict.description)}</p><p>${escapeHtml(labels.reviewed)}: ${escapeHtml(formatDate(quality?.reviewed_at))}</p><p>${escapeHtml(status)}</p></section>
${quality ? `<h2>${escapeHtml(labels.after)}</h2><p><strong>${escapeHtml(labels.coverage)}: ${quality.coverage}%</strong></p><p>${escapeHtml(labels.confidence)}: ${escapeHtml(confidence)}</p><p>${escapeHtml(labels.length)}: ${quality.word_count} ${escapeHtml(labels.words)} · ${escapeHtml(quality.length_ok ? labels.met : labels.short)}. ${escapeHtml(labels.target)}</p>` : `<p>${escapeHtml(labels.unavailable)}</p>`}
${rows.length ? `<h2>${escapeHtml(labels.beforeAfter)}</h2><table><thead><tr><th>${escapeHtml(labels.status)}</th><th>${escapeHtml(labels.before)}</th><th>${escapeHtml(labels.after)}</th><th>${escapeHtml(labels.change)}</th></tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''}
${quality ? `<h2>${escapeHtml(labels.covered)}</h2>${listHtml(quality.covered_topics, labels.none)}<h2>${escapeHtml(labels.missing)}</h2>${listHtml(quality.missing_topics, labels.none)}<h2>${escapeHtml(labels.superficial)}</h2>${listHtml(quality.superficial_topics, labels.none)}<h2>${escapeHtml(labels.flags)}</h2>${quality.review_flags.length ? `<ul>${quality.review_flags.map(flag => `<li class="flag">${escapeHtml(flag.message)}</li>`).join('')}</ul>` : `<p>${escapeHtml(labels.noFlags)}</p>`}` : ''}
</main></body></html>`;
}

type PdfBlock = { kind: 'h1' | 'h2' | 'p' | 'b' | 'li'; text: string };

/** Structured, plain-text report blocks shared by the PDF export. */
export function buildQualityReportBlocks(input: QualityReportInput): PdfBlock[] {
  const es = input.language === 'es';
  const teacher = input.audience === 'teacher';
  const q = input.quality;
  const before = teacher ? input.history?.at(-1) : undefined;
  const verdict = qualityVerdict(q, es ? 'es' : 'en', input.audience);
  const L = (a: string, b: string) => (es ? a : b);
  const blocks: PdfBlock[] = [
    { kind: 'h1', text: L('Reporte de cobertura y revisión', 'Coverage and review report') },
    { kind: 'b', text: input.title },
    { kind: 'p', text: `${L('Reporte generado', 'Report generated')}: ${(input.generatedAt || new Date()).toLocaleString(es ? 'es' : 'en')}` },
    { kind: 'p', text: teacher ? L('Señales orientativas de IA, no verificación factual. El 90% es el mínimo de cobertura; la aprobación final corresponde al docente.', 'Advisory AI signals, not factual verification. 90% is the coverage minimum; final approval belongs to the teacher.') : L('Señales orientativas de IA, no verificación factual. Revisa las fuentes y consulta a tu docente si tienes dudas.', 'Advisory AI signals, not factual verification. Check the sources and ask your teacher if you have questions.') },
    { kind: 'h2', text: L('Estado', 'Status') },
    { kind: 'b', text: verdict.title },
    { kind: 'p', text: verdict.description },
  ];
  if (!q) return blocks;
  const conf = ({ low: L('Baja', 'Low'), medium: L('Media', 'Medium'), high: L('Alta', 'High') })[q.confidence];
  blocks.push(
    { kind: 'b', text: `${L('Cobertura', 'Coverage')}: ${q.status === 'unavailable' ? L('No evaluada', 'Not assessed') : `${q.coverage}%`}` },
    { kind: 'p', text: `${L('Confianza estimada', 'Estimated confidence')}: ${conf}` },
    { kind: 'p', text: `${L('Extensión', 'Length')}: ${q.word_count} ${L('palabras', 'words')}` },
  );
  if (q.reviewed_at) blocks.push({ kind: 'p', text: `${L('Última evaluación', 'Latest assessment')}: ${new Date(q.reviewed_at).toLocaleString(es ? 'es' : 'en')}` });
  if (before) {
    const d = compareQuality(before, q);
    blocks.push({ kind: 'h2', text: L('Antes y después', 'Before and after') },
      { kind: 'li', text: `${L('Cobertura', 'Coverage')}: ${L('Antes', 'Before')}: ${before.coverage}%; ${L('Después', 'After')}: ${q.coverage}% (${signed(d.coverageDelta)})` },
      { kind: 'li', text: `${L('Observaciones', 'Observations')}: ${before.review_flags.length} -> ${q.review_flags.length} (${signed(d.flagsDelta)})` },
      { kind: 'li', text: `${L('Posibles faltantes', 'Possible gaps')}: ${before.missing_topics.length} -> ${q.missing_topics.length} (${signed(d.missingDelta)})` },
      { kind: 'li', text: `${L('Temas superficiales', 'Superficial topics')}: ${before.superficial_topics.length} -> ${q.superficial_topics.length} (${signed(d.superficialDelta)})` },
      { kind: 'li', text: `${L('Extensión', 'Length')}: ${before.word_count} -> ${q.word_count} (${signed(d.wordsDelta)})` });
  }
  const list = (title: string, items: string[]) => { blocks.push({ kind: 'h2', text: title }); (items.length ? items : [L('Ninguno señalado', 'None flagged')]).forEach(t => blocks.push({ kind: 'li', text: t })); };
  list(L('Temas cubiertos', 'Covered topics'), q.covered_topics);
  list(L('Posibles faltantes', 'Possible gaps'), q.missing_topics);
  list(L('Temas superficiales', 'Superficial topics'), q.superficial_topics);
  list(L('Observaciones detalladas', 'Detailed observations'), q.review_flags.map(f => f.message));
  return blocks;
}

export async function downloadQualityReport(input: QualityReportInput) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48, width = doc.internal.pageSize.getWidth() - margin * 2, bottom = doc.internal.pageSize.getHeight() - margin;
  let y = margin;
  const sizes = { h1: 20, h2: 15, b: 12, p: 12, li: 12 } as const;
  for (const block of buildQualityReportBlocks(input)) {
    const size = sizes[block.kind];
    doc.setFont('helvetica', block.kind === 'p' || block.kind === 'li' ? 'normal' : 'bold');
    doc.setFontSize(size);
    if (block.kind === 'h2') y += 10;
    const lines = doc.splitTextToSize(block.kind === 'li' ? `• ${block.text}` : block.text, width) as string[];
    for (const line of lines) {
      if (y + size > bottom) { doc.addPage(); y = margin; }
      doc.text(line, margin, y + size);
      y += size * 1.45;
    }
    y += 4;
  }
  const safeTitle = input.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'leccion';
  doc.save(`reporte-cobertura-${safeTitle}.pdf`);
}
