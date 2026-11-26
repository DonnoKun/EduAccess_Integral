/**
 * CourseImage - Lazily generates and displays AI images for course sections
 * Reports progress back to parent via onStatusChange callback
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageIcon } from 'lucide-react';
import { cachedAI } from '@/lib/aiCache';
import { shortAlt } from '../../supabase/functions/_shared/low-vision';

const imageRequests = new Map<string, Promise<{ imageUrl?: string; success?: boolean; error?: string }>>();

interface CourseImageProps {
  prompt: string;
  alt: string;
  /** Stable original-language alt text used only to identify the cached bitmap. */
  cacheAlt?: string;
  className?: string;
  lang?: string;
  /** Section title for context-aware generation */
  sectionTitle?: string;
  /** Section content snippet for context-aware generation */
  sectionContext?: string;
  /** Called when image finishes loading or errors */
  onStatusChange?: (status: 'loading' | 'done' | 'error') => void;
  onDescription?: (description: string) => void;
}

export default function CourseImage({ prompt, alt, cacheAlt, className, lang = 'es', sectionTitle, sectionContext, onStatusChange, onDescription }: CourseImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [observedAlt, setObservedAlt] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [descriptionFailed, setDescriptionFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true); setError(false); setImageUrl(null);
    onStatusChange?.('loading');

    const generateImage = async () => {
      try {
        const key = JSON.stringify([prompt, cacheAlt || alt, sectionTitle, sectionContext, lang]);
        const localKey = `course-image:${key}`;
        const known = (() => { try { return localStorage.getItem(localKey); } catch { return null; } })();
        if (known) { setImageUrl(known); setIsLoading(false); onStatusChange?.('done'); return; }
        let request = imageRequests.get(key);
        if (!request) {
          request = supabase.functions.invoke('generate-course-image', { body: { prompt, alt: cacheAlt || alt, sectionTitle, sectionContext, language: lang === 'en' ? 'en' : 'es' } }).then(({ data, error }) => { if (error) throw error; return data; }).finally(() => imageRequests.delete(key));
          imageRequests.set(key, request);
        }
        const data = await request;

        if (cancelled) return;
        if (!data?.success || !data?.imageUrl) {
          console.warn('Image generation failed:', data?.error);
          setError(true);
          onStatusChange?.('error');
          return;
        }

        try { if (/^https?:/.test(data.imageUrl)) localStorage.setItem(localKey, data.imageUrl); } catch { /* storage full: server cache still applies */ }
        setImageUrl(data.imageUrl);
        onStatusChange?.('done');
      } catch (err) {
        if (!cancelled) {
          console.warn('Image generation error:', err);
          setError(true);
          onStatusChange?.('error');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    generateImage();
    return () => { cancelled = true; };
  }, [prompt, lang]);

  useEffect(() => {
    if (!imageUrl) return;
    let cancelled = false;
    setObservedAlt(''); setLongDescription(''); setDescriptionFailed(false);
    (async () => {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(imageUrl));
      const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
      const description = await cachedAI(`image-vision-v1:${hash}:${lang}`, 'Image description', lang, async () => {
        const { data, error } = await supabase.functions.invoke('alt-text', { body: { title: 'Educational illustration', imageUrl, language: lang === 'en' ? 'en' : 'es' } });
        if (error || !data?.result?.longDescription) throw new Error('Image description unavailable');
        return data.result as { altText: string; longDescription: string };
      }, result => Boolean(result.longDescription));
      if (!cancelled) { setObservedAlt(description.altText); setLongDescription(description.longDescription); onDescription?.(description.longDescription); }
    })().catch(() => { if (!cancelled) setDescriptionFailed(true); });
    return () => { cancelled = true; };
  }, [imageUrl, lang]);

  if (error) return null;

  if (isLoading) {
    return (
      <div className={`rounded-lg overflow-hidden my-4 ${className || ''}`}>
        <Skeleton className="w-full h-48 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="h-8 w-8 animate-pulse" />
            <span className="text-xs">
              {lang === 'es' ? 'Generando imagen...' : 'Generating image...'}
            </span>
          </div>
        </Skeleton>
      </div>
    );
  }

  if (!imageUrl) return null;
  return (
    <figure className={`rounded-lg overflow-hidden my-4 ${className || ''}`}>
      <img
        src={imageUrl}
        alt={shortAlt(observedAlt || alt)}
        className="w-full rounded-lg shadow-sm"
        loading="lazy"
      />
      <figcaption className="sr-only">
        <p>{observedAlt || shortAlt(alt)}</p>
        {longDescription && <p className="whitespace-pre-line">{longDescription}</p>}
        {descriptionFailed && <p>{lang === 'es' ? 'La descripción visual detallada no está disponible.' : 'The detailed visual description is unavailable.'}</p>}
      </figcaption>
    </figure>
  );
}
