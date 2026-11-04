import { describe, it, expect } from 'vitest';
import { validateTranslation, translationSchema } from '../../supabase/functions/generate-course-content/translation';

describe('faithful lesson translation', () => {
  it('requires exactly the original number of examples rather than generating more', () => {
    const schema = translationSchema({ examples: [{ title: 'One', description: 'Text' }] });
    const properties = schema.properties as Record<string, Record<string, unknown>>;
    expect(properties.examples.minItems).toBe(1);
    expect(properties.examples.maxItems).toBe(1);
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
});