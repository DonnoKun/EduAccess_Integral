/**
 * EduAccess - Authentication Store
 * OTP-based authentication without passwords
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  createdAt: Date;
  lastLogin: Date;
}

export interface OTPSession {
  identifier: string;
  code: string;
  expiresAt: Date;
  attempts: number;
}

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  otpSession: OTPSession | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  sendOTP: (identifier: string, type: 'email' | 'phone') => Promise<boolean>;
  verifyOTP: (code: string) => Promise<{ success: boolean; isNewUser: boolean }>;
  resendOTP: () => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  updateUserName: (name: string) => void;
}

function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function getStoredUser(identifier: string): User | null {
  const stored = localStorage.getItem(`user:${identifier}`);
  if (stored) {
    try {
      const user = JSON.parse(stored);
      return {
        ...user,
        createdAt: new Date(user.createdAt),
        lastLogin: new Date(user.lastLogin),
      };
    } catch {
      return null;
    }
  }
  return null;
}

function saveUser(user: User) {
  const identifier = user.email || user.phone;
  if (identifier) {
    localStorage.setItem(`user:${identifier}`, JSON.stringify(user));
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: false,
      otpSession: null,
      isLoading: false,
      error: null,

      sendOTP: async (identifier: string, type: 'email' | 'phone') => {
        set({ isLoading: true, error: null });

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        const code = generateOTP();
        const otpSession: OTPSession = {
          identifier,
          code,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
          attempts: 0,
        };

        // Log OTP to console for testing
        console.log('═══════════════════════════════════════════');
        console.log('🔐 OTP CODE for ' + identifier + ': ' + code);
        console.log('⏰ Valid for 5 minutes');
        console.log('💡 For testing, you can also use "0000"');
        console.log('═══════════════════════════════════════════');

        set({ otpSession, isLoading: false });
        return true;
      },

      verifyOTP: async (inputCode: string) => {
        const { otpSession } = get();
        set({ isLoading: true, error: null });

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 300));

        if (!otpSession) {
          set({ error: 'No OTP session found', isLoading: false });
          return { success: false, isNewUser: false };
        }

        // Check if expired
        if (new Date() > otpSession.expiresAt) {
          set({ error: 'Code has expired', otpSession: null, isLoading: false });
          return { success: false, isNewUser: false };
        }

        // Check attempts
        if (otpSession.attempts >= 3) {
          set({ error: 'Too many attempts', otpSession: null, isLoading: false });
          return { success: false, isNewUser: false };
        }

        // Update attempts
        const updatedSession = { ...otpSession, attempts: otpSession.attempts + 1 };
        set({ otpSession: updatedSession });

        // Check code (allow "0000" as magic code for testing)
        if (inputCode === otpSession.code || inputCode === '0000') {
          // Check if returning user
          const existingUser = getStoredUser(otpSession.identifier);
          
          if (existingUser) {
            // Returning user
            const updatedUser = {
              ...existingUser,
              lastLogin: new Date(),
            };
            saveUser(updatedUser);
            set({
              currentUser: updatedUser,
              isAuthenticated: true,
              otpSession: null,
              isLoading: false,
            });
            return { success: true, isNewUser: false };
          } else {
            // New user - create basic profile
            const isEmail = otpSession.identifier.includes('@');
            const newUser: User = {
              id: crypto.randomUUID(),
              email: isEmail ? otpSession.identifier : undefined,
              phone: !isEmail ? otpSession.identifier : undefined,
              name: '',
              createdAt: new Date(),
              lastLogin: new Date(),
            };
            saveUser(newUser);
            set({
              currentUser: newUser,
              isAuthenticated: true,
              otpSession: null,
              isLoading: false,
            });
            return { success: true, isNewUser: true };
          }
        }

        set({ error: 'Invalid code', isLoading: false });
        return { success: false, isNewUser: false };
      },

      resendOTP: async () => {
        const { otpSession } = get();
        if (!otpSession) return false;

        const isEmail = otpSession.identifier.includes('@');
        return get().sendOTP(otpSession.identifier, isEmail ? 'email' : 'phone');
      },

      logout: () => {
        set({
          currentUser: null,
          isAuthenticated: false,
          otpSession: null,
          error: null,
        });
      },

      clearError: () => set({ error: null }),

      updateUserName: (name: string) => {
        const { currentUser } = get();
        if (currentUser) {
          const updatedUser = { ...currentUser, name };
          saveUser(updatedUser);
          set({ currentUser: updatedUser });
        }
      },
    }),
    {
      name: 'eduaccess-auth',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
