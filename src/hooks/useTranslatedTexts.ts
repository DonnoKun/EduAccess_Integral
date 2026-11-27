import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { readAICache, writeAICache } from '@/lib/aiCache';

/** Cheap stop-word guess; only strings that look like the other language are sent for translation. */
export function guessLanguage(text: string): 'es' | 'en' | null {
  const s = ` ${text.toLowerCase()} `;
  const es = (s.match(/\b(el|la|los|las|de|del|que|y|en|una|un|para|con|por|es|se)\b|[áéíóúñ¿¡]/g) || []).length;
  const en = (s.match(/\b(the|and|of|to|is|in|a|an|for|with|that|on|by|are)\b/g) || []).length;
  if (es === en) return null;
  return es > en ? 'es' : 'en';
}

async function hash(text: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

const MAX_LENGTH = 1200;
const BATCH = 20;

/**
 * Returns short strings in the interface language.
 * Each string is translated once (saved in the AI cache) and never re-sent; uncached strings go in batches.
 * `uncertain: true` also sends strings whose language cannot be guessed (e.g. short topic titles);
 * the server returns strings already in the target language unchanged.
 * Falls back to the original text if translation is unavailable.
 */
export function useTranslatedTexts(texts: (string | null | undefined)[], opts: { uncertain?: boolean } = {}): Record<string, string> {
  const { i18n } = useTranslation();
  const lang: 'es' | 'en' = i18n.language.startsWith('es') ? 'es' : 'en';
  const [map, setMap] = useState<Record<string, string>>({});
  const joined = texts.filter(Boolean).join('\u0000');
  const uncertain = Boolean(opts.uncertain);

  useEffect(() => {
    let cancelled = false;
    const pending = Array.from(new Set(joined ? joined.split('\u0000') : []))
      .filter(t => t.trim() && t.length <= MAX_LENGTH)
      .filter(t => { const g = guessLanguage(t); return g === null ? uncertain : g !== lang; });
    setMap({});
    (async () => {
      const missing: { text: string; key: string }[] = [];
      await Promise.all(pending.map(async text => {
        const key = `text-translation-v1:${lang}:${await hash(text)}`;
        const hit = await readAICache<{ text: string }>(key).catch(() => null);
        if (hit?.text) { if (!cancelled) setMap(prev => ({ ...prev, [text]: hit.text })); }
        else missing.push({ text, key });
      }));
      for (let i = 0; i < missing.length && !cancelled; i += BATCH) {
        const chunk = missing.slice(i, i + BATCH);
        try {
          const { data, error } = await supabase.functions.invoke('generate-course-content', { body: { texts: chunk.map(c => c.text), language: lang } });
          if (error || !data?.success || !Array.isArray(data.texts) || data.texts.length !== chunk.length) continue;
          const next: Record<string, string> = {};
          chunk.forEach((c, j) => {
            const out = String(data.texts[j] || '').trim();
            if (!out) return;
            next[c.text] = out;
            writeAICache(c.key, c.text.slice(0, 80), lang, { text: out }).catch(() => {});
          });
          if (!cancelled) setMap(prev => ({ ...prev, ...next }));
        } catch { /* keep original text */ }
      }
    })();
    return () => { cancelled = true; };
  }, [joined, lang, uncertain]);

  return map;
}
