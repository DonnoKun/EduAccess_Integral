/**
 * CourseImage - Lazily generates and displays AI images for course sections
 * Reports progress back to parent via onStatusChange callback
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageIcon } from 'lucide-react';

interface CourseImageProps {
  prompt: string;
  alt: string;
  className?: string;
  lang?: string;
  /** Called when image finishes loading or errors */
  onStatusChange?: (status: 'loading' | 'done' | 'error') => void;
}

export default function CourseImage({ prompt, alt, className, lang = 'es', onStatusChange }: CourseImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    onStatusChange?.('loading');

    const generateImage = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('generate-course-image', {
          body: { prompt, alt },
        });

        if (cancelled) return;
        if (fnError || !data?.success || !data?.imageUrl) {
          console.warn('Image generation failed:', fnError || data?.error);
          setError(true);
          onStatusChange?.('error');
          return;
        }

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
  }, [prompt]);

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

  return (
    <figure className={`rounded-lg overflow-hidden my-4 ${className || ''}`}>
      <img
        src={imageUrl!}
        alt={alt}
        className="w-full rounded-lg shadow-sm"
        loading="lazy"
      />
      <figcaption className="text-xs text-muted-foreground text-center mt-2 italic px-2">
        {alt}
      </figcaption>
    </figure>
  );
}
