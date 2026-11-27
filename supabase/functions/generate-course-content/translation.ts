/** Plain schema mirroring the original tree. No enums/anyOf/length limits: providers reject
 * large constrained schemas (HTTP 400); validateTranslation restores fixed values and checks lengths. */
export function translationSchema(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') return { type: 'string' };
  if (Array.isArray(value)) {
    const merged = value.reduce<unknown>((acc, item) => mergeShape(acc, item), undefined);
    return { type: 'array', items: merged === undefined ? { type: 'string' } : translationSchema(merged) };
  }
  if (value && typeof value === 'object') {
    const fields = Object.entries(value);
    return { type: 'object', properties: Object.fromEntries(fields.map(([k, v]) => [k, translationSchema(v)])), required: fields.map(([k]) => k), additionalProperties: false };
  }
  return { type: typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string' };
}

function mergeShape(a: unknown, b: unknown): unknown {
  if (a === undefined) return b;
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const out: Record<string, unknown> = { ...(a as Record<string, unknown>) };
    for (const [k, v] of Object.entries(b)) out[k] = k in out ? mergeShape(out[k], v) : v;
    return out;
  }
  if (Array.isArray(a) && Array.isArray(b)) return [[...a, ...b].reduce<unknown>((acc, i) => mergeShape(acc, i), undefined)].filter(x => x !== undefined);
  return a;
}

export function validateTranslation(original: Record<string, unknown>, translated: Record<string, unknown>) {
  const paragraphs = (text: string) => text.trim().split(/\n\s*\n/).length;
  for (const key of ['introduction', 'summary']) {
    if (typeof translated[key] !== 'string' || !(translated[key] as string).trim()) throw new Error('Incomplete translation');
    // Models often merge or split paragraphs while translating; only reject a real expansion or loss of text.
    if (typeof original[key] === 'string' && paragraphs(original[key] as string) !== paragraphs(translated[key] as string)) {
      const ratio = (translated[key] as string).trim().length / Math.max(1, (original[key] as string).trim().length);
      if (ratio < 0.6 || ratio > 1.8) throw new Error('Translation changed paragraph structure');
    }
  }
  for (const key of ['sections', 'examples', 'exercises', 'sources']) {
    const before = original[key];
    const after = translated[key];
    if (!Array.isArray(before)) continue;
    if (!Array.isArray(after) || before.length !== after.length) throw new Error(`Translation changed ${key}`);
    after.forEach((item, index) => {
      const source = before[index];
      if (key === 'sections') {
        if (!item.title || !item.content) throw new Error('Translation changed section structure');
        // Key point counts may differ slightly; keep translated points, or the originals if none came back.
        const points = Array.isArray(item.keyPoints) ? item.keyPoints.filter((k: unknown) => typeof k === 'string' && k.trim()) : [];
        item.keyPoints = points.length ? points : (source.keyPoints || []);
        if (source.image_alt !== undefined && !item.image_alt) item.image_alt = source.image_alt;
        item.image_prompt = source.image_prompt;
      }
      if (key === 'exercises') {
        if (!item.question) throw new Error('Incomplete exercise translation');
        for (const f of ['answer_keywords', 'solution']) if (!item[f] && source[f]) item[f] = source[f];
      }
      if (key === 'sources') item.url = source.url;
    });
  }
  // Translate report prose, not its measured values, timestamps or indexed targets.
  const preserveReview = (source: unknown, target: unknown, key = ''): unknown => {
    if (Array.isArray(source)) {
      // Keep the stored report values when the model reshapes a list.
      if (!Array.isArray(target) || source.length !== target.length) return source;
      return source.map((value, i) => preserveReview(value, target[i]));
    }
    if (source && typeof source === 'object') {
      if (!target || typeof target !== 'object' || Array.isArray(target)) return source;
      const result = target as Record<string, unknown>;
      return Object.fromEntries(Object.entries(source).map(([name, value]) => [name, preserveReview(value, result[name], name)]));
    }
    if (typeof source !== 'string' || ['confidence', 'status', 'kind', 'reviewed_at'].includes(key)) return source;
    if (typeof target !== 'string' || (source.trim() && !target.trim())) return source;
    return target;
  };
  for (const key of ['quality', 'quality_history']) {
    if (original[key] !== undefined) translated[key] = preserveReview(original[key], translated[key]);
  }
  return translated;
}