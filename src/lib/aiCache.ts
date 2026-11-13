/**
 * Shared AI result cache for every profile (student, teacher, any page).
 * Reuses saved results from course_cache and de-duplicates identical
 * in-flight requests so the same AI work is never paid for twice.
 */
import { supabase } from '@/integrations/supabase/client';

const inFlight = new Map<string, Promise<unknown>>();

export function aiCacheKey(...parts: unknown[]): string {
  return parts
    .map((p) => (typeof p === 'string' ? p : JSON.stringify(p ?? '')))
    .join('|')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/** Only generic topic results are reused across accounts; private text (remediation, group lessons) stays owner-only. */
export function isSharedKey(key: string): boolean {
  return key.startsWith('search|') || key.startsWith('course-gen|');
}

export async function readAICache<T>(key: string): Promise<T | null> {
  const { data } = await supabase.rpc('get_course_cache', { _key: key });
  return (data as T) ?? null;
}

export async function writeAICache(key: string, title: string, language: string, content: unknown) {
  await supabase
    .from('course_cache')
    .upsert({ cache_key: key, title, language, content: content as any, is_shared: isSharedKey(key) }, { onConflict: 'cache_key', ignoreDuplicates: true });
}

/** Run `generate` only if no saved or pending result exists for `key`. Results are saved only when `isValid` passes. */
export function cachedAI<T>(key: string, title: string, language: string, generate: () => Promise<T>, isValid: (r: T) => boolean): Promise<T> {
  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;
  const run = (async () => {
    try {
      const hit = await readAICache<T>(key);
      if (hit) return hit;
    } catch { /* cache unavailable: fall through */ }
    const result = await generate();
    if (isValid(result)) writeAICache(key, title, language, result).catch(() => {});
    return result;
  })().finally(() => inFlight.delete(key));
  inFlight.set(key, run);
  return run;
}
