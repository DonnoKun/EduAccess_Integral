/**
 * EduAccess - Content Viewer Page
 * Displays AI-generated educational content with TTS, focus mode, and accessibility features
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  Eye,
  BookOpen,
  Sun,
  Moon,
  Contrast,
  Check,
  Bookmark,
  Share2,
  Sparkles,
  GraduationCap,
  Lightbulb,
  PenTool,
  ListChecks,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStore } from '@/store/useStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ThemeMode } from '@/types';

interface CourseSection {
  title: string;
  content: string;
  keyPoints?: string[];
}

interface CourseExample {
  title: string;
  description: string;
}

interface CourseExercise {
  question: string;
  hint?: string;
}

interface CourseContent {
  introduction: string;
  sections: CourseSection[];
  examples: CourseExample[];
  exercises: CourseExercise[];
  summary: string;
}

export default function ContentViewer() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { contentId } = useParams<{ contentId: string }>();
  const {
    currentContent,
    remediatedContent,
    visualProfile,
    currentTheme,
    setTheme,
    focusModeEnabled,
    toggleFocusMode,
    hasCompletedOnboarding,
    readingGuideEnabled,
    toggleReadingGuide,
  } = useStore();

  const [fontSize, setFontSize] = useState(visualProfile?.preferences.fontSize || 20);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSimplified, setShowSimplified] = useState(false);
  const [focusedSection, setFocusedSection] = useState<number | null>(null);
  const [courseContent, setCourseContent] = useState<CourseContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState(0);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const lang = i18n.language?.split('-')[0] || 'es';
  const isAudioEnabled =
    visualProfile?.preferences?.preferredModality === 'audio' ||
    visualProfile?.preferences?.preferredModality === 'mixed';

  useEffect(() => {
    if (!hasCompletedOnboarding) {
      navigate('/onboarding');
      return;
    }
    if (!currentContent) {
      navigate('/search');
    }
  }, [currentContent, hasCompletedOnboarding, navigate]);

  // Fetch course content from AI
  useEffect(() => {
    if (!currentContent) return;

    let cancelled = false;

    const fetchCourseContent = async () => {
      setIsLoading(true);
      setLoadingStage(0);

      // Animate loading stages
      const stageInterval = setInterval(() => {
        if (!cancelled) {
          setLoadingStage((prev) => Math.min(prev + 1, 4));
        }
      }, 2000);

      try {
        const { data, error } = await supabase.functions.invoke('generate-course-content', {
          body: {
            title: currentContent.title,
            description: currentContent.description,
            contentType: currentContent.contentType,
            source: currentContent.source,
            language: lang,
          },
        });

        clearInterval(stageInterval);

        if (cancelled) return;

        if (error) throw new Error(error.message);

        if (data?.success && data?.content) {
          setCourseContent(data.content);
        } else {
          throw new Error(data?.error || 'No content returned');
        }
      } catch (err) {
        clearInterval(stageInterval);
        if (cancelled) return;

        console.error('Error fetching course content:', err);
        // Fallback: create basic content from description
        setCourseContent({
          introduction: currentContent.description,
          sections: [
            {
              title: currentContent.title,
              content: currentContent.description,
              keyPoints: [],
            },
          ],
          examples: [],
          exercises: [],
          summary: currentContent.description,
        });
        toast.error(
          lang === 'es'
            ? 'Error generando contenido completo. Mostrando información básica.'
            : 'Error generating full content. Showing basic info.'
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchCourseContent();

    return () => {
      cancelled = true;
    };
  }, [currentContent, lang]);

  // Apply font size
  useEffect(() => {
    document.documentElement.style.setProperty('--profile-font-size', `${fontSize}px`);
  }, [fontSize]);

  // Initialize speechSynthesis
  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    return () => {
      synthRef.current?.cancel();
    };
  }, []);

  const handleFontSizeChange = (delta: number) => {
    setFontSize((prev) => Math.min(48, Math.max(16, prev + delta)));
  };

  const toggleSpeech = useCallback(() => {
    const synth = synthRef.current;
    if (!synth) return;

    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!courseContent) return;

    // Build text to read
    let textToRead = courseContent.introduction + '. ';
    courseContent.sections.forEach((section) => {
      textToRead += section.title + '. ' + section.content + '. ';
    });
    if (courseContent.summary) {
      textToRead += courseContent.summary;
    }

    // Split into chunks (speechSynthesis has character limits on some browsers)
    const maxChunkSize = 200;
    const sentences = textToRead.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let current = '';

    sentences.forEach((sentence) => {
      if ((current + sentence).length > maxChunkSize && current.length > 0) {
        chunks.push(current.trim());
        current = sentence + ' ';
      } else {
        current += sentence + ' ';
      }
    });
    if (current.trim()) chunks.push(current.trim());

    let chunkIndex = 0;
    const speakNext = () => {
      if (chunkIndex >= chunks.length) {
        setIsSpeaking(false);
        toast.success(
          lang === 'es' ? 'Lectura completada' : 'Reading complete'
        );
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
      utterance.lang = lang === 'es' ? 'es-ES' : 'en-US';
      utterance.rate = 0.9;
      utterance.onend = () => {
        chunkIndex++;
        speakNext();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
      };
      synth.speak(utterance);
    };

    setIsSpeaking(true);
    toast.info(
      lang === 'es' ? '🔊 Leyendo contenido en voz alta...' : '🔊 Reading content aloud...'
    );
    speakNext();
  }, [isSpeaking, courseContent, lang]);

  const handleSectionClick = (index: number) => {
    if (focusModeEnabled) {
      setFocusedSection(focusedSection === index ? null : index);
    }
  };

  if (!currentContent) return null;

  const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: t('themes.light'), icon: <Sun className="h-4 w-4" /> },
    { value: 'dark', label: t('themes.dark'), icon: <Moon className="h-4 w-4" /> },
    {
      value: 'high-contrast',
      label: t('themes.highContrast'),
      icon: <Contrast className="h-4 w-4" />,
    },
  ];

  const loadingMessages =
    lang === 'es'
      ? [
          '🔍 Analizando el tema...',
          '📖 Generando contenido educativo...',
          '💡 Creando ejemplos prácticos...',
          '✏️ Preparando ejercicios...',
          '✅ Finalizando lección...',
        ]
      : [
          '🔍 Analyzing the topic...',
          '📖 Generating educational content...',
          '💡 Creating practical examples...',
          '✏️ Preparing exercises...',
          '✅ Finalizing lesson...',
        ];

  const contentStyle = {
    fontSize: `${fontSize}px`,
    lineHeight: visualProfile?.preferences.lineSpacing || 1.75,
  };

  return (
    <div className="min-h-screen bg-background">
      <a href="#main-content" className="skip-link">
        {t('common.skipToMain')}
      </a>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/search', { replace: true })}>
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            {lang === 'es' ? 'Volver a Búsqueda' : 'Back to Search'}
          </Button>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label={t('navigation.changeTheme')}>
                  {currentTheme === 'dark' ? (
                    <Moon className="h-4 w-4" />
                  ) : currentTheme === 'high-contrast' ? (
                    <Contrast className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background border">
                {themeOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className="flex items-center gap-2"
                  >
                    {option.icon}
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant={readingGuideEnabled ? 'default' : 'outline'}
              size="icon"
              onClick={toggleReadingGuide}
              aria-label={lang === 'es' ? 'Guía de lectura' : 'Reading guide'}
              aria-pressed={readingGuideEnabled}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Content Header */}
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold mb-2">{currentContent.title}</h1>
                  <p className="text-muted-foreground">
                    {currentContent.source.charAt(0).toUpperCase() + currentContent.source.slice(1)}
                    {currentContent.metadata.duration && ` · ${currentContent.metadata.duration}`}
                    {currentContent.metadata.wordCount &&
                      ` · ${currentContent.metadata.wordCount.toLocaleString()} ${lang === 'es' ? 'palabras' : 'words'}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" aria-label={lang === 'es' ? 'Guardar' : 'Bookmark'}>
                    <Bookmark className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" aria-label={lang === 'es' ? 'Compartir' : 'Share'}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Remediation Status (if coming from remediation flow) */}
          {remediatedContent && (
            <Card className="bg-green-500/10 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="h-5 w-5 text-green-600" aria-hidden="true" />
                  <span className="font-semibold text-green-600">
                    {lang === 'es' ? 'Remediación Completada' : 'Remediation Complete'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {lang === 'es' ? 'Servicios' : 'Services'}:{' '}
                  {remediatedContent.metricsSummary.servicesUsed.join(', ')} ·{' '}
                  {lang === 'es' ? 'Confianza' : 'Confidence'}:{' '}
                  {remediatedContent.metricsSummary.averageConfidence}% ·{' '}
                  {lang === 'es' ? 'Tiempo' : 'Time'}:{' '}
                  {(remediatedContent.metricsSummary.totalProcessingTimeMs / 1000).toFixed(1)}s
                </p>
              </CardContent>
            </Card>
          )}

          {/* Quick Adjustments */}
          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
                {lang === 'es' ? 'Ajustes Rápidos' : 'Quick Adjustments'}
              </h2>
              <div className="flex flex-wrap items-center gap-4">
                {/* Font Size */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => handleFontSizeChange(-2)} aria-label={lang === 'es' ? 'Reducir fuente' : 'Decrease font'}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[60px] text-center text-sm">{fontSize}px</span>
                  <Button variant="outline" size="icon" onClick={() => handleFontSizeChange(2)} aria-label={lang === 'es' ? 'Aumentar fuente' : 'Increase font'}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>

                <div className="h-6 w-px bg-border" aria-hidden="true" />

                {/* TTS Audio */}
                <Button
                  variant={isSpeaking ? 'default' : 'outline'}
                  onClick={toggleSpeech}
                  aria-pressed={isSpeaking}
                  disabled={isLoading}
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="h-4 w-4 mr-2" aria-hidden="true" />
                      {lang === 'es' ? 'Detener Audio' : 'Stop Audio'}
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4 mr-2" aria-hidden="true" />
                      {lang === 'es' ? 'Escuchar' : 'Listen'}
                    </>
                  )}
                </Button>

                <div className="h-6 w-px bg-border" aria-hidden="true" />

                {/* Focus Mode */}
                <div className="flex items-center gap-2">
                  <Switch id="focus-mode" checked={focusModeEnabled} onCheckedChange={toggleFocusMode} />
                  <Label htmlFor="focus-mode" className="flex items-center gap-1">
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    {lang === 'es' ? 'Modo Enfoque' : 'Focus Mode'}
                  </Label>
                </div>

                <div className="h-6 w-px bg-border" aria-hidden="true" />

                {/* Simplified Toggle */}
                <div className="flex items-center gap-2">
                  <Switch id="simplified" checked={showSimplified} onCheckedChange={setShowSimplified} />
                  <Label htmlFor="simplified" className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    {lang === 'es' ? 'Simplificado' : 'Simplified'}
                  </Label>
                </div>
              </div>

              {/* Audio hint for Audio/Mixed modality users */}
              {isAudioEnabled && !isLoading && (
                <p className="text-sm text-primary mt-3 flex items-center gap-1">
                  <Volume2 className="h-4 w-4" />
                  {lang === 'es'
                    ? 'Tu modalidad incluye audio. Presiona "Escuchar" para que el contenido se lea en voz alta.'
                    : 'Your modality includes audio. Press "Listen" to have the content read aloud.'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Loading State */}
          {isLoading && (
            <Card>
              <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center py-8 gap-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="h-12 w-12 text-primary" />
                  </motion.div>

                  <div className="text-center">
                    <p className="text-lg font-semibold text-primary mb-1">
                      {loadingMessages[Math.min(loadingStage, loadingMessages.length - 1)]}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {lang === 'es'
                        ? 'Generando contenido educativo con IA...'
                        : 'Generating educational content with AI...'}
                    </p>
                  </div>

                  {/* Loading steps */}
                  <div className="w-full max-w-sm space-y-2">
                    {loadingMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 text-sm transition-opacity ${
                          i <= loadingStage ? 'opacity-100' : 'opacity-30'
                        }`}
                      >
                        {i < loadingStage ? (
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : i === loadingStage ? (
                          <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border border-muted-foreground/30 flex-shrink-0" />
                        )}
                        <span>{msg}</span>
                      </div>
                    ))}
                  </div>

                  {/* Skeleton preview */}
                  <div className="w-full space-y-3 mt-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                    <Skeleton className="h-20 w-full mt-4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Course Content */}
          {!isLoading && courseContent && (
            <div className="space-y-6">
              {/* Introduction */}
              <Card>
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-center gap-2 mb-4">
                    <GraduationCap className="h-6 w-6 text-primary" />
                    <h2 className="text-xl font-bold">
                      {lang === 'es' ? 'Introducción' : 'Introduction'}
                    </h2>
                  </div>
                  <p style={contentStyle}>{courseContent.introduction}</p>
                </CardContent>
              </Card>

              {/* Sections */}
              {courseContent.sections.map((section, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className={`cursor-pointer transition-all duration-300 ${
                      focusModeEnabled && focusedSection !== null && focusedSection !== index
                        ? 'opacity-30 blur-[1px]'
                        : ''
                    } ${focusModeEnabled && focusedSection === index ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => handleSectionClick(index)}
                  >
                    <CardContent className="p-6 md:p-8">
                      <h3 className="text-lg font-bold mb-3 text-primary">{section.title}</h3>
                      <p style={contentStyle} className="mb-4 whitespace-pre-line">
                        {section.content}
                      </p>
                      {section.keyPoints && section.keyPoints.length > 0 && (
                        <div className="bg-primary/5 rounded-lg p-4 mt-4">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <ListChecks className="h-4 w-4 text-primary" />
                            {lang === 'es' ? 'Puntos Clave' : 'Key Points'}
                          </h4>
                          <ul className="space-y-2">
                            {section.keyPoints.map((point, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2"
                                style={{ fontSize: `${fontSize}px` }}
                              >
                                <span className="text-primary mt-1 flex-shrink-0">•</span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              {/* Examples */}
              {courseContent.examples && courseContent.examples.length > 0 && (
                <Card>
                  <CardContent className="p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Lightbulb className="h-6 w-6 text-amber-500" />
                      <h2 className="text-xl font-bold">
                        {lang === 'es' ? 'Ejemplos Prácticos' : 'Practical Examples'}
                      </h2>
                    </div>
                    <div className="space-y-4">
                      {courseContent.examples.map((example, index) => (
                        <div
                          key={index}
                          className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4"
                        >
                          <h4 className="font-semibold mb-2">{example.title}</h4>
                          <p style={contentStyle}>{example.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Exercises */}
              {courseContent.exercises && courseContent.exercises.length > 0 && (
                <Card>
                  <CardContent className="p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-4">
                      <PenTool className="h-6 w-6 text-emerald-500" />
                      <h2 className="text-xl font-bold">
                        {lang === 'es' ? 'Ejercicios de Práctica' : 'Practice Exercises'}
                      </h2>
                    </div>
                    <div className="space-y-4">
                      {courseContent.exercises.map((exercise, index) => (
                        <div
                          key={index}
                          className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4"
                        >
                          <p className="font-medium mb-1" style={{ fontSize: `${fontSize}px` }}>
                            {index + 1}. {exercise.question}
                          </p>
                          {exercise.hint && (
                            <p className="text-sm text-muted-foreground italic mt-2">
                              💡 {lang === 'es' ? 'Pista' : 'Hint'}: {exercise.hint}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                    <Check className="h-6 w-6 text-primary" />
                    {lang === 'es' ? 'Resumen' : 'Summary'}
                  </h2>
                  <p style={contentStyle}>{courseContent.summary}</p>
                </CardContent>
              </Card>

              {/* Remediated image alt-text (if available from remediation) */}
              {remediatedContent?.remediatedElements?.imageDescriptions?.[0] && (
                <Card>
                  <CardContent className="p-6">
                    <figure>
                      <div className="bg-muted rounded-lg p-8 flex items-center justify-center">
                        <span className="text-4xl" aria-hidden="true">
                          📊
                        </span>
                      </div>
                      <figcaption className="mt-2 text-sm text-muted-foreground italic">
                        <strong>Alt-text:</strong>{' '}
                        {remediatedContent.remediatedElements.imageDescriptions[0].altText}
                      </figcaption>
                    </figure>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Actions */}
          {!isLoading && (
            <div className="flex flex-wrap gap-4 justify-center mt-2">
              <Button variant="outline" onClick={() => navigate('/search')}>
                <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
                {lang === 'es' ? 'Volver a Búsqueda' : 'Back to Search'}
              </Button>
              <Button>
                <Check className="h-4 w-4 mr-2" aria-hidden="true" />
                {lang === 'es' ? 'Marcar como Completado' : 'Mark as Completed'}
              </Button>
              <Button variant="secondary">
                <Bookmark className="h-4 w-4 mr-2" aria-hidden="true" />
                {lang === 'es' ? 'Guardar en Biblioteca' : 'Save to Library'}
              </Button>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
