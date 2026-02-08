/**
 * EduAccess - Authentication Store
 * Real Supabase Auth with email OTP (magic link)
 * Each student gets their own persistent profile
 */

import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

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
  pendingEmail: string | null;

  // Actions
  initialize: () => Promise<void>;
  sendOTP: (email: string) => Promise<boolean>;
  verifyOTP: (code: string) => Promise<{ success: boolean; isNewUser: boolean }>;
  logout: () => void;
  clearError: () => void;
  updateUserName: (name: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  initialized: false,
  pendingEmail: null,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Load profile from database
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
          initialized: true,
        });
      } else {
        set({ initialized: true });
      }

      // Listen for auth state changes
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
        } else if (event === 'SIGNED_OUT') {
          set({
            currentUser: null,
            isAuthenticated: false,
          });
        }
      });
    } catch (err) {
      console.error('Auth init error:', err);
      set({ initialized: true });
    }
  },

  sendOTP: async (email: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error('OTP send error:', error);
        set({ error: error.message, isLoading: false });
        return false;
      }

      console.log('═══════════════════════════════════════════');
      console.log('📧 OTP enviado a:', email);
      console.log('💡 Revisa tu correo electrónico para el código');
      console.log('💡 Para pruebas: revisa los logs del backend');
      console.log('═══════════════════════════════════════════');

      set({ pendingEmail: email, isLoading: false });
      return true;
    } catch (err) {
      console.error('OTP error:', err);
      set({ error: 'Error sending OTP', isLoading: false });
      return false;
    }
  },

  verifyOTP: async (code: string) => {
    const { pendingEmail } = get();
    if (!pendingEmail) {
      set({ error: 'No pending email', isLoading: false });
      return { success: false, isNewUser: false };
    }

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: code,
        type: 'email',
      });

      if (error) {
        console.error('OTP verify error:', error);
        set({ error: error.message, isLoading: false });
        return { success: false, isNewUser: false };
      }

      if (data.user) {
        // Check if profile has completed onboarding
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .single();

        const isNewUser = !(profile as any)?.has_completed_onboarding;

        set({
          currentUser: {
            id: data.user.id,
            email: data.user.email || '',
            name: (profile as any)?.user_name || '',
          },
          isAuthenticated: true,
          isLoading: false,
          pendingEmail: null,
        });

        return { success: true, isNewUser };
      }

      set({ isLoading: false });
      return { success: false, isNewUser: false };
    } catch (err) {
      console.error('Verify error:', err);
      set({ error: 'Verification failed', isLoading: false });
      return { success: false, isNewUser: false };
    }
  },

  logout: () => {
    console.log('🚪 Logging out user...');
    supabase.auth.signOut();
    set({
      currentUser: null,
      isAuthenticated: false,
      pendingEmail: null,
      error: null,
    });
    // Force navigation to login
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
