/**
 * EduAccess - Profile Sync Hook
 * Automatically syncs visual profile, theme, and settings to the database
 * with debouncing to avoid excessive writes.
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';

const SYNC_DELAY_MS = 1500; // Debounce: wait 1.5s after last change

export function useProfileSync() {
  const { visualProfile, currentTheme, readingGuideEnabled } = useStore();
  const { currentUser, isAuthenticated } = useAuthStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncRef = useRef<string>('');

  const syncToDatabase = useCallback(async () => {
    if (!currentUser?.id || !isAuthenticated || !visualProfile) return;

    // Build the payload to sync
    const payload = {
      user_name: visualProfile.userName,
      current_theme: currentTheme,
      reading_guide_enabled: readingGuideEnabled,
      visual_preferences: {
        fontSize: visualProfile.preferences.fontSize,
        contrast: visualProfile.preferences.contrast,
        lineSpacing: visualProfile.preferences.lineSpacing,
        preferredModality: visualProfile.preferences.preferredModality,
        enableAnimations: visualProfile.preferences.enableAnimations,
        brightnessSensitivity: visualProfile.preferences.brightnessSensitivity,
        enableTTS: visualProfile.technicalParameters.enableTTS,
      },
    };

    // Skip if nothing changed since last sync
    const payloadKey = JSON.stringify(payload);
    if (payloadKey === lastSyncRef.current) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update(payload as any)
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('❌ Profile sync error:', error);
      } else {
        lastSyncRef.current = payloadKey;
        console.log('✅ Profile synced to database:', {
          userName: payload.user_name,
          theme: payload.current_theme,
          fontSize: payload.visual_preferences.fontSize,
        });
      }
    } catch (err) {
      console.error('❌ Profile sync exception:', err);
    }
  }, [currentUser?.id, isAuthenticated, visualProfile, currentTheme, readingGuideEnabled]);

  // Debounced sync: triggers whenever relevant state changes
  useEffect(() => {
    if (!currentUser?.id || !isAuthenticated || !visualProfile) return;

    // Clear any pending sync
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Schedule a new sync after debounce delay
    timerRef.current = setTimeout(() => {
      syncToDatabase();
    }, SYNC_DELAY_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [
    visualProfile?.userName,
    visualProfile?.preferences.fontSize,
    visualProfile?.preferences.contrast,
    visualProfile?.preferences.lineSpacing,
    visualProfile?.preferences.enableAnimations,
    visualProfile?.preferences.brightnessSensitivity,
    visualProfile?.technicalParameters.enableTTS,
    currentTheme,
    readingGuideEnabled,
    syncToDatabase,
  ]);

  return { syncToDatabase };
}
