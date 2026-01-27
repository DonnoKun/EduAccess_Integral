/**
 * EduAccess - Content Viewer Page
 * Adapted content display with reading aids and accessibility features
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
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
  Settings2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useStore } from '@/store/useStore';
import type { ThemeMode } from '@/types';

export default function ContentViewer() {
  const navigate = useNavigate();
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSimplified, setShowSimplified] = useState(false);
  const [focusedParagraph, setFocusedParagraph] = useState<number | null>(null);

  useEffect(() => {
    if (!hasCompletedOnboarding) {
      navigate('/onboarding');
      return;
    }
    
    if (!currentContent) {
      navigate('/search');
    }
  }, [currentContent, hasCompletedOnboarding, navigate]);

  useEffect(() => {
    document.documentElement.style.setProperty('--profile-font-size', `${fontSize}px`);
  }, [fontSize]);

  const handleFontSizeChange = (delta: number) => {
    setFontSize((prev) => Math.min(48, Math.max(16, prev + delta)));
  };

  const toggleAudio = () => {
    setIsPlaying(!isPlaying);
    // In real implementation, this would control TTS playback
  };

  const handleParagraphClick = (index: number) => {
    if (focusModeEnabled) {
      setFocusedParagraph(focusedParagraph === index ? null : index);
    }
  };

  if (!currentContent) return null;

  const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
    { value: 'high-contrast', label: 'High Contrast', icon: <Contrast className="h-4 w-4" /> },
  ];

  // Sample content paragraphs (in real app, this would come from remediated content)
  const contentParagraphs = [
    'This educational content has been optimized for accessibility. The text has been enhanced with proper formatting, alt-text has been added to images, and audio narration is available.',
    'Key concepts are presented in a clear and structured manner, making it easier to understand and retain the information. Complex terms have been simplified where possible.',
    remediatedContent?.remediatedElements?.simplifiedText?.simplifiedText || 
    'The content includes visual aids and diagrams that have been described for screen reader users. All interactive elements are keyboard accessible.',
    'You can adjust the font size, enable focus mode to reduce distractions, or listen to the audio version of this content. These accessibility features ensure an optimal learning experience.',
    'Research shows that personalized accessibility settings significantly improve learning outcomes for students with visual impairments. This system adapts to your specific needs based on your visual profile.',
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Skip link */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/search', { replace: true })}>
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            Back to Search
          </Button>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Change theme">
                  {currentTheme === 'dark' ? (
                    <Moon className="h-4 w-4" />
                  ) : currentTheme === 'high-contrast' ? (
                    <Contrast className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
              aria-label="Toggle reading guide"
              aria-pressed={readingGuideEnabled}
            >
              <Eye className="h-4 w-4" />
            </Button>

            <Button variant="outline" size="icon" aria-label="Settings">
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Content Header */}
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold mb-2">
                    {currentContent.title}
                  </h1>
                  <p className="text-muted-foreground">
                    {currentContent.source.charAt(0).toUpperCase() + currentContent.source.slice(1)}
                    {currentContent.metadata.duration && ` · ${currentContent.metadata.duration}`}
                    {currentContent.metadata.wordCount && ` · ${currentContent.metadata.wordCount.toLocaleString()} words`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" aria-label="Bookmark">
                    <Bookmark className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" aria-label="Share">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Remediation Status */}
          {remediatedContent && (
            <Card className="bg-success/10 border-success/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="h-5 w-5 text-success" aria-hidden="true" />
                  <span className="font-semibold text-success">Remediation Complete</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Services: {remediatedContent.metricsSummary.servicesUsed.join(', ')}
                  {' · '}Confidence: {remediatedContent.metricsSummary.averageConfidence}%
                  {' · '}Time: {(remediatedContent.metricsSummary.totalProcessingTimeMs / 1000).toFixed(1)}s
                </p>
              </CardContent>
            </Card>
          )}

          {/* Quick Adjustments */}
          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
                Quick Adjustments
              </h2>
              <div className="flex flex-wrap items-center gap-4">
                {/* Font Size */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleFontSizeChange(-2)}
                    aria-label="Decrease font size"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[60px] text-center text-sm">{fontSize}px</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleFontSizeChange(2)}
                    aria-label="Increase font size"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>

                <div className="h-6 w-px bg-border" aria-hidden="true" />

                {/* Audio */}
                <Button
                  variant={isPlaying ? 'default' : 'outline'}
                  onClick={toggleAudio}
                  aria-pressed={isPlaying}
                >
                  {isPlaying ? (
                    <>
                      <VolumeX className="h-4 w-4 mr-2" aria-hidden="true" />
                      Stop Audio
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4 mr-2" aria-hidden="true" />
                      Listen
                    </>
                  )}
                </Button>

                <div className="h-6 w-px bg-border" aria-hidden="true" />

                {/* Focus Mode */}
                <div className="flex items-center gap-2">
                  <Switch
                    id="focus-mode"
                    checked={focusModeEnabled}
                    onCheckedChange={toggleFocusMode}
                  />
                  <Label htmlFor="focus-mode" className="flex items-center gap-1">
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    Focus Mode
                  </Label>
                </div>

                <div className="h-6 w-px bg-border" aria-hidden="true" />

                {/* Simplified Toggle */}
                <div className="flex items-center gap-2">
                  <Switch
                    id="simplified"
                    checked={showSimplified}
                    onCheckedChange={setShowSimplified}
                  />
                  <Label htmlFor="simplified" className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    Simplified
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardContent className={`p-6 md:p-8 content-adaptive ${focusModeEnabled ? 'focus-mode' : ''}`}>
              <article>
                {contentParagraphs.map((paragraph, index) => (
                  <motion.p
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleParagraphClick(index)}
                    className={`
                      mb-6 cursor-pointer transition-all duration-300
                      ${focusModeEnabled && focusedParagraph !== null && focusedParagraph !== index
                        ? 'opacity-30 blur-[1px]'
                        : ''
                      }
                      ${focusModeEnabled && focusedParagraph === index
                        ? 'bg-primary/10 -mx-4 px-4 py-2 rounded-lg'
                        : ''
                      }
                    `}
                    style={{
                      fontSize: `${fontSize}px`,
                      lineHeight: visualProfile?.preferences.lineSpacing || 1.75,
                    }}
                  >
                    {paragraph}
                  </motion.p>
                ))}

                {/* Image with Alt-text */}
                {remediatedContent?.remediatedElements?.imageDescriptions?.[0] && (
                  <figure className="my-8">
                    <div className="bg-muted rounded-lg p-8 flex items-center justify-center">
                      <span className="text-4xl" aria-hidden="true">📊</span>
                    </div>
                    <figcaption className="mt-2 text-sm text-muted-foreground italic">
                      <strong>Alt-text:</strong> {remediatedContent.remediatedElements.imageDescriptions[0].altText}
                    </figcaption>
                  </figure>
                )}
              </article>
            </CardContent>
          </Card>

          {/* Audio Player */}
          {remediatedContent?.remediatedElements?.audioNarration && isPlaying && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Button variant="default" size="icon" onClick={toggleAudio}>
                    <VolumeX className="h-4 w-4" />
                  </Button>
                  <div className="flex-1">
                    <Slider
                      defaultValue={[0]}
                      max={100}
                      step={1}
                      aria-label="Audio progress"
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    0:00 / {Math.floor(remediatedContent.remediatedElements.audioNarration.duration / 60)}:
                    {String(remediatedContent.remediatedElements.audioNarration.duration % 60).padStart(2, '0')}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-4 justify-center">
            <Button variant="outline" onClick={() => navigate('/search')}>
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              Back to Search
            </Button>
            <Button>
              <Check className="h-4 w-4 mr-2" aria-hidden="true" />
              Mark as Completed
            </Button>
            <Button variant="secondary">
              <Bookmark className="h-4 w-4 mr-2" aria-hidden="true" />
              Save to Library
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
