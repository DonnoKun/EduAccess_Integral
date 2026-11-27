import { describe, it, expect } from 'vitest';
import { validateTranslation, translationSchema } from '../../supabase/functions/generate-course-content/translation';

describe('faithful lesson translation', () => {
  it('admite historiales con distintos porcentajes y cantidades de puntos clave con un esquema simple', () => {
    const schema = translationSchema({ quality_history: [{ coverage: 50 }, { coverage: 90 }], sections: [{ keyPoints: ['A'] }, { keyPoints: ['B', 'C'] }] });
    expect(JSON.stringify(schema)).not.toMatch(/anyOf|enum|minItems/);
  });
  it('traduce las observaciones y conserva la medición y la fecha de cada revisión', () => {
    const before = { introduction: 'Intro', summary: 'Summary', quality: { coverage: 50, reviewed_at: '2026-11-27T01:00:00Z', review_flags: [{ kind: 'exercise', exercise_index: 0, message: 'Check expected answer' }] }, quality_history: [{ coverage: 25 }, { coverage: 40 }] };
    const result = validateTranslation(before, { ...before, quality: { coverage: 99, reviewed_at: 'wrong', review_flags: [{ kind: 'factual', exercise_index: 3, message: 'Revisar respuesta esperada' }] }, quality_history: [{ coverage: 99 }, { coverage: 99 }] });
    expect(result.quality).toEqual({ ...before.quality, review_flags: [{ ...before.quality.review_flags[0], message: 'Revisar respuesta esperada' }] });
    expect(result.quality_history).toEqual(before.quality_history);
  });
  it('rejects translations that add examples', () => {
    expect(() => validateTranslation({ introduction: 'I', summary: 'S', examples: [{ title: 'One' }] }, { introduction: 'I', summary: 'S', examples: [{ title: 'Uno' }, { title: 'Dos' }] })).toThrow('Translation changed examples');
  });
  const original = { introduction: 'Intro', summary: 'Summary', sections: [{ title: 'Role', content: 'Text', image_prompt: 'A diagram', keyPoints: ['one'] }], exercises: [{ question: '2/3 + 1/5?', answer_keywords: '13/15', solution: '13/15' }], sources: [{ name: 'Source', url: 'https://example.org/article' }] };
  it('preserves illustration prompts and source URLs without regenerating material', () => {
    const result = validateTranslation(original, { introduction: 'Desempeña una función.', summary: 'Resumen', sections: [{ title: 'Función', content: 'Texto', image_prompt: 'Changed', keyPoints: ['uno'] }], exercises: original.exercises, sources: [{ name: 'Fuente', url: 'https://wrong.org' }] });
    expect((result.sections as typeof original.sections)[0].image_prompt).toBe('A diagram');
    expect((result.sources as typeof original.sources)[0].url).toBe('https://example.org/article');
  });
  it('rejects translations which lose exercises', () => {
    expect(() => validateTranslation(original, { ...original, exercises: [] })).toThrow('Translation changed exercises');
  });
  it('rejects expansions of a single-paragraph introduction', () => {
    expect(() => validateTranslation(original, { ...original, introduction: 'First.\n\nAdded paragraph.' })).toThrow('Translation changed paragraph structure');
  });
  it('keeps a translation whose section returns a different number of key points', () => {
    const src = { introduction: 'I', summary: 'S', sections: [{ title: 'T', content: 'C', keyPoints: ['a', 'b', 'c'] }] };
    const out = validateTranslation(src, { introduction: 'I', summary: 'S', sections: [{ title: 'Tt', content: 'Cc', keyPoints: ['x', 'y'] }] });
    expect((out.sections as { keyPoints: string[] }[])[0].keyPoints).toEqual(['x', 'y']);
  });
  it('keeps stored report values when the translated report list is reshaped', () => {
    const src = { introduction: 'I', summary: 'S', quality: { coverage: 50, missing_topics: ['a', 'b'] } };
    const out = validateTranslation(src, { introduction: 'I', summary: 'S', quality: { coverage: 50, missing_topics: ['x'] } });
    expect((out.quality as { missing_topics: string[] }).missing_topics).toEqual(['a', 'b']);
  });
});
