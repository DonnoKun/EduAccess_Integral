/**
 * EduAccess - Course Cache Hook
 * Checks DB cache before generating course content, saves after generation
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CourseContent {
  introduction: string;
  sections: any[];
  examples: any[];
  exercises: any[];
  summary: string;
  sources?: any[];
}

/**
 * Generate a deterministic cache key from course parameters
 */
function generateCacheKey(title: string, language: string): string {
  // Normalize: lowercase, trim, remove extra spaces
  const normalizedTitle = title.toLowerCase().trim().replace(/\s+/g, ' ');
  return `${normalizedTitle}__${language}`;
}

export function useCourseCache() {
  const getCachedCourse = useCallback(async (
    title: string,
    language: string
  ): Promise<CourseContent | null> => {
    try {
      const cacheKey = generateCacheKey(title, language);
      
      const { data: content, error } = await supabase.rpc('get_course_cache', { _key: cacheKey });
      const data = content ? { content } : null;

      if (error) {
        console.warn('Cache lookup error:', error);
        return null;
      }

      if (data?.content) {
        console.log('✅ Cache HIT for:', title);
        return data.content as unknown as CourseContent;
      }

      console.log('❌ Cache MISS for:', title);
      return null;
    } catch (err) {
      console.warn('Cache error:', err);
      return null;
    }
  }, []);

  const saveCourseToCache = useCallback(async (
    title: string,
    language: string,
    content: CourseContent
  ): Promise<void> => {
    try {
      const cacheKey = generateCacheKey(title, language);
      
      const { error } = await supabase
        .from('course_cache')
        .upsert(
          {
            cache_key: cacheKey,
            title,
            language,
            content: content as any,
          },
          { onConflict: 'cache_key', ignoreDuplicates: true }
        );

      if (error) {
        console.warn('Cache save error:', error);
      } else {
        console.log('💾 Course cached:', title);
      }
    } catch (err) {
      console.warn('Cache save error:', err);
    }
  }, []);

  return { getCachedCourse, saveCourseToCache };
}
