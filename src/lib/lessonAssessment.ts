import { supabase } from '@/integrations/supabase/client';
import { cachedAI } from '@/lib/aiCache';
import { lessonLanguage, type LessonDraft } from '@/lib/lessonRevision';
import type { LessonContent } from '@/lib/courses';

async function digest(value: unknown) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}

/** Cache the exact revision, including its report, in both reading and editing views. */
export async function translateLesson(draft: LessonDraft, language: 'es' | 'en'): Promise<LessonDraft> {
  if (lessonLanguage(draft.content) === language) return draft;
  const originalContent = { ...draft.content, lesson_title: draft.title, lesson_description: draft.description };
  const key = `lesson-language-v5:${await digest(originalContent)}:${language}`;
  return cachedAI(key, draft.title, language, async () => {
    const { data, error } = await supabase.functions.invoke('generate-course-content', {
      body: { title: draft.title, description: draft.description, contentType: 'article', source: 'oer', language, originalContent },
    });
    if (error || !data?.success || !data.content?.introduction) throw new Error('Translation unavailable');
    const { lesson_title, lesson_description, ...content } = data.content;
    if (typeof lesson_title !== 'string' || typeof lesson_description !== 'string') throw new Error('Incomplete lesson translation');
    return { title: lesson_title, description: lesson_description, content: { ...content, lesson_title, lesson_description, language } };
  }, value => Boolean(value.content.introduction));
}

/** Old search lessons receive one cached assessment, never regenerated text or images. */
export async function assessSearchLesson(title: string, description: string, lesson: LessonContent, language: 'es' | 'en', educationLevel?: string, contentType?: string): Promise<LessonContent> {
  if (lesson.quality) return lesson;
  const key = `search-assessment-v2:${await digest({ title, description, lesson, educationLevel, contentType })}:${language}`;
  return cachedAI(key, title, language, async () => {
    // One retry for transient failures (network, session refresh, 5xx); never for 400/402/429.
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt) await new Promise(r => setTimeout(r, 1500));
      const { data, error } = await supabase.functions.invoke('generate-course-content', {
        body: { operation: 'review', title, description, lesson, language, directSearch: true, educationLevel, contentType },
      });
      if (!error && data?.success && data.content?.quality) return data.content;
      const status = (error as { context?: Response } | null)?.context?.status;
      if (status === 400 || status === 402 || status === 429) break;
    }
    throw new Error('Assessment unavailable');
  }, value => Boolean(value.quality));
}