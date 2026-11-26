/**
 * EduAccess - Library Sync Hook
 * Persists saved/completed courses to Supabase user_library table
 * Includes Realtime subscription for live cross-device sync
 */

import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';
import type { SearchResult } from '@/types';
import { libraryContent, splitLibrary } from '@/lib/libraryRecords';

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

function mapItemToSearchResult(item: any): SearchResult {
  const contentData = item.content_data as any;
  return {
    ...contentData,
    id: contentData?.id || item.id,
    title: contentData?.title || '',
    description: contentData?.description || '',
    contentType: contentData?.contentType || 'article',
    source: contentData?.source || 'wikipedia',
    url: contentData?.url || '',
    accessibilityStatus: contentData?.accessibilityStatus || 'accessible',
    educationLevel: contentData?.educationLevel || 'intermediate',
    metadata: contentData?.metadata || { tags: [], language: 'es' },
    thumbnail: contentData?.thumbnail || '',
  };
}

export function useLibrarySync() {
  const { currentUser, isAuthenticated } = useAuthStore();
  const loadedRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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
        useStore.setState(splitLibrary(data.map(item => ({ ...item, content_data: mapItemToSearchResult(item) }))));
        loadedRef.current = true;
        console.log(`Loaded ${data.length} library records`);
      } else {
        useStore.setState(splitLibrary([]));
        loadedRef.current = true;
      }
    } catch (err) {
      console.error('Library sync error:', err);
    }
  }, [currentUser?.id]);

  // Full reload helper for realtime events
  const reloadLibrary = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_library')
        .select('*')
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Error reloading library:', error);
        return;
      }

      useStore.setState(splitLibrary((data || []).map(item => ({ ...item, content_data: mapItemToSearchResult(item) }))));
    } catch (err) {
      console.error('Realtime reload error:', err);
    }
  }, [currentUser?.id]);

  // Subscribe to Realtime changes on user_library
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) return;

    // Load initial data
    loadLibraryFromDB();

    // Subscribe to realtime changes for this user's library.
    // Unique suffix avoids reusing an already-subscribed channel instance
    // when the hook mounts more than once (StrictMode / multiple consumers).
    const channel = supabase
      .channel(`user_library_${currentUser.id}_${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_library',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          console.log('📡 Realtime library update:', payload.eventType);
          reloadLibrary();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      loadedRef.current = false;
    };
  }, [isAuthenticated, currentUser?.id, loadLibraryFromDB, reloadLibrary]);

  const saveContentToDB = useCallback(async (content: SearchResult, status: string = 'saved') => {
    if (!currentUser?.id) {
      console.warn('⚠️ No user ID, cannot save to library');
      return;
    }

    try {
      // Search for existing entry by content ID inside JSONB
      const { data: existing, error: searchError } = await supabase
        .from('user_library')
        .select('id, status, content_data')
        .eq('user_id', currentUser.id)
        .eq('content_data->>id', content.id)
        .maybeSingle();

      if (searchError) {
        console.error('❌ Error searching library:', searchError);
      }

      const merged = libraryContent(content, existing?.content_data as unknown as SearchResult | undefined, status === 'recent');
      if (status === 'unpinned') merged.pinned = false;
      const storedStatus = ['recent', 'unpinned'].includes(status) ? (existing?.status || 'saved') : status;
      if (existing) {
        // Update existing entry
        const updatePayload: Record<string, any> = {
          status: storedStatus,
          content_data: merged,
          updated_at: new Date().toISOString(),
        };
        // When marking as completed, also set progress to 100%
        if (status === 'completed') {
          updatePayload.progress_percentage = 100;
        }

        const { error: updateError } = await supabase
          .from('user_library')
          .update(updatePayload as any)
          .eq('id', existing.id);

        if (updateError) {
          console.error('❌ Error updating library item:', updateError);
        } else {
          console.log(`✅ Library item updated: ${content.title} → ${status}`);
        }
      } else {
        // Insert new entry
        const insertPayload: Record<string, any> = {
          user_id: currentUser.id,
          content_data: merged as any,
          status: storedStatus,
        };
        if (status === 'completed') {
          insertPayload.progress_percentage = 100;
        }

        const { error: insertError } = await supabase
          .from('user_library')
          .insert(insertPayload as any);

        if (insertError) {
          console.error('❌ Error inserting library item:', insertError);
        } else {
          console.log(`✅ Library item inserted: ${content.title} (${status})`);
        }
      }
      await reloadLibrary();
    } catch (err) {
      console.error('❌ Library save error:', err);
    }
  }, [currentUser?.id, reloadLibrary]);

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
        .select('id, time_spent_seconds')
        .eq('user_id', currentUser.id)
        .eq('content_data->>id', contentId)
        .maybeSingle();

      if (existing) {
        const updatePayload: Record<string, any> = {
          ...progress,
          updated_at: new Date().toISOString(),
        };

        // Accumulate time_spent_seconds instead of overwriting
        if (progress.time_spent_seconds) {
          updatePayload.time_spent_seconds = (existing.time_spent_seconds || 0) + progress.time_spent_seconds;
        }

        await supabase
          .from('user_library')
          .update(updatePayload as any)
          .eq('id', existing.id);
        
        console.log(`✅ Progress updated for ${contentId}`, updatePayload);
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
