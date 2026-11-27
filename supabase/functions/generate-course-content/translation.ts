/** Schema mirrors the original tree, including paragraph and array lengths. */
export function translationSchema(value: unknown, key = ''): Record<string, unknown> {
  if (typeof value === 'string') {
    if (['image_prompt', 'url', 'language', 'confidence', 'status', 'kind', 'reviewed_at'].includes(key)) return { type: 'string', enum: [value] };
    return { type: 'string' };
  }
  if (Array.isArray(value)) {
    const variants = [...new Map(value.map(item => { const schema = translationSchema(item); return [JSON.stringify(schema), schema]; })).values()];
    return { type: 'array', minItems: value.length, maxItems: value.length, items: variants.length > 1 ? { anyOf: variants } : variants[0] || { type: 'string' } };
  }
  if (value && typeof value === 'object') {
    const fields = Object.entries(value);
    return { type: 'object', properties: Object.fromEntries(fields.map(([k, v]) => [k, translationSchema(v, k)])), required: fields.map(([k]) => k), additionalProperties: false };
  }
  return { type: typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'null', enum: [value] };
}

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
  // Translate report prose, not its measured values, timestamps or indexed targets.
  const preserveReview = (source: unknown, target: unknown, key = ''): unknown => {
    if (Array.isArray(source)) {
      if (!Array.isArray(target) || source.length !== target.length) throw new Error('Translation changed report structure');
      return source.map((value, i) => preserveReview(value, target[i]));
    }
    if (source && typeof source === 'object') {
      if (!target || typeof target !== 'object') throw new Error('Missing translated report');
      const result = target as Record<string, unknown>;
      return Object.fromEntries(Object.entries(source).map(([name, value]) => [name, preserveReview(value, result[name], name)]));
    }
    if (typeof source !== 'string' || ['confidence', 'status', 'kind', 'reviewed_at'].includes(key)) return source;
    if (typeof target !== 'string' || (source.trim() && !target.trim())) throw new Error('Incomplete report translation');
    return target;
  };
  for (const key of ['quality', 'quality_history']) {
    if (original[key] !== undefined) translated[key] = preserveReview(original[key], translated[key]);
  }
  return translated;
}