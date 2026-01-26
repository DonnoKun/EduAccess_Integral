/**
 * EduAccess - Onboarding Page
 * 5-step visual profile wizard with live preview
 * WCAG 2.1 AA Compliant
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  Type, 
  Contrast, 
  Volume2, 
  Settings2, 
  ArrowLeft, 
  ArrowRight, 
  Check,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStore, createVisualProfile } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import LanguageSelector from '@/components/LanguageSelector';
import type { 
  SnellenNotation, 
  ContrastMode, 
  PreferredModality, 
  BrightnessSensitivity 
} from '@/types';
import { snellenToLogMAR, getSeverityFromLogMAR } from '@/types';

const snellenOptions: SnellenNotation[] = ['6/6', '6/12', '6/18', '6/24', '6/36', '6/60'];

export default function Onboarding() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setVisualProfile, completeOnboarding, setTheme } = useStore();
  const { currentUser, updateUserName, isAuthenticated } = useAuthStore();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [userName, setUserName] = useState(currentUser?.name || '');
  const [snellen, setSnellen] = useState<SnellenNotation>('6/12');
  const [fontSize, setFontSize] = useState(20);
  const [lineSpacing, setLineSpacing] = useState(1.75);
  const [contrast, setContrast] = useState<ContrastMode>('normal');
  const [modality, setModality] = useState<PreferredModality>('visual');
  const [enableAnimations, setEnableAnimations] = useState(true);
  const [brightnessSensitivity, setBrightnessSensitivity] = useState<BrightnessSensitivity>('low');

  const steps = [
    { id: 1, title: t('onboarding.step1.title'), icon: Eye },
    { id: 2, title: t('onboarding.step2.title'), icon: Type },
    { id: 3, title: t('onboarding.step3.title'), icon: Contrast },
    { id: 4, title: t('onboarding.step4.title'), icon: Volume2 },
    { id: 5, title: t('onboarding.step5.title'), icon: Settings2 },
  ];

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Apply live preview for font size and line spacing - CUMULATIVE across all steps
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--profile-font-size', `${fontSize}px`);
    root.style.setProperty('--profile-line-height', String(lineSpacing));
    console.log('📐 Preview: Font size:', fontSize, 'Line spacing:', lineSpacing);
  }, [fontSize, lineSpacing]);

  // Apply contrast preview - CUMULATIVE across all steps
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'high-contrast', 'inverted');
    
    if (contrast === 'high') {
      root.classList.add('high-contrast');
    } else if (contrast === 'inverted') {
      root.classList.add('inverted');
    }
    console.log('🎨 Preview: Contrast mode:', contrast);
  }, [contrast]);

  // Apply animations preview - CUMULATIVE across all steps
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--animation-duration', enableAnimations ? '300ms' : '0ms');
    console.log('🎬 Preview: Animations:', enableAnimations);
  }, [enableAnimations]);

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    const finalName = userName || 'User';
    const profile = createVisualProfile(finalName, snellen, {
      fontSize,
      contrast,
      lineSpacing,
      preferredModality: modality,
      enableAnimations,
      brightnessSensitivity,
    });
    
    // Update user name in auth store
    if (userName) {
      updateUserName(userName);
    }
    
    // Set profile (this will also apply styles globally)
    setVisualProfile(profile);
    
    // Set the theme based on contrast preference
    const themeMode = contrast === 'high' ? 'high-contrast' 
      : contrast === 'inverted' ? 'inverted' 
      : 'light';
    setTheme(themeMode);
    
    completeOnboarding();
    
    console.log('✅ Onboarding complete - Profile saved:', {
      fontSize: profile.preferences.fontSize,
      lineSpacing: profile.preferences.lineSpacing,
      contrast: profile.preferences.contrast,
      animations: profile.preferences.enableAnimations
    });
    
    navigate('/dashboard');
  };

  const logMAR = snellenToLogMAR(snellen);
  const severity = getSeverityFromLogMAR(logMAR);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8">
      {/* Skip link for accessibility */}
      <a href="#main-content" className="skip-link">
        {t('common.skipToMain')}
      </a>

      {/* Language selector */}
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <header className="text-center mb-8">
          <motion.div 
            className="flex items-center justify-center gap-2 mb-4"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
          >
            <Sparkles className="h-8 w-8 text-primary" aria-hidden="true" />
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {t('common.appName')}
            </h1>
          </motion.div>
          <p className="text-muted-foreground text-lg">
            {t('onboarding.subtitle')}
          </p>
        </header>

        {/* Progress Indicator */}
        <nav aria-label="Onboarding progress" className="mb-8">
          <ol className="flex items-center justify-center gap-2 md:gap-4">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              
              return (
                <li key={step.id} className="flex items-center">
                  <button
                    onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                    disabled={step.id > currentStep}
                    className={`
                      flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full
                      transition-all duration-300 touch-target
                      ${isActive 
                        ? 'bg-primary text-primary-foreground scale-110 shadow-lg' 
                        : isCompleted 
                          ? 'bg-success text-success-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }
                    `}
                    aria-current={isActive ? 'step' : undefined}
                    aria-label={`${t('onboarding.stepOf', { current: step.id, total: 5, name: step.title })}${isCompleted ? ' (completed)' : ''}`}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                  {step.id < 5 && (
                    <div 
                      className={`hidden md:block w-12 h-1 mx-2 rounded ${
                        isCompleted ? 'bg-success' : 'bg-muted'
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ol>
          <p className="text-center text-sm text-muted-foreground mt-4" aria-live="polite">
            {t('onboarding.stepOf', { current: currentStep, total: 5, name: steps[currentStep - 1].title })}
          </p>
        </nav>

        {/* Main Content */}
        <main 
          id="main-content" 
          className="glass-card rounded-2xl p-6 md:p-8 onboarding-content"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step 1: Visual Acuity */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">{t('onboarding.step1.title')}</h2>
                    <p className="text-muted-foreground">
                      {t('onboarding.step1.description')}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="userName">{t('onboarding.step1.nameLabel')}</Label>
                    <Input
                      id="userName"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder={t('onboarding.step1.namePlaceholder')}
                      className="text-lg"
                    />
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="snellen">{t('onboarding.step1.snellenLabel')}</Label>
                    <Select value={snellen} onValueChange={(v) => setSnellen(v as SnellenNotation)}>
                      <SelectTrigger id="snellen" className="text-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {snellenOptions.map((option) => (
                          <SelectItem key={option} value={option} className="text-lg">
                            {option} {option === '6/6' && t('onboarding.step1.normalVision')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      ℹ️ {t('onboarding.step1.tooltip')}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary/50">
                    <p className="text-sm">
                      <strong>{t('onboarding.step1.calculatedValues')}</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('onboarding.step1.logMAR')}: {logMAR.toFixed(2)} · {t('onboarding.step1.severity')}: {severity}
                    </p>
                  </div>
                </div>
              )}

              {/* Step 2: Font Size */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">{t('onboarding.step2.title')}</h2>
                    <p className="text-muted-foreground">
                      {t('onboarding.step2.description')}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <Label>{t('onboarding.step2.fontSizeLabel')}: {fontSize}px</Label>
                      <span className="text-muted-foreground">16px - 48px</span>
                    </div>
                    <Slider
                      value={[fontSize]}
                      onValueChange={([v]) => setFontSize(v)}
                      min={16}
                      max={48}
                      step={2}
                      aria-label={t('onboarding.step2.fontSizeLabel')}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <Label>{t('onboarding.step2.lineSpacingLabel')}: {lineSpacing.toFixed(2)}</Label>
                      <span className="text-muted-foreground">1.5 - 3.0</span>
                    </div>
                    <Slider
                      value={[lineSpacing]}
                      onValueChange={([v]) => setLineSpacing(v)}
                      min={1.5}
                      max={3}
                      step={0.25}
                      aria-label={t('onboarding.step2.lineSpacingLabel')}
                    />
                  </div>

                  {/* Live Preview */}
                  <div 
                    className="p-6 rounded-lg border-2 border-dashed border-border bg-card"
                    aria-label="Text preview"
                    style={{ fontSize: `${fontSize}px`, lineHeight: lineSpacing }}
                  >
                    <p>
                      {t('onboarding.step2.preview')}
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Contrast */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">{t('onboarding.step3.title')}</h2>
                    <p className="text-muted-foreground">
                      {t('onboarding.step3.description')}
                    </p>
                  </div>

                  <RadioGroup 
                    value={contrast} 
                    onValueChange={(v) => setContrast(v as ContrastMode)}
                    className="space-y-4"
                  >
                    <div className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-secondary/50 transition-colors">
                      <RadioGroupItem value="normal" id="contrast-normal" />
                      <Label htmlFor="contrast-normal" className="flex-1 cursor-pointer">
                        <span className="font-medium">{t('onboarding.step3.normal')}</span>
                        <p className="text-sm text-muted-foreground">
                          {t('onboarding.step3.normalDesc')}
                        </p>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-secondary/50 transition-colors">
                      <RadioGroupItem value="high" id="contrast-high" />
                      <Label htmlFor="contrast-high" className="flex-1 cursor-pointer">
                        <span className="font-medium">{t('onboarding.step3.high')}</span>
                        <p className="text-sm text-muted-foreground">
                          {t('onboarding.step3.highDesc')}
                        </p>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-secondary/50 transition-colors">
                      <RadioGroupItem value="inverted" id="contrast-inverted" />
                      <Label htmlFor="contrast-inverted" className="flex-1 cursor-pointer">
                        <span className="font-medium">{t('onboarding.step3.inverted')}</span>
                        <p className="text-sm text-muted-foreground">
                          {t('onboarding.step3.invertedDesc')}
                        </p>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Step 4: Modality */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">{t('onboarding.step4.title')}</h2>
                    <p className="text-muted-foreground">
                      {t('onboarding.step4.description')}
                    </p>
                  </div>

                  <RadioGroup 
                    value={modality} 
                    onValueChange={(v) => setModality(v as PreferredModality)}
                    className="space-y-4"
                  >
                    <div className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-secondary/50 transition-colors">
                      <RadioGroupItem value="visual" id="modality-visual" />
                      <Label htmlFor="modality-visual" className="flex-1 cursor-pointer">
                        <span className="font-medium">{t('onboarding.step4.visual')}</span>
                        <p className="text-sm text-muted-foreground">
                          {t('onboarding.step4.visualDesc')}
                        </p>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-secondary/50 transition-colors">
                      <RadioGroupItem value="audio" id="modality-audio" />
                      <Label htmlFor="modality-audio" className="flex-1 cursor-pointer">
                        <span className="font-medium">{t('onboarding.step4.audio')}</span>
                        <p className="text-sm text-muted-foreground">
                          {t('onboarding.step4.audioDesc')}
                        </p>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-secondary/50 transition-colors">
                      <RadioGroupItem value="mixed" id="modality-mixed" />
                      <Label htmlFor="modality-mixed" className="flex-1 cursor-pointer">
                        <span className="font-medium">{t('onboarding.step4.mixed')}</span>
                        <p className="text-sm text-muted-foreground">
                          {t('onboarding.step4.mixedDesc')}
                        </p>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Step 5: Additional Options */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">{t('onboarding.step5.title')}</h2>
                    <p className="text-muted-foreground">
                      {t('onboarding.step5.description')}
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div>
                        <Label htmlFor="animations" className="font-medium">{t('onboarding.step5.animations')}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t('onboarding.step5.animationsDesc')}
                        </p>
                      </div>
                      <Switch
                        id="animations"
                        checked={enableAnimations}
                        onCheckedChange={setEnableAnimations}
                      />
                    </div>

                    <div className="space-y-4">
                      <Label>{t('onboarding.step5.brightness')}</Label>
                      <RadioGroup 
                        value={brightnessSensitivity} 
                        onValueChange={(v) => setBrightnessSensitivity(v as BrightnessSensitivity)}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="low" id="brightness-low" />
                          <Label htmlFor="brightness-low">{t('onboarding.step5.brightnessLow')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="medium" id="brightness-medium" />
                          <Label htmlFor="brightness-medium">{t('onboarding.step5.brightnessMedium')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="high" id="brightness-high" />
                          <Label htmlFor="brightness-high">{t('onboarding.step5.brightnessHigh')}</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="touch-target"
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('common.back')}
            </Button>

            {currentStep < 5 ? (
              <Button onClick={handleNext} className="touch-target">
                {t('common.next')}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button onClick={handleComplete} className="touch-target bg-success hover:bg-success/90">
                <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('onboarding.complete')}
              </Button>
            )}
          </div>
        </main>
      </motion.div>
    </div>
  );
}
