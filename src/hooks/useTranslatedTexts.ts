import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { cachedAI } from '@/lib/aiCache';

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

/**
 * Returns teacher-written strings in the interface language.
 * Each string is translated once (saved in the shared AI cache) and never re-sent.
 * Falls back to the original text if translation is unavailable.
 */
export function useTranslatedTexts(texts: (string | null | undefined)[]): Record<string, string> {
  const { i18n } = useTranslation();
  const lang: 'es' | 'en' = i18n.language.startsWith('es') ? 'es' : 'en';
  const [map, setMap] = useState<Record<string, string>>({});
  const joined = texts.filter(Boolean).join('\u0000');

  useEffect(() => {
    let cancelled = false;
    const pending = Array.from(new Set(joined ? joined.split('\u0000') : []))
      .filter(t => t.length <= 600)
      .filter(t => { const g = guessLanguage(t); return g !== null && g !== lang; });
    setMap({});
    pending.forEach(async (text) => {
      try {
        const key = `text-translation-v1:${lang}:${await hash(text)}`;
        const result = await cachedAI<{ text: string }>(key, text.slice(0, 80), lang, async () => {
          const { data, error } = await supabase.functions.invoke('generate-course-content', { body: { texts: [text], language: lang } });
          if (error || !data?.success || !Array.isArray(data.texts)) throw new Error('translation unavailable');
          return { text: String(data.texts[0] || '') };
        }, r => Boolean(r?.text));
        if (!cancelled && result?.text) setMap(prev => ({ ...prev, [text]: result.text }));
      } catch { /* keep original text */ }
    });
    return () => { cancelled = true; };
  }, [joined, lang]);

  return map;
}
