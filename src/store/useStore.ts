/**
 * EduAccess - Global State Management
 * Using Zustand for efficient, type-safe state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  VisualProfile,
  SearchResult,
  RemediatedContent,
  RemediationProgress,
  ThemeMode,
  SearchFilters,
  SessionMetrics,
  MetricEvent,
  SnellenNotation,
  VisualPreferences,
} from '@/types';
import {
  calculateTechnicalParameters,
  snellenToLogMAR,
  getSeverityFromLogMAR,
} from '@/types';
import { mockSearchResults } from '@/data/mockData';

interface GlobalState {
  // User and profile
  visualProfile: VisualProfile | null;
  hasCompletedOnboarding: boolean;
  
  // Theme
  currentTheme: ThemeMode;
  
  // Search
  searchQuery: string;
  searchResults: SearchResult[];
  searchLoading: boolean;
  searchError: string | null;
  searchFilters: SearchFilters;
  
  // Current content
  currentContent: SearchResult | null;
  remediatedContent: RemediatedContent | null;
  remediationProgress: RemediationProgress;
  
  // UI state
  sidebarOpen: boolean;
  readingMode: boolean;
  focusModeEnabled: boolean;
  
  // Analytics
  sessionMetrics: SessionMetrics;
  events: MetricEvent[];
  
  // Actions
  setVisualProfile: (profile: VisualProfile) => void;
  updateVisualProfile: (updates: Partial<VisualProfile>) => void;
  completeOnboarding: () => void;
  setTheme: (theme: ThemeMode) => void;
  setSearchQuery: (query: string) => void;
  performSearch: (query: string) => Promise<void>;
  setSearchFilters: (filters: SearchFilters) => void;
  clearFilters: () => void;
  selectContent: (content: SearchResult) => void;
  setRemediatedContent: (content: RemediatedContent | null) => void;
  updateRemediationProgress: (progress: Partial<RemediationProgress>) => void;
  resetRemediationProgress: () => void;
  toggleSidebar: () => void;
  toggleReadingMode: () => void;
  toggleFocusMode: () => void;
  trackEvent: (event: Omit<MetricEvent, 'timestamp'>) => void;
  incrementContentViewed: () => void;
  applyProfileStyles: () => void;
}

const initialRemediationProgress: RemediationProgress = {
  stage: 'idle',
  percentage: 0,
  servicesCompleted: [],
  estimatedTimeRemaining: 0,
};

const initialSessionMetrics: SessionMetrics = {
  sessionId: crypto.randomUUID(),
  startTime: new Date(),
  tasksCompleted: 0,
  contentViewed: 0,
  totalTimeSpent: 0,
  errorEncountered: 0,
};

export const useStore = create<GlobalState>()(
  persist(
    (set, get) => ({
      // Initial state
      visualProfile: null,
      hasCompletedOnboarding: false,
      currentTheme: 'light',
      searchQuery: '',
      searchResults: [],
      searchLoading: false,
      searchError: null,
      searchFilters: {},
      currentContent: null,
      remediatedContent: null,
      remediationProgress: initialRemediationProgress,
      sidebarOpen: true,
      readingMode: false,
      focusModeEnabled: false,
      sessionMetrics: initialSessionMetrics,
      events: [],

      // Actions
      setVisualProfile: (profile) => {
        set({ visualProfile: profile });
        get().applyProfileStyles();
      },

      updateVisualProfile: (updates) => {
        const current = get().visualProfile;
        if (current) {
          const updated = { ...current, ...updates, lastUpdated: new Date() };
          set({ visualProfile: updated });
          get().applyProfileStyles();
        }
      },

      completeOnboarding: () => {
        set({ hasCompletedOnboarding: true });
        get().trackEvent({ type: 'task_complete', details: { task: 'onboarding' } });
      },

      setTheme: (theme) => {
        set({ currentTheme: theme });
        // Apply theme class to document
        const root = document.documentElement;
        root.classList.remove('light', 'dark', 'high-contrast', 'inverted');
        if (theme !== 'light') {
          root.classList.add(theme);
        }
        get().trackEvent({ type: 'theme_change', details: { theme } });
      },

      setSearchQuery: (query) => set({ searchQuery: query }),

      performSearch: async (query) => {
        set({ searchLoading: true, searchError: null, searchQuery: query });
        get().trackEvent({ type: 'search', details: { query } });

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 800));

        try {
          const filters = get().searchFilters;
          let results = mockSearchResults;

          // Apply search query filter
          if (query.trim()) {
            const lowerQuery = query.toLowerCase();
            results = results.filter(
              (r) =>
                r.title.toLowerCase().includes(lowerQuery) ||
                r.description.toLowerCase().includes(lowerQuery) ||
                r.metadata.tags.some((t) => t.toLowerCase().includes(lowerQuery))
            );
          }

          // Apply content type filter
          if (filters.contentType?.length) {
            results = results.filter((r) => filters.contentType!.includes(r.contentType));
          }

          // Apply education level filter
          if (filters.educationLevel?.length) {
            results = results.filter((r) => filters.educationLevel!.includes(r.educationLevel));
          }

          // Apply source filter
          if (filters.source?.length) {
            results = results.filter((r) => filters.source!.includes(r.source));
          }

          // Apply accessibility status filter
          if (filters.accessibilityStatus?.length) {
            results = results.filter((r) =>
              filters.accessibilityStatus!.includes(r.accessibilityStatus)
            );
          }

          set({ searchResults: results, searchLoading: false });
        } catch (error) {
          set({
            searchError: 'Failed to search content. Please try again.',
            searchLoading: false,
          });
          get().trackEvent({ type: 'error', details: { error: 'search_failed' } });
        }
      },

      setSearchFilters: (filters) => {
        set({ searchFilters: filters });
        // Re-run search with new filters
        const query = get().searchQuery;
        if (query || Object.keys(filters).length > 0) {
          get().performSearch(query);
        }
      },

      clearFilters: () => {
        set({ searchFilters: {} });
        const query = get().searchQuery;
        if (query) {
          get().performSearch(query);
        }
      },

      selectContent: (content) => {
        set({ currentContent: content, remediatedContent: null });
        get().resetRemediationProgress();
        get().trackEvent({ type: 'click', details: { contentId: content.id } });
      },

      setRemediatedContent: (content) => set({ remediatedContent: content }),

      updateRemediationProgress: (progress) => {
        set((state) => ({
          remediationProgress: { ...state.remediationProgress, ...progress },
        }));
      },

      resetRemediationProgress: () => {
        set({ remediationProgress: initialRemediationProgress });
      },

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      toggleReadingMode: () => set((state) => ({ readingMode: !state.readingMode })),

      toggleFocusMode: () => set((state) => ({ focusModeEnabled: !state.focusModeEnabled })),

      trackEvent: (event) => {
        const fullEvent: MetricEvent = { ...event, timestamp: new Date() };
        set((state) => ({ events: [...state.events, fullEvent] }));
      },

      incrementContentViewed: () => {
        set((state) => ({
          sessionMetrics: {
            ...state.sessionMetrics,
            contentViewed: state.sessionMetrics.contentViewed + 1,
          },
        }));
      },

      applyProfileStyles: () => {
        const profile = get().visualProfile;
        const theme = get().currentTheme;
        const root = document.documentElement;
        
        if (profile) {
          // Apply font size and line height from preferences
          root.style.setProperty('--profile-font-size', `${profile.preferences.fontSize}px`);
          root.style.setProperty('--profile-line-height', String(profile.preferences.lineSpacing));
          root.style.setProperty(
            '--animation-duration',
            profile.preferences.enableAnimations ? '300ms' : '0ms'
          );
          
          // Apply theme from profile contrast setting
          const profileTheme = profile.preferences.contrast === 'high' ? 'high-contrast' 
            : profile.preferences.contrast === 'inverted' ? 'inverted' 
            : 'light';
          root.classList.remove('light', 'dark', 'high-contrast', 'inverted');
          if (profileTheme !== 'light') {
            root.classList.add(profileTheme);
          }
          
          console.log('✅ Visual profile applied:', {
            fontSize: `${profile.preferences.fontSize}px`,
            lineHeight: profile.preferences.lineSpacing,
            theme: profileTheme,
            animations: profile.preferences.enableAnimations
          });
        } else if (theme !== 'light') {
          // Apply theme even without profile
          root.classList.remove('light', 'dark', 'high-contrast', 'inverted');
          root.classList.add(theme);
        }
      },
    }),
    {
      name: 'eduaccess-storage',
      partialize: (state) => ({
        visualProfile: state.visualProfile,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        currentTheme: state.currentTheme,
      }),
    }
  )
);

// Helper hook for creating profiles
export function createVisualProfile(
  userName: string,
  snellen: SnellenNotation,
  preferences: VisualPreferences
): VisualProfile {
  const logMAR = snellenToLogMAR(snellen);
  const severity = getSeverityFromLogMAR(logMAR);
  const technicalParameters = calculateTechnicalParameters(snellen, preferences);

  return {
    id: crypto.randomUUID(),
    userName,
    visualAcuity: { snellen, logMAR, severity },
    preferences,
    technicalParameters,
    createdAt: new Date(),
    lastUpdated: new Date(),
  };
}
