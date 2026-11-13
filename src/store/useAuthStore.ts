/**
 * EduAccess - Authentication Store
 * Token-based auth: each user gets a permanent numeric token as password.
 * Registration and token reset handled via edge function.
 * On login/session restore, syncs profile data (onboarding, visual prefs) from DB.
 */

import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { brokeredPreviewStorage } from '@/integrations/supabase/previewAuthStorage';
import { clearAllUserData, resetVisualSettingsToDefault } from '@/lib/resetVisualSettings';
import { useStore } from '@/store/useStore';
import { createVisualProfile } from '@/store/useStore';
import type { ContrastMode, PreferredModality, BrightnessSensitivity, ThemeMode, SnellenNotation } from '@/types';

export interface User {
  id: string;
  email: string;
  name: string;
}

export type AppRole = 'teacher' | 'student';

interface AuthState {
  currentUser: User | null;
  role: AppRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  initialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, token: string) => Promise<boolean>;
  register: (email: string, role?: AppRole, teacherCode?: string) => Promise<{ success: boolean; token?: string; recoveryCode?: string; error?: string }>;
  resetToken: (email: string, recoveryCode: string) => Promise<{ success: boolean; token?: string; recoveryCode?: string; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUserName: (name: string) => Promise<void>;
}

/**
 * Restores visual profile, theme, onboarding status, and recent searches
 * from the DB profile into the global Zustand store so the user has full
 * continuity on any device/session.
 */
let logoutInProgress = false;

async function restoreProfileFromDB(profileData: any, userId: string) {
  try {
    if (!profileData) return;

    const store = useStore.getState();

    // Restore onboarding completion status SYNCHRONOUSLY
    // This MUST happen before initialized=true so routing doesn't redirect to onboarding
    if (profileData.has_completed_onboarding && !store.hasCompletedOnboarding) {
      console.log('🔄 Restoring onboarding status from database');
      store.completeOnboarding();
    }

    // Restore visual preferences if available and not already set
    const visualPrefs = profileData.visual_preferences;
    if (visualPrefs) {
      console.log('🔄 Restoring visual profile from database');
      const prefs = {
        fontSize: visualPrefs.fontSize || 20,
        contrast: (visualPrefs.contrast || 'normal') as ContrastMode,
        lineSpacing: visualPrefs.lineSpacing || 1.75,
        preferredModality: (visualPrefs.preferredModality || 'mixed') as PreferredModality,
        enableAnimations: visualPrefs.enableAnimations !== false,
        brightnessSensitivity: (visualPrefs.brightnessSensitivity || 'low') as BrightnessSensitivity,
      };

      const restoredProfile = createVisualProfile(
        profileData.user_name || 'User',
        '6/12' as SnellenNotation,
        prefs
      );

      // Restore TTS setting if saved
      if (visualPrefs.enableTTS !== undefined) {
        restoredProfile.technicalParameters.enableTTS = visualPrefs.enableTTS;
      }

      store.setVisualProfile(restoredProfile);
    }

    // Restore theme
    const savedTheme = profileData.current_theme as ThemeMode;
    if (savedTheme && savedTheme !== store.currentTheme) {
      console.log('🔄 Restoring theme from database:', savedTheme);
      store.setTheme(savedTheme);
    }

    // Restore reading guide setting
    if (profileData.reading_guide_enabled && !store.readingGuideEnabled) {
      store.toggleReadingGuide();
    }

    // Restore tutorial_seen flag to localStorage so the modal doesn't reopen
    if (visualPrefs?.tutorial_seen) {
      localStorage.setItem('tutorial_seen', 'true');
    }

    // Restore recent searches from DB
    try {
      const { data: searches } = await supabase
        .from('user_searches')
        .select('query, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (searches && searches.length > 0) {
        // Deduplicate, keeping most recent
        const seen = new Set<string>();
        const uniqueSearches: string[] = [];
        for (const s of searches) {
          const normalized = s.query.toLowerCase();
          if (!seen.has(normalized)) {
            seen.add(normalized);
            uniqueSearches.push(s.query);
          }
        }
        console.log('🔄 Restored', uniqueSearches.length, 'recent searches from database');
        useStore.setState({ recentSearches: uniqueSearches });
      }
    } catch (err) {
      console.warn('Could not restore recent searches:', err);
    }
  } catch (err) {
    console.warn('Could not restore profile from DB:', err);
  }
}

