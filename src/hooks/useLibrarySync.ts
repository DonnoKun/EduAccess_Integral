/**
 * EduAccess - Library Sync Hook
 * Persists saved/completed courses to Supabase user_library table
 */

import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';
import type { SearchResult } from '@/types';

interface LibraryItem {
  id: string;
  user_id: string;
  content_data: any;
  status: string;
  progress_percentage: number;
  exercises_completed: number;
  exercises_total: number;
  time_spent_seconds: number;
}

export function useLibrarySync() {
  const { currentUser, isAuthenticated } = useAuthStore();
  const loadedRef = useRef(false);

  const loadLibraryFromDB = useCallback(async () => {
    if (!currentUser?.id || loadedRef.current) return;

    try {
      const { data, error } = await supabase
        .from('user_library')
        .select('*')
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Error loading library:', error);
        return;
      }

      if (data && data.length > 0) {
        const saved: SearchResult[] = [];
        const completed: SearchResult[] = [];

        data.forEach((item: any) => {
          const contentData = item.content_data as any;
          if (contentData) {
            const searchResult: SearchResult = {
              id: contentData.id || item.id,
              title: contentData.title || '',
              description: contentData.description || '',
              contentType: contentData.contentType || 'article',
              source: contentData.source || 'wikipedia',
              url: contentData.url || '',
              accessibilityStatus: contentData.accessibilityStatus || 'accessible',
              educationLevel: contentData.educationLevel || 'intermediate',
              metadata: contentData.metadata || { tags: [], language: 'es' },
              thumbnail: contentData.thumbnail || '',
            };

            if (item.status === 'completed') {
              completed.push(searchResult);
            }
            saved.push(searchResult);
          }
        });

        // Set into store without triggering re-saves
        useStore.setState({ savedContent: saved, completedContent: completed });
        loadedRef.current = true;
        console.log(`📚 Loaded ${saved.length} saved, ${completed.length} completed from DB`);
      } else {
        loadedRef.current = true;
      }
    } catch (err) {
      console.error('Library sync error:', err);
    }
  }, [currentUser?.id]);

  // Load library on auth
  useEffect(() => {
    if (isAuthenticated && currentUser?.id) {
      loadLibraryFromDB();
    } else {
      loadedRef.current = false;
    }
  }, [isAuthenticated, currentUser?.id, loadLibraryFromDB]);

  const saveContentToDB = useCallback(async (content: SearchResult, status: string = 'saved') => {
    if (!currentUser?.id) return;

    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from('user_library')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('content_data->>id', content.id)
        .maybeSingle();

      if (existing) {
        // Update status
        await supabase
          .from('user_library')
          .update({ status, updated_at: new Date().toISOString() } as any)
          .eq('id', existing.id);
      } else {
        // Insert new
        await supabase
          .from('user_library')
          .insert({
            user_id: currentUser.id,
            content_data: content as any,
            status,
          } as any);
      }
    } catch (err) {
      console.error('Error saving to library:', err);
    }
  }, [currentUser?.id]);

  const removeContentFromDB = useCallback(async (contentId: string) => {
    if (!currentUser?.id) return;

    try {
      await supabase
        .from('user_library')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('content_data->>id', contentId);
    } catch (err) {
      console.error('Error removing from library:', err);
    }
  }, [currentUser?.id]);

  const updateProgressInDB = useCallback(async (
    contentId: string,
    progress: { exercises_completed?: number; exercises_total?: number; time_spent_seconds?: number; progress_percentage?: number }
  ) => {
    if (!currentUser?.id) return;

    try {
      const { data: existing } = await supabase
        .from('user_library')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('content_data->>id', contentId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('user_library')
          .update({
            ...progress,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', existing.id);
      }
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  }, [currentUser?.id]);

  return {
    saveContentToDB,
    removeContentFromDB,
    updateProgressInDB,
    loadLibraryFromDB,
  };
}
