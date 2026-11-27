import { describe, expect, it } from 'vitest';
import { buildQualityReportHtml, compareQuality, qualityVerdict, recordQualityReview } from '@/lib/lessonQualityReport';
import type { LessonQuality } from '../../supabase/functions/generate-course-content/quality';
import type { LessonContent } from '@/lib/courses';

const quality = (coverage: number, flags = 0): LessonQuality => ({
  coverage,
  confidence: 'high',
  covered_topics: ['Fotosíntesis'],
  missing_topics: coverage < 90 ? ['Respiración celular'] : [],
  superficial_topics: [],
  control_topics: ['Fotosíntesis', 'Respiración celular'],
  review_flags: Array.from({ length: flags }, (_, index) => ({ kind: 'factual', message: `Observación ${index + 1}` })),
  length_ok: true,
  word_count: 3000,
  status: 'reviewed',
});

describe('reporte de cobertura', () => {
  it('conserva reportes de búsqueda de estudiante con cualquier porcentaje, sin imponer 90%', () => {
    for (const coverage of [0, 50, 89, 90, 100]) {
      const q = { ...quality(coverage, 1), automatic: true };
      expect(qualityVerdict(q, 'es', 'student').kind).toBe('informational');
      expect(qualityVerdict(q, 'en', 'student').kind).toBe('informational');
    }
  });
  it('usa 90% como mínimo y exige revisión docente aun sin observaciones', () => {
    expect(qualityVerdict(quality(89), 'es').kind).toBe('below');
    const verdict = qualityVerdict(quality(90), 'es');
    expect(verdict.kind).toBe('ready');
    expect(verdict.title).toBe('Lista para revisión docente final');
    expect(verdict.description).toContain('no garantiza ausencia de errores');
  });

  it('no marca como lista una lección con observaciones aunque alcance 90%', () => {
    expect(qualityVerdict(quality(95, 1), 'es').kind).toBe('pending');
    expect(qualityVerdict({ ...quality(95), length_ok: false }, 'es').kind).toBe('pending');
    expect(qualityVerdict({ ...quality(95), status: 'stale' }, 'es').kind).toBe('stale');
  });

  it('compara el antes y el después con cambios concretos', () => {
    const before = { ...quality(50, 3), word_count: 1200, length_ok: false };
    const after = quality(92);
    expect(compareQuality(before, after)).toEqual({ coverageDelta: 42, flagsDelta: -3, missingDelta: -1, superficialDelta: 0, wordsDelta: 1800 });
  });

  it('archiva la revisión anterior solo cuando llega una nueva y conserva el historial', () => {
    const before = { ...quality(50, 2), reviewed_at: '2026-11-26T10:00:00.000Z' };
    const previous: LessonContent = { introduction: 'Texto', quality: before };
    const result = recordQualityReview(previous, { introduction: 'Texto mejorado', quality: quality(90) }, '2026-11-27T01:00:00.000Z');
    expect(result.quality_history).toEqual([before]);
    expect(result.quality?.reviewed_at).toBe('2026-11-27T01:00:00.000Z');
    expect(previous.quality_history).toBeUndefined();
  });

  it('genera un HTML imprimible y escapa contenido de IA para evitar HTML inyectado', () => {
    const before = quality(50, 1);
    const after = quality(90);
    const html = buildQualityReportHtml({ title: '<script>alert(1)</script>', quality: after, history: [before], language: 'es', audience: 'teacher', generatedAt: new Date('2026-11-27T01:00:00Z') });
    expect(html).toContain('Antes y después');
    expect(html).toContain('+40 puntos');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('@media print');
  });

  it('el reporte de estudiante no incluye el historial docente', () => {
    const html = buildQualityReportHtml({ title: 'Fotosíntesis', quality: quality(90), history: [quality(50)], language: 'es', audience: 'student' });
    expect(html).not.toContain('Antes y después');
    expect(html).toContain('consulta a tu docente');
  });
});

describe('reporte PDF', () => {
  it('el PDF del estudiante no incluye el antes y después docente', async () => {
    const { buildQualityReportBlocks } = await import('@/lib/lessonQualityReport');
    const q = { coverage: 92, confidence: 'high', covered_topics: [], missing_topics: [], superficial_topics: [], control_topics: [], review_flags: [], length_ok: true, word_count: 3000, status: 'reviewed' } as never;
    const student = buildQualityReportBlocks({ title: 'X', quality: q, history: [q], language: 'es', audience: 'student' });
    const teacher = buildQualityReportBlocks({ title: 'X', quality: q, history: [q], language: 'es', audience: 'teacher' });
    expect(student.some(b => b.text === 'Antes y después')).toBe(false);
    expect(teacher.some(b => b.text === 'Antes y después')).toBe(true);
  });
});