/** Reads the user's role from the user_roles table (teacher | student). */
async function fetchUserRole(userId: string): Promise<AppRole | null> {
  try {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    return ((data as any)?.role as AppRole) ?? null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  currentUser: null,
  role: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  initialized: false,

  initialize: async () => {
    let isMounted = true;

    // Helper to fetch profile (non-throwing)
    const fetchProfile = async (userId: string) => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();
        return data;
      } catch {
        return null;
      }
    };

    // ONGOING auth changes listener — fire-and-forget, does NOT control initialized
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted || logoutInProgress) return;
        console.log('🔐 Auth state change (ongoing):', event);

        // Skip INITIAL_SESSION — handled by initializeAuth below
        if (event === 'INITIAL_SESSION') return;

        if (event === 'SIGNED_IN' && session?.user) {
          // If login() is actively running (isLoading=true), skip —
          // login() handles profile restoration + auth state to avoid
          // race condition where isAuthenticated=true before hasCompletedOnboarding
          if (get().isLoading) {
            console.log('🔐 Skipping SIGNED_IN listener — login() is handling it');
            return;
          }
          // For other SIGNED_IN triggers (e.g. re-auth)
          fetchProfile(session.user.id).then(async (profile) => {
            if (!isMounted || logoutInProgress) return;
            if (profile) {
              await restoreProfileFromDB(profile, session.user.id);
            }
            const role = await fetchUserRole(session.user.id);
            if (logoutInProgress) return;
            set({
              currentUser: {
                id: session.user.id,
                email: session.user.email || '',
                name: (profile as any)?.user_name || '',
              },
              role,
              isAuthenticated: true,
            });
          });
        } else if (event === 'SIGNED_OUT') {
          set({ currentUser: null, role: null, isAuthenticated: false });
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Just update session, no heavy operations
          set((s) => ({
            currentUser: s.currentUser ?? {
              id: session.user.id,
              email: session.user.email || '',
              name: '',
            },
            isAuthenticated: true,
          }));
        }
      }
    );

    // INITIAL load — controls initialized flag
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (session?.user) {
        // Set user immediately so the app doesn't flash to login
        set({
          currentUser: {
            id: session.user.id,
            email: session.user.email || '',
            name: '',
          },
          isAuthenticated: true,
        });

        // Fetch profile BEFORE marking initialized to restore onboarding status
        fetchUserRole(session.user.id).then((role) => {
          if (isMounted) set({ role });
        });

        const profile = await fetchProfile(session.user.id);
        if (isMounted && profile) {
          set((s) => ({
            currentUser: {
              ...s.currentUser!,
              name: (profile as any)?.user_name || '',
            },
          }));
          await restoreProfileFromDB(profile, session.user.id);
        }
      }
    } catch (err) {
      console.error('Auth init error:', err);
    } finally {
      if (isMounted) {
        set({ initialized: true });
      }
    }

    // Safety timeout — ensure app NEVER gets permanently stuck on splash
    setTimeout(() => {
      const state = get();
      if (!state.initialized) {
        console.warn('⚠️ Auth init safety timeout triggered — forcing initialized');
        set({ initialized: true });
      }
    }, 5000);
  },

  login: async (email: string, token: string) => {
    logoutInProgress = false;
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

        // Restore profile/onboarding BEFORE setting isAuthenticated
        // so routing sees hasCompletedOnboarding=true on the first render
        await restoreProfileFromDB(profile, data.user.id);

        const role = await fetchUserRole(data.user.id);

        set({
          currentUser: {
            id: data.user.id,
            email: data.user.email || '',
            name: (profile as any)?.user_name || '',
          },
          role,
          isAuthenticated: true,
          isLoading: false,
        });

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

  register: async (email: string, role: AppRole = 'student', teacherCode?: string) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.functions.invoke('manage-auth-token', {
        body: { action: 'register', email, role, teacherCode },
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
      return { success: true, token: data.token, recoveryCode: data.recoveryCode };
    } catch (err) {
      console.error('Register exception:', err);
      const msg = 'Error al crear la cuenta';
      set({ error: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  resetToken: async (email: string, recoveryCode: string) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.functions.invoke('manage-auth-token', {
        body: { action: 'reset-token', email, recoveryCode },
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
      return { success: true, token: data.token, recoveryCode: data.recoveryCode };
    } catch (err) {
      console.error('Reset token exception:', err);
      const msg = 'Error al restablecer el token';
      set({ error: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  logout: async () => {
    if (logoutInProgress) return;
    logoutInProgress = true;
    console.log('🚪 Logging out user...');
    try {
      // Await storage/broker cleanup; reloading early restores the old session.
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) console.warn('Remote sign-out unavailable; clearing this device.');
    } catch {
      console.warn('Sign-out unavailable; clearing this device.');
    } finally {
      // Also clear via the configured preview broker if the remote request failed.
      const storageKey = `sb-${new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
      const storage = brokeredPreviewStorage();
      await storage?.removeItem(storageKey);
      await storage?.removeItem(`${storageKey}-code-verifier`);
      window.speechSynthesis?.cancel();
      useStore.setState(useStore.getInitialState());
      clearAllUserData();
      resetVisualSettingsToDefault();
      set({ currentUser: null, role: null, isAuthenticated: false, isLoading: false, error: null });
      window.location.replace('/login');
    }
  },

  clearError: () => set({ error: null }),

  updateUserName: async (name: string) => {
    const { currentUser } = get();
    if (!currentUser) return;

    const { error } = await supabase
      .from('profiles')
      .upsert({ user_id: currentUser.id, user_name: name } as any, { onConflict: 'user_id' });

    if (!error) {
      set({ currentUser: { ...currentUser, name } });
    }
  },
}));
