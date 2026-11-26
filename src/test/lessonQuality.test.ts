import { describe, expect, it } from 'vitest';
import { replaceSection, unavailableQuality, validateReview, wordCount } from '../../supabase/functions/generate-course-content/quality';
import { translationSchema } from '../../supabase/functions/generate-course-content/translation';

const topics = ['A', 'B', 'C', 'D'];
const lesson = { introduction: 'Introducción', sections: [{ title: 'A', content: 'Breve' }, { title: 'B', content: 'Contenido' }], exercises: [{ question: 'Pregunta', answer_keywords: '', solution: '' }] };
const review = { confidence: 'medium', covered_topics: ['A', 'B'], missing_topics: ['C'], superficial_topics: ['D'], review_flags: [] };
describe('advisory lesson quality', () => {
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
  it('preserves machine quality values and indices during translation', () => {
    const schema = translationSchema({ quality: { confidence: 'medium', status: 'reviewed', coverage: 50, length_ok: false, review_flags: [{ kind: 'factual', section_index: 1, message: 'Revisar' }] } });
    const fields = (schema.properties as Record<string, { properties: Record<string, unknown> }>).quality.properties;
    expect(fields.confidence).toEqual({ type: 'string', enum: ['medium'] });
    expect(fields.coverage).toEqual({ type: 'number', enum: [50] });
    expect(fields.length_ok).toEqual({ type: 'boolean', enum: [false] });
  });
});