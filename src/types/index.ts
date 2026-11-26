/**
 * EduAccess - Core Type Definitions
 * Doctoral Thesis Implementation
 * Based on ISO/IEC 24751 and research by Michael (2024), Jeanneret & Baudet (2022)
 */

// ===== VISUAL PROFILE TYPES =====

export type SnellenNotation = '6/6' | '6/12' | '6/18' | '6/24' | '6/36' | '6/60';
export type ContrastMode = 'normal' | 'high' | 'inverted';
export type PreferredModality = 'visual' | 'audio' | 'mixed';
export type BrightnessSensitivity = 'low' | 'medium' | 'high';
export type VisualSeverity = 'normal' | 'mild' | 'moderate';
export type ThemeMode = 'light' | 'dark' | 'high-contrast' | 'inverted';

export interface VisualAcuity {
  snellen: SnellenNotation;
  logMAR: number;
  severity: VisualSeverity;
}

export interface VisualPreferences {
  fontSize: number;
  contrast: ContrastMode;
  lineSpacing: number;
  preferredModality: PreferredModality;
  enableAnimations: boolean;
  brightnessSensitivity: BrightnessSensitivity;
}

export interface TechnicalParameters {
  fontSizeCSS: string;
  lineHeightCSS: string;
  contrastRatio: number;
  enableTTS: boolean;
  animationDuration: number;
}

export interface VisualProfile {
  id: string;
  userName: string;
  visualAcuity: VisualAcuity;
  preferences: VisualPreferences;
  technicalParameters: TechnicalParameters;
  createdAt: Date;
  lastUpdated: Date;
}

// ===== SEARCH & CONTENT TYPES =====

export type ContentSource = 'youtube' | 'khan' | 'openstax' | 'wikipedia' | 'oer' | 'arxiv';
export type ContentType = 'video' | 'article' | 'textbook' | 'exercise' | 'diagram';
export type EducationLevel = 'elementary' | 'middle' | 'high' | 'college';
export type AccessibilityStatus = 'accessible' | 'needs_remediation' | 'partially_accessible';

export interface ContentMetadata {
  duration?: string;
  wordCount?: number;
  pageCount?: number;
  language: string;
  author?: string;
  publishDate?: Date;
  tags: string[];
}

export interface SearchResult {
  pinned?: boolean;
  lastOpenedAt?: string;
  lessonContent?: import('@/lib/courses').LessonContent;
  id: string;
  title: string;
  source: ContentSource;
  url: string;
  description: string;
  contentType: ContentType;
  educationLevel: EducationLevel;
  metadata: ContentMetadata;
  accessibilityStatus: AccessibilityStatus;
  accessibilityIssues?: string[];
  thumbnail?: string;
  license?: string;
}

export interface SearchFilters {
  contentType?: ContentType[];
  educationLevel?: EducationLevel[];
  source?: ContentSource[];
  accessibilityStatus?: AccessibilityStatus[];
  language?: string;
}

// ===== REMEDIATION TYPES =====

export type RemediationStage = 
  | 'idle' 
  | 'analyzing' 
  | 'ocr' 
  | 'alt-text' 
  | 'tts' 
  | 'simplification' 
  | 'complete';

export interface OCRResult {
  extractedText: string;
  confidence: number;
  language: string;
  processingTimeMs: number;
}

export interface ImageDescription {
  altText: string;
  detailedDescription?: string;
  containsText: boolean;
  confidence: number;
  processingTimeMs: number;
}

export interface TTSResult {
  audioURL: string;
  duration: number;
  format: 'mp3' | 'ogg' | 'wav';
  voice: string;
  speed: number;
  processingTimeMs: number;
}

export interface SimplificationResult {
  originalText: string;
  simplifiedText: string;
  readingLevel: 'elementary' | 'middle' | 'high';
  reductionPercentage: number;
  processingTimeMs: number;
}

export interface TranscriptionResult {
  transcript: string;
  timestampedSegments: Array<{
    startTime: number;
    endTime: number;
    text: string;
  }>;
  language: string;
  confidence: number;
  processingTimeMs: number;
}

export interface RemediatedElements {
  extractedText?: OCRResult;
  imageDescriptions?: ImageDescription[];
  audioNarration?: TTSResult;
  simplifiedText?: SimplificationResult;
  videoTranscript?: TranscriptionResult;
}

export interface MetricsSummary {
  totalProcessingTimeMs: number;
  servicesUsed: string[];
  averageConfidence: number;
  accessibilityScore: number;
}

