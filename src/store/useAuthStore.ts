/**
 * EduAccess - Authentication Store
 * Token-based auth: each user gets a permanent numeric token as password.
 * Registration and token reset handled via edge function.
 * On login/session restore, syncs profile data (onboarding, visual prefs) from DB.
 */

import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/store/useStore';
import { createVisualProfile } from '@/store/useStore';
import type { ContrastMode, PreferredModality, BrightnessSensitivity, ThemeMode, SnellenNotation } from '@/types';

export interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  initialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, token: string) => Promise<boolean>;
  register: (email: string) => Promise<{ success: boolean; token?: string; error?: string }>;
  resetToken: (email: string) => Promise<{ success: boolean; token?: string; error?: string }>;
  logout: () => void;
  clearError: () => void;
  updateUserName: (name: string) => Promise<void>;
}

/**
 * Restores visual profile, theme, onboarding status from the DB profile
 * into the global Zustand store so the user skips onboarding on re-login.
 */
async function restoreProfileFromDB(userId: string) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!profile) return;

    const store = useStore.getState();

    // Restore onboarding completion status
    if ((profile as any).has_completed_onboarding && !store.hasCompletedOnboarding) {
      console.log('🔄 Restoring onboarding status from database');
      store.completeOnboarding();
    }

    // Restore visual preferences if available and not already set
    const visualPrefs = (profile as any).visual_preferences;
    if (visualPrefs && !store.visualProfile) {
      console.log('🔄 Restoring visual profile from database');
      const prefs = {
        fontSize: visualPrefs.fontSize || 20,
        contrast: (visualPrefs.contrast || 'normal') as ContrastMode,
        lineSpacing: visualPrefs.lineSpacing || 1.75,
        preferredModality: (visualPrefs.preferredModality || 'mixed') as PreferredModality,
        enableAnimations: visualPrefs.enableAnimations !== false,
        brightnessSensitivity: (visualPrefs.brightnessSensitivity || 'low') as BrightnessSensitivity,
      };

      // Reconstruct VisualProfile using the stored preferences
      const restoredProfile = createVisualProfile(
        (profile as any).user_name || 'User',
        '6/12' as SnellenNotation, // Default snellen - actual acuity isn't stored separately
        prefs
      );
      store.setVisualProfile(restoredProfile);
    }

    // Restore theme
    const savedTheme = (profile as any).current_theme as ThemeMode;
    if (savedTheme && savedTheme !== store.currentTheme) {
      console.log('🔄 Restoring theme from database:', savedTheme);
      store.setTheme(savedTheme);
    }

    // Restore reading guide setting
    if ((profile as any).reading_guide_enabled && !store.readingGuideEnabled) {
      store.toggleReadingGuide();
    }
  } catch (err) {
    console.warn('Could not restore profile from DB:', err);
  }
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  initialized: false,

  initialize: async () => {
    try {
      // Set up auth state listener for ONGOING changes (does NOT control isLoading)
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔐 Auth state change:', event);
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

          set({
            currentUser: {
              id: session.user.id,
              email: session.user.email || '',
              name: (profile as any)?.user_name || '',
            },
            isAuthenticated: true,
          });

          // Restore profile data from DB (fire and forget for ongoing changes)
          restoreProfileFromDB(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          set({
            currentUser: null,
            isAuthenticated: false,
          });
        }
      });

      // INITIAL load: check existing session and AWAIT profile restore before setting initialized
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        set({
          currentUser: {
            id: session.user.id,
            email: session.user.email || '',
            name: (profile as any)?.user_name || '',
          },
          isAuthenticated: true,
        });

        // AWAIT profile restoration before marking as initialized
        await restoreProfileFromDB(session.user.id);

        set({ initialized: true });
      } else {
        set({ initialized: true });
      }
    } catch (err) {
      console.error('Auth init error:', err);
      set({ initialized: true });
    }
  },

  login: async (email: string, token: string) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: token,
      });

      if (error) {
        console.error('Login error:', error);
        const msg = error.message === 'Invalid login credentials'
          ? 'Correo o token incorrecto'
          : error.message;
        set({ error: msg, isLoading: false });
        return false;
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .single();

        set({
          currentUser: {
            id: data.user.id,
            email: data.user.email || '',
            name: (profile as any)?.user_name || '',
          },
          isAuthenticated: true,
          isLoading: false,
        });

        // Restore profile/onboarding from DB after login
        await restoreProfileFromDB(data.user.id);

        return true;
      }

      set({ isLoading: false });
      return false;
    } catch (err) {
      console.error('Login exception:', err);
      set({ error: 'Error al iniciar sesión', isLoading: false });
      return false;
    }
  },

  register: async (email: string) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.functions.invoke('manage-auth-token', {
        body: { action: 'register', email },
      });

      if (error) {
        const msg = data?.error || error.message || 'Error al registrar';
        set({ error: msg, isLoading: false });
        return { success: false, error: msg };
      }

      if (data?.error) {
        set({ error: data.error, isLoading: false });
        return { success: false, error: data.error };
      }

      console.log('✅ User registered, token generated');
      set({ isLoading: false });
      return { success: true, token: data.token };
    } catch (err) {
      console.error('Register exception:', err);
      const msg = 'Error al crear la cuenta';
      set({ error: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  resetToken: async (email: string) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.functions.invoke('manage-auth-token', {
        body: { action: 'reset-token', email },
      });

      if (error) {
        const msg = data?.error || error.message || 'Error al restablecer token';
        set({ error: msg, isLoading: false });
        return { success: false, error: msg };
      }

      if (data?.error) {
        set({ error: data.error, isLoading: false });
        return { success: false, error: data.error };
      }

      console.log('✅ Token reset successful');
      set({ isLoading: false });
      return { success: true, token: data.token };
    } catch (err) {
      console.error('Reset token exception:', err);
      const msg = 'Error al restablecer el token';
      set({ error: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  logout: () => {
    console.log('🚪 Logging out user...');
    supabase.auth.signOut();
    set({
      currentUser: null,
      isAuthenticated: false,
      error: null,
    });
    setTimeout(() => {
      window.location.replace('/login');
    }, 100);
  },

  clearError: () => set({ error: null }),

  updateUserName: async (name: string) => {
    const { currentUser } = get();
    if (!currentUser) return;

    const { error } = await supabase
      .from('profiles')
      .update({ user_name: name } as any)
      .eq('user_id', currentUser.id);

    if (!error) {
      set({ currentUser: { ...currentUser, name } });
    }
  },
}));
