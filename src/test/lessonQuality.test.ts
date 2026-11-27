import { describe, expect, it } from 'vitest';
import { replaceSection, unavailableQuality, validateReview, wordCount } from '../../supabase/functions/generate-course-content/quality';
import { translationSchema, validateTranslation } from '../../supabase/functions/generate-course-content/translation';

const topics = ['A', 'B', 'C', 'D'];
const lesson = { introduction: 'Introducción', sections: [{ title: 'A', content: 'Breve' }, { title: 'B', content: 'Contenido' }], exercises: [{ question: 'Pregunta', answer_keywords: '', solution: '' }] };
const review = { confidence: 'medium', covered_topics: ['A', 'B'], missing_topics: ['C'], superficial_topics: ['D'], review_flags: [] };
describe('advisory lesson quality', () => {
  it('registra la cobertura de búsquedas sin imponer la extensión del capítulo docente', () => {
    const q = validateReview(review, topics, { introduction: 'Texto breve', sections: [{ title: 'Tema', content: 'Explicación breve' }] }, 'es', true);
    expect(q.coverage).toBe(50);
    expect(q.automatic).toBe(true);
    expect(q.review_flags.filter(f => f.kind === 'short_section')).toHaveLength(0);
    expect(q.word_count).toBe(5);
  });
  it('computes 0–100 coverage from fully covered control topics only', () => {
    expect(validateReview(review, topics, lesson, 'es').coverage).toBe(50);
  });
  it('requires every control topic to be classified exactly once', () => {
    expect(() => validateReview({ ...review, missing_topics: ['A'] }, topics, lesson, 'es')).toThrow();
    expect(() => validateReview({ ...review, superficial_topics: [] }, topics, lesson, 'es')).toThrow();
  });
  it('checks the 3000-word objective, excluding image prompts and prior quality', () => {
    const material = { introduction: Array(2999).fill('palabra').join(' ') };
    expect(validateReview(review, topics, material, 'es').length_ok).toBe(false);
    expect(validateReview(review, topics, { introduction: material.introduction + ' palabra' }, 'es').length_ok).toBe(true);
    expect(wordCount({ sections: [{ title: '', content: 'una', image_prompt: 'many image words' }] })).toBe(1);
  });
  it('flags short sections and exercises without short verifiable answers', () => {
    const q = validateReview(review, topics, lesson, 'en');
    expect(q.review_flags.filter(f => f.kind === 'short_section').map(f => f.section_index)).toEqual([0, 1]);
    expect(q.review_flags.find(f => f.kind === 'exercise')?.exercise_index).toBe(0);
  });
  it('rejects invalid section pointers instead of offering unrelated regeneration', () => {
    expect(() => validateReview({ ...review, review_flags: [{ kind: 'factual', message: 'Verify', section_index: 2 }] }, topics, lesson, 'es')).toThrow();
  });
  it('los avisos de ejercicios deben apuntar al ejercicio, no a una sección', () => {
    expect(() => validateReview({ ...review, review_flags: [{ kind: 'exercise', message: 'Revisar respuesta', section_index: 0 }] }, topics, lesson, 'es')).toThrow('Exercise flag needs a target');
    const q = validateReview({ ...review, review_flags: [{ kind: 'exercise', message: 'Revisar respuesta', exercise_index: 0 }] }, topics, lesson, 'es');
    expect(q.review_flags.find(f => f.kind === 'exercise')?.exercise_index).toBe(0);
  });
  it('replaces only the selected section, preserving exercises and other sections', () => {
    const section = { title: 'New', content: 'Revised' };
    const changed = replaceSection(lesson, 1, section);
    expect(changed.sections).toEqual([lesson.sections[0], section]);
    expect(changed.exercises).toBe(lesson.exercises);
    expect(lesson.sections[1].title).toBe('B');
    expect(() => replaceSection(lesson, 2, section)).toThrow();
  });
  it('keeps uncertain reviews explicitly unavailable, never high confidence', () => {
    const q = unavailableQuality(lesson, 'es', topics);
    expect(q.status).toBe('unavailable');
    expect(q.confidence).toBe('low');
    expect(q.covered_topics).toEqual([]);
  });
  it('uses a plain translation schema and restores machine quality values', () => {
    const original = { introduction: 'A', summary: 'B', quality: { confidence: 'medium', status: 'reviewed', coverage: 50, review_flags: [{ kind: 'factual', section_index: 1, message: 'Check' }] } };
    expect(JSON.stringify(translationSchema(original))).not.toMatch(/enum|anyOf/);
    const out = validateTranslation(original, { introduction: 'A2', summary: 'B2', quality: { confidence: 'high', status: 'x', coverage: 99, review_flags: [{ kind: 'y', section_index: 9, message: 'Revisar' }] } }) as { quality: { coverage: number; confidence: string; review_flags: { kind: string; section_index: number; message: string }[] } };
    expect(out.quality.coverage).toBe(50);
    expect(out.quality.confidence).toBe('medium');
    expect(out.quality.review_flags[0]).toEqual({ kind: 'factual', section_index: 1, message: 'Revisar' });
  });
  it('accepts topic indices and accent/case variants instead of failing the review', () => {
    const topics = ['Aerodinámica', 'Motores', 'Frenos', 'Neumáticos'];
    const lesson = { introduction: 'x', sections: [] };
    const q = validateReview({ confidence: 'medium', covered_topics: [0, 'MOTORES'], missing_topics: ['aerodinamica'].slice(1).concat(['Frenos']), superficial_topics: [3], review_flags: [] }, topics, lesson, 'es', true);
    expect(q.covered_topics).toEqual(['Aerodinámica', 'Motores']);
    expect(q.coverage).toBe(50);
  });
});