export interface RemediatedContent {
  originalContentId: string;
  originalURL: string;
  contentType: string;
  remediatedElements: RemediatedElements;
  metricsSummary: MetricsSummary;
  timestamp: Date;
}

export interface RemediationProgress {
  stage: RemediationStage;
  percentage: number;
  servicesCompleted: string[];
  estimatedTimeRemaining: number;
  currentService?: string;
}

// ===== SESSION & ANALYTICS TYPES =====

export interface TaskMetrics {
  taskId: string;
  taskDescription: string;
  startTime: Date;
  endTime?: Date;
  completionTimeSeconds?: number;
  successful: boolean;
  errorsEncountered: number;
  helpRequested: boolean;
}

export interface SessionMetrics {
  sessionId: string;
  startTime: Date;
  tasksCompleted: number;
  contentViewed: number;
  totalTimeSpent: number;
  errorEncountered: number;
}

export interface MetricEvent {
  type: 'click' | 'search' | 'remediate' | 'theme_change' | 'error' | 'task_complete' | 'navigation';
  timestamp: Date;
  details: Record<string, unknown>;
}

// ===== ONBOARDING TYPES =====

export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

// ===== UTILITY FUNCTIONS =====

/**
 * Convert Snellen notation to logMAR value
 * Based on: Labiris et al., 2021
 */
export function snellenToLogMAR(snellen: SnellenNotation): number {
  const values: Record<SnellenNotation, number> = {
    '6/6': 0.0,
    '6/12': 0.3,
    '6/18': 0.48,
    '6/24': 0.6,
    '6/36': 0.78,
    '6/60': 1.0,
  };
  return values[snellen];
}

/**
 * Get severity classification from logMAR value
 */
export function getSeverityFromLogMAR(logMAR: number): VisualSeverity {
  if (logMAR <= 0.1) return 'normal';
  if (logMAR <= 0.5) return 'mild';
  return 'moderate';
}

/**
 * Calculate CSS parameters from visual profile
 */
export function calculateTechnicalParameters(
  snellen: SnellenNotation,
  preferences: Partial<VisualPreferences>
): TechnicalParameters {
  const logMAR = snellenToLogMAR(snellen);
  
  // Font size calculation based on logMAR
  const baseFontSizes: Record<SnellenNotation, number> = {
    '6/6': 16,
    '6/12': 20,
    '6/18': 28,
    '6/24': 32,
    '6/36': 40,
    '6/60': 48,
  };
  
  const baseLineHeights: Record<SnellenNotation, number> = {
    '6/6': 1.5,
    '6/12': 1.75,
    '6/18': 2.0,
    '6/24': 2.25,
    '6/36': 2.5,
    '6/60': 3.0,
  };
  
  const fontSize = preferences.fontSize ?? baseFontSizes[snellen];
  const lineHeight = preferences.lineSpacing ?? baseLineHeights[snellen];
  
  return {
    fontSizeCSS: `${fontSize}px`,
    lineHeightCSS: String(lineHeight),
    contrastRatio: preferences.contrast === 'high' ? 21.0 : preferences.contrast === 'inverted' ? 7.0 : 4.5,
    enableTTS: preferences.preferredModality === 'audio' || preferences.preferredModality === 'mixed',
    animationDuration: preferences.enableAnimations === false ? 0 : 300,
  };
}

/**
 * Map contrast preference to theme mode
 */
export function contrastToTheme(contrast: ContrastMode, preferDark: boolean = false): ThemeMode {
  if (contrast === 'high') return 'high-contrast';
  if (contrast === 'inverted') return 'inverted';
  return preferDark ? 'dark' : 'light';
}

/**
 * Starting display settings suggested by Snellen acuity; the user may still adjust them.
 */
export function recommendedPreferencesForSnellen(snellen: SnellenNotation): {
  fontSize: number; lineSpacing: number; contrast: ContrastMode;
} {
  const table: Record<SnellenNotation, { fontSize: number; lineSpacing: number; contrast: ContrastMode }> = {
    '6/6': { fontSize: 18, lineSpacing: 1.5, contrast: 'normal' },
    '6/12': { fontSize: 22, lineSpacing: 1.75, contrast: 'normal' },
    '6/18': { fontSize: 26, lineSpacing: 1.8, contrast: 'normal' },
    '6/24': { fontSize: 30, lineSpacing: 2, contrast: 'high' },
    '6/36': { fontSize: 36, lineSpacing: 2, contrast: 'high' },
    '6/60': { fontSize: 44, lineSpacing: 2, contrast: 'high' },
  };
  return table[snellen];
}
