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
import { supabase } from '@/integrations/supabase/client';

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
  readingGuideEnabled: boolean;
  
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
  toggleReadingGuide: () => void;
  resetReadingGuide: () => void;
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
      readingGuideEnabled: false,
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
        console.log('🎨 Theme change requested:', theme);
        
        // Apply theme to document IMMEDIATELY before state update
        const root = document.documentElement;
        root.classList.remove('light', 'dark', 'high-contrast', 'inverted');
        root.setAttribute('data-theme', theme);
        
        // Add class for themes that need it
        if (theme !== 'light') {
          root.classList.add(theme);
        }
        
        // Update state
        set({ currentTheme: theme });
        
        // Update visual profile if exists, preserving font settings
        const profile = get().visualProfile;
        if (profile) {
          const contrastValue = theme === 'high-contrast' ? 'high' 
            : theme === 'inverted' ? 'inverted' 
            : 'normal';  // Both light and dark use 'normal' contrast
          set({
            visualProfile: {
              ...profile,
              preferences: {
                ...profile.preferences,
                contrast: contrastValue as 'normal' | 'high' | 'inverted',
              },
            },
          });
        }
        
        get().trackEvent({ type: 'theme_change', details: { theme } });
        console.log('✅ Theme changed to:', theme, 'class:', root.classList.toString());
      },

      setSearchQuery: (query) => set({ searchQuery: query }),

      performSearch: async (query) => {
        set({ searchLoading: true, searchError: null, searchQuery: query });
        get().trackEvent({ type: 'search', details: { query } });

        try {
          const filters = get().searchFilters;
          const profile = get().visualProfile;
          const lang = profile?.preferences ? 'es' : 'es'; // Default to Spanish

          // Try AI-powered search first
          console.log('🔍 Calling AI search for:', query);
          const { data, error } = await supabase.functions.invoke('search-content', {
            body: { 
              query: query || 'educational content', 
              filters: {
                contentType: filters.contentType,
                educationLevel: filters.educationLevel,
                source: filters.source,
                language: lang,
              },
              language: lang,
            },
          });

          if (error) {
            console.warn('⚠️ AI search failed, falling back to mock data:', error);
            // Fallback to mock data
            let results = mockSearchResults;
            if (query.trim()) {
              const lowerQuery = query.toLowerCase();
              results = results.filter(
                (r) =>
                  r.title.toLowerCase().includes(lowerQuery) ||
                  r.description.toLowerCase().includes(lowerQuery) ||
                  r.metadata.tags.some((t) => t.toLowerCase().includes(lowerQuery))
              );
            }
            set({ searchResults: results, searchLoading: false });
            return;
          }

          if (data?.success && data?.results?.length > 0) {
            console.log('✅ AI search returned', data.results.length, 'results');
            
            // Map AI results to SearchResult type, adding color based on source
            const sourceColors: Record<string, string> = {
              youtube: '#FF0000',
              khan: '#14BF96',
              openstax: '#F47B20',
              wikipedia: '#333333',
              oer: '#2196F3',
              arxiv: '#B31B1B',
            };

            const aiResults: SearchResult[] = data.results.map((r: any) => ({
              ...r,
              color: r.color || sourceColors[r.source] || '#6366F1',
              thumbnail: r.thumbnail || `https://placehold.co/320x180/${(sourceColors[r.source] || '#6366F1').replace('#', '')}/FFFFFF?text=${encodeURIComponent(r.title.split(' ').slice(0, 2).join('+'))}`,
            }));

            // Apply local filters if needed
            let results = aiResults;
            if (filters.contentType?.length) {
              results = results.filter((r) => filters.contentType!.includes(r.contentType));
            }
            if (filters.educationLevel?.length) {
              results = results.filter((r) => filters.educationLevel!.includes(r.educationLevel));
            }
            if (filters.accessibilityStatus?.length) {
              results = results.filter((r) => filters.accessibilityStatus!.includes(r.accessibilityStatus));
            }

            set({ searchResults: results, searchLoading: false });
          } else {
            console.warn('⚠️ AI search returned no results, using mock data');
            let results = mockSearchResults;
            if (query.trim()) {
              const lowerQuery = query.toLowerCase();
              results = results.filter(
                (r) =>
                  r.title.toLowerCase().includes(lowerQuery) ||
                  r.description.toLowerCase().includes(lowerQuery) ||
                  r.metadata.tags.some((t) => t.toLowerCase().includes(lowerQuery))
              );
            }
            set({ searchResults: results, searchLoading: false });
          }
        } catch (error) {
          console.error('Search error:', error);
          // Fallback to mock data on any error
          let results = mockSearchResults;
          if (query.trim()) {
            const lowerQuery = query.toLowerCase();
            results = results.filter(
              (r) =>
                r.title.toLowerCase().includes(lowerQuery) ||
                r.description.toLowerCase().includes(lowerQuery) ||
                r.metadata.tags.some((t) => t.toLowerCase().includes(lowerQuery))
            );
          }
          set({ searchResults: results, searchLoading: false });
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

      toggleReadingGuide: () => set((state) => ({ readingGuideEnabled: !state.readingGuideEnabled })),

      resetReadingGuide: () => set({ readingGuideEnabled: false }),

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
          // Add data attribute to enable high-specificity CSS styles
          root.setAttribute('data-user-profile', 'active');
          
          // Apply font size and line height from preferences
          root.style.setProperty('--profile-font-size', `${profile.preferences.fontSize}px`);
          root.style.setProperty('--profile-line-height', String(profile.preferences.lineSpacing));
          root.style.setProperty(
            '--animation-duration',
            profile.preferences.enableAnimations ? '300ms' : '0ms'
          );
          
          // Apply brightness sensitivity
          const brightnessMap: Record<string, string> = {
            'low': '1',
            'medium': '0.85',
            'high': '0.7',
          };
          const brightnessValue = brightnessMap[profile.preferences.brightnessSensitivity] || '1';
          root.style.setProperty('--brightness-filter', brightnessValue);
          root.style.filter = `brightness(${brightnessValue})`;
          
          console.log('✅ Visual profile applied:', {
            fontSize: `${profile.preferences.fontSize}px`,
            lineHeight: profile.preferences.lineSpacing,
            theme: theme,
            animations: profile.preferences.enableAnimations,
            brightness: profile.preferences.brightnessSensitivity,
          });
        } else {
          // Remove data attribute when no profile
          root.removeAttribute('data-user-profile');
          root.style.removeProperty('--brightness-filter');
          root.style.filter = '';
        }
        
        // Apply theme from currentTheme (independent of profile contrast)
        root.classList.remove('light', 'dark', 'high-contrast', 'inverted');
        root.setAttribute('data-theme', theme);
        if (theme !== 'light') {
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
        readingGuideEnabled: state.readingGuideEnabled,
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
