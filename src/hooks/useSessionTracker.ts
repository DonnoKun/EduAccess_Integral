/**
 * EduAccess - Session Tracker Hook
 * Tracks real session analytics: time spent, content viewed, tasks completed
 * Persists to Supabase session_analytics table
 */

import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';

export function useSessionTracker() {
  const { currentUser, isAuthenticated } = useAuthStore();
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Create a new session
  const createSession = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      const { data, error } = await supabase
        .from('session_analytics')
        .insert({
          user_id: currentUser.id,
          session_start: new Date().toISOString(),
        } as any)
        .select('id')
        .single();

      if (!error && data) {
        sessionIdRef.current = data.id;
        startTimeRef.current = Date.now();
        console.log('📊 Session tracking started:', data.id);
      }
    } catch (err) {
      console.error('Session create error:', err);
    }
  }, [currentUser?.id]);

  // Update session with current metrics
  const updateSession = useCallback(async () => {
    if (!sessionIdRef.current || !currentUser?.id) return;

    const metrics = useStore.getState().sessionMetrics;
    const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      await supabase
        .from('session_analytics')
        .update({
          total_time_seconds: elapsedSeconds,
          content_viewed: metrics.contentViewed,
          tasks_completed: metrics.tasksCompleted,
          session_end: new Date().toISOString(),
        } as any)
        .eq('id', sessionIdRef.current);
    } catch (err) {
      console.error('Session update error:', err);
    }
  }, [currentUser?.id]);

  // Also update the local store's totalTimeSpent
  const updateLocalTime = useCallback(() => {
    const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    useStore.setState((state) => ({
      sessionMetrics: {
        ...state.sessionMetrics,
        totalTimeSpent: elapsedSeconds,
      },
    }));
  }, []);

  useEffect(() => {
    if (isAuthenticated && currentUser?.id) {
      createSession();

      // Update every 30 seconds
      intervalRef.current = setInterval(() => {
        updateLocalTime();
        updateSession();
      }, 30000);

      // Update on page unload
      const handleUnload = () => {
        updateSession();
      };
      window.addEventListener('beforeunload', handleUnload);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        window.removeEventListener('beforeunload', handleUnload);
        updateSession();
      };
    }
  }, [isAuthenticated, currentUser?.id, createSession, updateSession, updateLocalTime]);

  const incrementTasksCompleted = useCallback(() => {
    useStore.setState((state) => ({
      sessionMetrics: {
        ...state.sessionMetrics,
        tasksCompleted: state.sessionMetrics.tasksCompleted + 1,
      },
    }));
    // Trigger DB update
    setTimeout(updateSession, 500);
  }, [updateSession]);

  return {
    incrementTasksCompleted,
    updateSession,
  };
}
