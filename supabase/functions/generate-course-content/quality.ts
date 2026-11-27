/** Advisory signals, never a factual certification. Stored inside lesson JSON. */
export interface ReviewFlag {
  kind: 'factual' | 'short_section' | 'exercise' | 'review_unavailable';
  message: string;
  section_index?: number;
  exercise_index?: number;
}
export interface LessonQuality {
  coverage: number;
  confidence: 'low' | 'medium' | 'high';
  missing_topics: string[];
  covered_topics: string[];
  superficial_topics: string[];
  control_topics: string[];
  review_flags: ReviewFlag[];
  length_ok: boolean;
  word_count: number;
  status: 'reviewed' | 'unavailable' | 'stale';
  reviewed_at?: string;
}
export interface ReviewLesson {
  introduction?: string; summary?: string;
  sections?: { title: string; content: string; keyPoints?: string[]; image_prompt?: string; image_alt?: string }[];
  examples?: { title: string; description: string }[];
  exercises?: { question: string; answer_keywords?: string; solution?: string }[];
  quality?: LessonQuality;
  quality_history?: LessonQuality[];
}
const strings = (v: unknown): string[] => {
  if (!Array.isArray(v) || v.length > 30 || v.some(x => typeof x !== 'string' || !x.trim() || x.length > 600)) throw new Error('Invalid topic list');
  return v;
};
export const words = (text = '') => text.trim().split(/\s+/u).filter(Boolean).length;
export function wordCount(lesson: ReviewLesson): number {
  return words([lesson.introduction, lesson.summary,
    ...(lesson.sections || []).flatMap(s => [s.title, s.content, ...(s.keyPoints || [])]),
    ...(lesson.examples || []).flatMap(e => [e.title, e.description]),
    ...(lesson.exercises || []).flatMap(e => [e.question, e.solution]),
  ].filter(Boolean).join(' '));
}
export function validateReview(value: unknown, topics: string[], lesson: ReviewLesson, language: string): LessonQuality {
  if (!value || typeof value !== 'object') throw new Error('Invalid review');
  const r = value as Record<string, unknown>;
  if (!['low', 'medium', 'high'].includes(String(r.confidence))) throw new Error('Invalid confidence');
  const covered = strings(r.covered_topics), missing = strings(r.missing_topics), superficial = strings(r.superficial_topics);
  const assigned = [...covered, ...missing, ...superficial];
  if (assigned.length !== topics.length || new Set(assigned).size !== topics.length || assigned.some(t => !topics.includes(t))) throw new Error('Review must classify each control topic exactly once');
  if (!Array.isArray(r.review_flags) || r.review_flags.length > 60) throw new Error('Invalid flags');
  const flags: ReviewFlag[] = r.review_flags.map((f: Record<string, unknown>) => {
    if (!f || !['factual', 'short_section', 'exercise'].includes(String(f.kind)) || typeof f.message !== 'string' || !f.message.trim() || f.message.length > 1200) throw new Error('Invalid flag');
    for (const [key, count] of [['section_index', lesson.sections?.length || 0], ['exercise_index', lesson.exercises?.length || 0]] as const) {
      if (f[key] !== undefined && (!Number.isInteger(f[key]) || Number(f[key]) < 0 || Number(f[key]) >= count)) throw new Error('Invalid flag target');
    }
    if (f.kind === 'short_section' && f.section_index === undefined) throw new Error('Section flag needs a target');
    if (f.kind === 'exercise' && f.exercise_index === undefined) throw new Error('Exercise flag needs a target');
    return f as unknown as ReviewFlag;
  });
  const es = language === 'es';
  (lesson.sections || []).forEach((s, i) => {
    if (words(s.content) < 250 && !flags.some(f => f.kind === 'short_section' && f.section_index === i)) flags.push({ kind: 'short_section', section_index: i, message: es ? 'Sección breve: revisar profundidad (objetivo: 250 palabras como mínimo).' : 'Short section: review depth (target: at least 250 words).' });
  });
  (lesson.exercises || []).forEach((e, i) => {
    if ((!e.solution?.trim() || !e.answer_keywords?.trim() || words(e.answer_keywords) > 15) && !flags.some(f => f.kind === 'exercise' && f.exercise_index === i)) flags.push({ kind: 'exercise', exercise_index: i, message: es ? 'Revisar respuesta corta y solución verificable del ejercicio.' : 'Review the exercise’s short answer and verifiable solution.' });
  });
  const count = wordCount(lesson);
  return { coverage: topics.length ? Math.round(100 * covered.length / topics.length) : 0, confidence: r.confidence as LessonQuality['confidence'], covered_topics: covered, missing_topics: missing, superficial_topics: superficial, control_topics: topics, review_flags: flags, length_ok: count >= 3000, word_count: count, status: 'reviewed', reviewed_at: new Date().toISOString() };
}
export function unavailableQuality(lesson: ReviewLesson, language: string, topics: string[] = []): LessonQuality {
  return { coverage: 0, confidence: 'low', covered_topics: [], missing_topics: [], superficial_topics: [], control_topics: topics, review_flags: [{ kind: 'review_unavailable', message: language === 'es' ? 'Revisión automática no disponible. La cobertura no se ha evaluado; revisar manualmente antes de publicar.' : 'Automatic review unavailable. Coverage has not been assessed; review manually before publishing.' }], length_ok: wordCount(lesson) >= 3000, word_count: wordCount(lesson), status: 'unavailable', reviewed_at: new Date().toISOString() };
}
export function replaceSection<T extends ReviewLesson>(lesson: T, index: number, section: NonNullable<ReviewLesson['sections']>[number]): T {
  if (!lesson.sections || !Number.isInteger(index) || index < 0 || index >= lesson.sections.length) throw new Error('Invalid section index');
  return { ...lesson, sections: lesson.sections.map((s, i) => i === index ? section : s) };
}