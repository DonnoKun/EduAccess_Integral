export function validateTranslation(original: Record<string, unknown>, translated: Record<string, unknown>) {
  const paragraphs = (text: string) => text.trim().split(/\n\s*\n/).length;
  for (const key of ['introduction', 'summary']) {
    if (typeof translated[key] !== 'string' || !(translated[key] as string).trim()) throw new Error('Incomplete translation');
    if (typeof original[key] === 'string' && paragraphs(original[key] as string) !== paragraphs(translated[key] as string)) throw new Error('Translation changed paragraph structure');
  }
  for (const key of ['sections', 'examples', 'exercises', 'sources']) {
    const before = original[key];
    const after = translated[key];
    if (!Array.isArray(before)) continue;
    if (!Array.isArray(after) || before.length !== after.length) throw new Error(`Translation changed ${key}`);
    after.forEach((item, index) => {
      const source = before[index];
      if (key === 'sections') {
        if (!item.title || !item.content || (source.keyPoints || []).length !== (item.keyPoints || []).length) throw new Error('Translation changed section structure');
        item.image_prompt = source.image_prompt;
      }
      if (key === 'exercises' && (!item.question || !item.answer_keywords || !item.solution)) throw new Error('Incomplete exercise translation');
      if (key === 'sources') item.url = source.url;
    });
  }
  return translated;
}