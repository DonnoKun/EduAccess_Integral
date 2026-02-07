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
  ZoomIn,
  ZoomOut,
  Eye,
  BookOpen,
  Sun,
  Moon,
  Contrast,
  Check,
  Bookmark,
  BookmarkCheck,
  Share2,
  Sparkles,
  GraduationCap,
  Lightbulb,
  PenTool,
  ListChecks,
  Loader2,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
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
import LanguageSelector from '@/components/LanguageSelector';
import AudioPlayer from '@/components/AudioPlayer';
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
  answer?: string;
}

interface CourseSource {
  name: string;
  url: string;
  description: string;
}

interface CourseContent {
  introduction: string;
  sections: CourseSection[];
  examples: CourseExample[];
  exercises: CourseExercise[];
  summary: string;
  sources?: CourseSource[];
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
  const [focusedSection, setFocusedSection] = useState<number | null>(null);
  const [courseContent, setCourseContent] = useState<CourseContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState(0);

  // Functional state
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set());

  const lang = i18n.language?.split('-')[0] || 'es';

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

      const stageInterval = setInterval(() => {
        if (!cancelled) {
          setLoadingStage((prev) => Math.min(prev + 1, 4));
        }
      }, 2500);

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
    return () => { cancelled = true; };
  }, [currentContent, lang]);

  useEffect(() => {
    document.documentElement.style.setProperty('--profile-font-size', `${fontSize}px`);
  }, [fontSize]);

  const handleFontSizeChange = (delta: number) => {
    setFontSize((prev) => Math.min(48, Math.max(16, prev + delta)));
  };

  const handleSectionClick = (index: number) => {
    if (focusModeEnabled) {
      setFocusedSection(focusedSection === index ? null : index);
    }
  };

  const toggleAnswer = (index: number) => {
    setRevealedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleMarkCompleted = () => {
    setIsCompleted((prev) => !prev);
    if (!isCompleted) {
      toast.success(lang === 'es' ? '✅ Marcado como completado' : '✅ Marked as completed');
    }
  };

  const handleSaveToLibrary = () => {
    setIsSaved((prev) => !prev);
    if (!isSaved) {
      toast.success(lang === 'es' ? '📚 Guardado en tu biblioteca' : '📚 Saved to your library');
    } else {
      toast.info(lang === 'es' ? 'Eliminado de tu biblioteca' : 'Removed from your library');
    }
  };

  // Build full text for TTS
  const buildTTSText = useCallback(() => {
    if (!courseContent) return '';
    let text = courseContent.introduction + '. ';
    courseContent.sections.forEach((section) => {
      text += section.title + '. ' + section.content + '. ';
    });
    if (courseContent.summary) {
      text += courseContent.summary;
    }
    return text;
  }, [courseContent]);

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
          '🔍 Analizando el tema en profundidad...',
          '📖 Generando contenido educativo completo...',
          '💡 Creando ejemplos prácticos detallados...',
          '✏️ Preparando ejercicios con soluciones...',
          '✅ Finalizando lección y referencias...',
        ]
      : [
          '🔍 Analyzing the topic in depth...',
          '📖 Generating comprehensive educational content...',
          '💡 Creating detailed practical examples...',
          '✏️ Preparing exercises with solutions...',
          '✅ Finalizing lesson and references...',
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
            {/* Language Selector */}
            <LanguageSelector />

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
                  <Button
                    variant={isSaved ? 'default' : 'outline'}
                    size="icon"
                    onClick={handleSaveToLibrary}
                    aria-label={lang === 'es' ? 'Guardar' : 'Bookmark'}
                  >
                    {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="icon" aria-label={lang === 'es' ? 'Compartir' : 'Share'}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

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

                {/* Focus Mode */}
                <div className="flex items-center gap-2">
                  <Switch id="focus-mode" checked={focusModeEnabled} onCheckedChange={toggleFocusMode} />
                  <Label htmlFor="focus-mode" className="flex items-center gap-1">
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    {lang === 'es' ? 'Modo Enfoque' : 'Focus Mode'}
                  </Label>
                </div>
              </div>

              {/* Audio Player */}
              {!isLoading && courseContent && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    🔊 {lang === 'es' ? 'Reproductor de Audio' : 'Audio Player'}
                  </h3>
                  <AudioPlayer text={buildTTSText()} lang={lang} disabled={isLoading} />
                </div>
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
                        ? 'Generando contenido educativo completo con IA...'
                        : 'Generating comprehensive educational content with AI...'}
                    </p>
                  </div>

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

                  <div className="w-full space-y-3 mt-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                    <Skeleton className="h-20 w-full mt-4" />
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
                  <div style={contentStyle} className="whitespace-pre-line">{courseContent.introduction}</div>
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
                      <div style={contentStyle} className="mb-4 whitespace-pre-line">
                        {section.content}
                      </div>
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
                          <div style={contentStyle} className="whitespace-pre-line">{example.description}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Exercises with Solutions */}
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

                          {/* Reveal Answer Button */}
                          {exercise.answer && (
                            <div className="mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleAnswer(index)}
                                className="gap-2"
                              >
                                {revealedAnswers.has(index) ? (
                                  <>
                                    <ChevronUp className="h-3.5 w-3.5" />
                                    {lang === 'es' ? 'Ocultar Solución' : 'Hide Solution'}
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-3.5 w-3.5" />
                                    {lang === 'es' ? 'Ver Solución' : 'Show Solution'}
                                  </>
                                )}
                              </Button>

                              {revealedAnswers.has(index) && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4"
                                >
                                  <p className="font-semibold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4" />
                                    {lang === 'es' ? 'Solución:' : 'Solution:'}
                                  </p>
                                  <div
                                    style={{ fontSize: `${fontSize}px` }}
                                    className="whitespace-pre-line"
                                  >
                                    {exercise.answer}
                                  </div>
                                </motion.div>
                              )}
                            </div>
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
                  <div style={contentStyle} className="whitespace-pre-line">{courseContent.summary}</div>
                </CardContent>
              </Card>

              {/* Sources & Reliability Section */}
              {courseContent.sources && courseContent.sources.length > 0 && (
                <Card className="border-blue-500/20">
                  <CardContent className="p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-4">
                      <ShieldCheck className="h-6 w-6 text-blue-500" />
                      <h2 className="text-xl font-bold">
                        {lang === 'es' ? 'Fuentes y Fiabilidad' : 'Sources & Reliability'}
                      </h2>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {lang === 'es'
                        ? 'Este contenido fue generado por IA a partir de fuentes educativas verificadas. Te recomendamos consultar las fuentes originales para profundizar en el tema.'
                        : 'This content was AI-generated from verified educational sources. We recommend consulting the original sources for deeper exploration.'}
                    </p>
                    <div className="space-y-3">
                      {courseContent.sources.map((source, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/15 rounded-lg p-4"
                        >
                          <ExternalLink className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {source.name}
                            </a>
                            <p className="text-sm text-muted-foreground mt-1">{source.description}</p>
                            <p className="text-xs text-muted-foreground/70 mt-1 truncate">{source.url}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground flex items-start gap-2">
                        <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
                        {lang === 'es'
                          ? 'Nota: El contenido es generado por inteligencia artificial con fines educativos. Aunque se basa en fuentes confiables, siempre verifica la información con las fuentes originales para tareas académicas o profesionales.'
                          : 'Note: Content is AI-generated for educational purposes. While based on reliable sources, always verify information with original sources for academic or professional work.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Remediated image alt-text (if available) */}
              {remediatedContent?.remediatedElements?.imageDescriptions?.[0] && (
                <Card>
                  <CardContent className="p-6">
                    <figure>
                      <div className="bg-muted rounded-lg p-8 flex items-center justify-center">
                        <span className="text-4xl" aria-hidden="true">📊</span>
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

          {/* Action Buttons */}
          {!isLoading && (
            <div className="flex flex-wrap gap-4 justify-center mt-2">
              <Button variant="outline" onClick={() => navigate('/search')}>
                <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
                {lang === 'es' ? 'Volver a Búsqueda' : 'Back to Search'}
              </Button>
              <Button
                variant={isCompleted ? 'default' : 'outline'}
                onClick={handleMarkCompleted}
                className={isCompleted ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 mr-2" aria-hidden="true" />
                ) : (
                  <Check className="h-4 w-4 mr-2" aria-hidden="true" />
                )}
                {isCompleted
                  ? (lang === 'es' ? 'Completado ✓' : 'Completed ✓')
                  : (lang === 'es' ? 'Marcar como Completado' : 'Mark as Completed')}
              </Button>
              <Button
                variant={isSaved ? 'default' : 'secondary'}
                onClick={handleSaveToLibrary}
              >
                {isSaved ? (
                  <BookmarkCheck className="h-4 w-4 mr-2" aria-hidden="true" />
                ) : (
                  <Bookmark className="h-4 w-4 mr-2" aria-hidden="true" />
                )}
                {isSaved
                  ? (lang === 'es' ? 'Guardado ✓' : 'Saved ✓')
                  : (lang === 'es' ? 'Guardar en Biblioteca' : 'Save to Library')}
              </Button>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
