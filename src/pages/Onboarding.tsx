/**
 * EduAccess - Onboarding Page
 * 5-step visual profile wizard with live preview
 * WCAG 2.1 AA Compliant
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { snellenToLogMAR, getSeverityFromLogMAR, recommendedPreferencesForSnellen } from '@/types';
import { configureSpeech, warmSpeechVoices } from '@/lib/speech';
import { LearningModalitySample } from '@/components/LearningModalitySample';
import { useOnboardingPreview } from '@/hooks/useOnboardingPreview';

const snellenOptions: SnellenNotation[] = ['6/6', '6/12', '6/18', '6/24', '6/36', '6/60'];

export default function Onboarding() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { setVisualProfile, completeOnboarding, setTheme, visualProfile } = useStore();
  const { currentUser, updateUserName, isAuthenticated } = useAuthStore();
  // "Reconfigure visual profile" starts from defaults instead of the saved profile.
  const [searchParams] = useSearchParams();
  const isReset = searchParams.get('reset') === '1';
  const saved = isReset ? null : visualProfile;
  
  const [currentStep, setCurrentStep] = useState(1);
  const [userName, setUserName] = useState(currentUser?.name || '');
  const [snellen, setSnellen] = useState<SnellenNotation>((saved?.visualAcuity?.snellen as SnellenNotation) ?? '6/12');
  const [fontSize, setFontSize] = useState(saved?.preferences.fontSize ?? 20);
  const [lineSpacing, setLineSpacing] = useState(saved?.preferences.lineSpacing ?? 1.75);
  const [contrast, setContrast] = useState<ContrastMode>(saved?.preferences.contrast ?? 'normal');
  const [modality, setModality] = useState<PreferredModality>(saved?.preferences.preferredModality ?? 'visual');
  const [enableAnimations, setEnableAnimations] = useState(saved?.preferences.enableAnimations ?? true);
  const [brightnessSensitivity, setBrightnessSensitivity] = useState<BrightnessSensitivity>(saved?.preferences.brightnessSensitivity ?? 'low');
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);

  // TTS demo function using browser speechSynthesis
  const playTTSDemo = async (modalityValue: PreferredModality) => {
    if (modalityValue === 'visual') return;
    if (!window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const lang = i18n.language.startsWith('es') ? 'es' : 'en';
    const demoText = lang === 'es' 
      ? 'El sol calienta el agua, que se evapora y forma nubes. Cuando se enfría, cae como lluvia y vuelve a los ríos y al mar.'
      : 'The sun warms the water, which evaporates and forms clouds. As it cools, it falls as rain and returns to rivers and the sea.';
    
    const utterance = new SpeechSynthesisUtterance(demoText);
    await configureSpeech(utterance, lang);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    setIsPlayingDemo(true);
    utterance.onend = () => setIsPlayingDemo(false);
    utterance.onerror = () => setIsPlayingDemo(false);
    
    window.speechSynthesis.speak(utterance);
  };

  // Handle modality change with audio demo
  const handleModalityChange = (value: PreferredModality) => {
    setModality(value);
    if (value === 'audio' || value === 'mixed') {
      playTTSDemo(value);
    } else {
      window.speechSynthesis.cancel();
      setIsPlayingDemo(false);
    }
  };

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

  useOnboardingPreview(fontSize, lineSpacing, contrast, enableAnimations, brightnessSensitivity);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    warmSpeechVoices();
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const handleNext = () => {
    window.speechSynthesis?.cancel();
    setIsPlayingDemo(false);
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    window.speechSynthesis?.cancel();
    setIsPlayingDemo(false);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
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

    // Save profile to database
    if (currentUser) {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { error } = await supabase.from('profiles').upsert({
          user_id: currentUser.id,
          user_name: finalName,
          visual_preferences: profile.preferences as any,
          has_completed_onboarding: true,
          current_theme: themeMode,
        } as any, { onConflict: 'user_id' });
        if (error) throw error;
        console.log('✅ Profile saved to database');
      } catch (err) {
        console.warn('Could not save profile to DB:', err);
      }
    }
    
    navigate('/dashboard');
  };

  const logMAR = snellenToLogMAR(snellen);
  const severity = getSeverityFromLogMAR(logMAR);

  // Get current preview values for dynamic styling
  const currentFontSizePx = `${fontSize}px`;
  const currentLineHeightVal = lineSpacing;

  return (
    <div 
      className="min-h-[100dvh] bg-background flex flex-col items-center justify-start md:justify-center p-4 pb-[calc(2rem+env(safe-area-inset-bottom))] md:p-8 onboarding-page"
      style={{
        fontSize: currentFontSizePx,
        lineHeight: currentLineHeightVal,
      }}
    >
      {/* Skip link for accessibility */}
      <a href="#main-content" className="skip-link">
        {t('common.skipToMain')}
      </a>

      {/* Language selector */}
      <div className="w-full max-w-2xl flex justify-end mb-4">
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
            <Sparkles style={{ width: '1.5em', height: '1.5em' }} className="text-primary" aria-hidden="true" />
            <h1 
              className="font-bold text-foreground"
              style={{ fontSize: `calc(${currentFontSizePx} * 1.75)` }}
            >
              {t('common.appName')}
            </h1>
          </motion.div>
          <p 
            className="text-muted-foreground"
            style={{ fontSize: `calc(${currentFontSizePx} * 0.875)` }}
          >
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
          <p 
            className="text-center text-muted-foreground mt-4" 
            style={{ fontSize: `calc(${currentFontSizePx} * 0.75)` }}
            aria-live="polite"
          >
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
                    <h2 className="font-semibold mb-2" style={{ fontSize: `calc(${currentFontSizePx} * 1.5)` }}>
                      {t('onboarding.step1.title')}
                    </h2>
                    <p className="text-muted-foreground" style={{ fontSize: currentFontSizePx }}>
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
                    <Select value={snellen} onValueChange={(v) => {
                      const next = v as SnellenNotation;
                      setSnellen(next);
                      const rec = recommendedPreferencesForSnellen(next);
                      setFontSize(rec.fontSize);
                      setLineSpacing(rec.lineSpacing);
                      setContrast(rec.contrast);
                    }}>
                      <SelectTrigger id="snellen" className="text-lg h-auto min-h-12 py-3 whitespace-normal text-left leading-snug [&>span]:line-clamp-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {snellenOptions.map((option) => (
                          <SelectItem key={option} value={option} className="text-lg py-3 whitespace-normal leading-snug">
                            {option} {option === '6/6' && t('onboarding.step1.normalVision')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground leading-relaxed break-words">
                      ℹ️ {t('onboarding.step1.tooltip')}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed break-words">
                      {t('onboarding.step1.autoAdjust')}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary/50 space-y-2 leading-relaxed break-words">
                    <p className="text-sm">
                      <strong>{t('onboarding.step1.calculatedValues')}</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">{t('onboarding.step1.logMAR')}: {logMAR.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">{t('onboarding.step1.severity')}: {severity}</p>
                  </div>
                </div>
              )}

              {/* Step 2: Font Size */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-semibold mb-2" style={{ fontSize: `calc(${currentFontSizePx} * 1.5)` }}>
                      {t('onboarding.step2.title')}
                    </h2>
                    <p className="text-muted-foreground" style={{ fontSize: currentFontSizePx }}>
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
                    <h2 className="font-semibold mb-2" style={{ fontSize: `calc(${currentFontSizePx} * 1.5)` }}>
                      {t('onboarding.step3.title')}
                    </h2>
                    <p className="text-muted-foreground" style={{ fontSize: currentFontSizePx }}>
                      {t('onboarding.step3.description')}
                    </p>
                  </div>

                  <RadioGroup 
                    value={contrast} 
                    onValueChange={(v) => setContrast(v as ContrastMode)}
                    className="space-y-4"
                    style={{ fontSize: '1em' }}
                  >
                    {[
                      { value: 'normal', id: 'contrast-normal', title: t('onboarding.step3.normal'), desc: t('onboarding.step3.normalDesc') },
                      { value: 'high', id: 'contrast-high', title: t('onboarding.step3.high'), desc: t('onboarding.step3.highDesc') },
                      { value: 'inverted', id: 'contrast-inverted', title: t('onboarding.step3.inverted'), desc: t('onboarding.step3.invertedDesc') },
                    ].map((option) => (
                      <label
                        key={option.value}
                        htmlFor={option.id}
                        className={`
                          flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer
                          transition-all duration-200
                          ${contrast === option.value 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                          }
                        `}
                        style={{ fontSize: '1em', padding: '1em' }}
                      >
                        <RadioGroupItem 
                          value={option.value} 
                          id={option.id}
                          className="sr-only"
                        />
                        <div 
                          className={`
                            rounded-full border-2 flex items-center justify-center shrink-0 mt-1
                            ${contrast === option.value 
                              ? 'border-primary' 
                              : 'border-muted-foreground'
                            }
                          `}
                          style={{ width: '1.25em', height: '1.25em' }}
                          aria-hidden="true"
                        >
                          {contrast === option.value && (
                            <div 
                              className="rounded-full bg-primary"
                              style={{ width: '0.625em', height: '0.625em' }}
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <span className="font-semibold block" style={{ fontSize: '1.1em', lineHeight: 1.3 }}>
                            {option.title}
                          </span>
                          <p className="text-muted-foreground" style={{ fontSize: '0.9em', lineHeight: 1.4, marginTop: '0.25em' }}>
                            {option.desc}
                          </p>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {/* Step 4: Modality */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-semibold mb-2" style={{ fontSize: `calc(${currentFontSizePx} * 1.5)` }}>
                      {t('onboarding.step4.title')}
                    </h2>
                    <p className="text-muted-foreground" style={{ fontSize: currentFontSizePx }}>
                      {t('onboarding.step4.description')}
                    </p>
                  </div>

                  <RadioGroup 
                    value={modality} 
                    onValueChange={(v) => handleModalityChange(v as PreferredModality)}
                    className="space-y-4"
                    style={{ fontSize: '1em' }}
                  >
                    {[
                      { value: 'visual', id: 'modality-visual', title: t('onboarding.step4.visual'), desc: t('onboarding.step4.visualDesc') },
                      { value: 'audio', id: 'modality-audio', title: t('onboarding.step4.audio'), desc: t('onboarding.step4.audioDesc') },
                      { value: 'mixed', id: 'modality-mixed', title: t('onboarding.step4.mixed'), desc: t('onboarding.step4.mixedDesc') },
                    ].map((option) => (
                      <label
                        key={option.value}
                        htmlFor={option.id}
                        className={`
                          flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer
                          transition-all duration-200
                          ${modality === option.value 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                          }
                        `}
                        style={{ fontSize: '1em', padding: '1em' }}
                      >
                        <RadioGroupItem 
                          value={option.value} 
                          id={option.id}
                          className="sr-only"
                        />
                        <div 
                          className={`
                            rounded-full border-2 flex items-center justify-center shrink-0 mt-1
                            ${modality === option.value 
                              ? 'border-primary' 
                              : 'border-muted-foreground'
                            }
                          `}
                          style={{ width: '1.25em', height: '1.25em' }}
                          aria-hidden="true"
                        >
                          {modality === option.value && (
                            <div 
                              className="rounded-full bg-primary"
                              style={{ width: '0.625em', height: '0.625em' }}
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <span className="font-semibold block" style={{ fontSize: '1.1em', lineHeight: 1.3 }}>
                            {option.title}
                          </span>
                          <p className="text-muted-foreground" style={{ fontSize: '0.9em', lineHeight: 1.4, marginTop: '0.25em' }}>
                            {option.desc}
                          </p>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>

                  {/* Audio demo feedback */}
                  <LearningModalitySample modality={modality} playing={isPlayingDemo}
                    onPlay={() => playTTSDemo(modality)}
                    onStop={() => { window.speechSynthesis?.cancel(); setIsPlayingDemo(false); }} />
                  {isPlayingDemo && (modality === 'audio' || modality === 'mixed') && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/30"
                      style={{ fontSize: '1em' }}
                    >
                      <Volume2 className="text-primary animate-pulse" style={{ width: '1.5em', height: '1.5em' }} />
                      <span className="text-primary font-medium" style={{ fontSize: '0.95em' }}>
                        {t('onboarding.step4.title').startsWith('Modalidad') 
                          ? '🔊 Reproduciendo demostración de texto a voz...'
                          : '🔊 Playing text-to-speech demo...'}
                      </span>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Step 5: Additional Options */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-semibold mb-2" style={{ fontSize: `calc(${currentFontSizePx} * 1.5)` }}>
                      {t('onboarding.step5.title')}
                    </h2>
                    <p className="text-muted-foreground" style={{ fontSize: currentFontSizePx }}>
                      {t('onboarding.step5.description')}
                    </p>
                  </div>

                  <div className="space-y-6" style={{ fontSize: '1em' }}>
                    <div className="flex flex-wrap items-center gap-5 rounded-lg border-2 border-border bg-card p-5">
                      <div className="min-w-0 flex-1 basis-64">
                        <Label 
                          htmlFor="animations" 
                          className="font-semibold block cursor-pointer"
                          style={{ fontSize: '1.1em', lineHeight: 1.3 }}
                        >
                          {t('onboarding.step5.animations')}
                        </Label>
                        <p 
                          className="text-muted-foreground"
                          style={{ 
                            fontSize: '0.9em', 
                            lineHeight: 1.4, 
                            marginTop: '0.25em',
                          }}
                        >
                          {t('onboarding.step5.animationsDesc')}
                        </p>
                      </div>
                      <div className="shrink-0 p-3">
                        <Switch
                          id="animations"
                          checked={enableAnimations}
                          onCheckedChange={setEnableAnimations}
                        />
                      </div>
                    </div>

                    <div className="animation-sample space-y-3 border-y border-border py-5" data-animated={enableAnimations} aria-live="polite">
                      <p className="font-semibold text-primary">
                        {enableAnimations
                          ? (i18n.language.startsWith('es') ? 'Movimiento activado: los avisos aparecen y se desvanecen' : 'Motion on: notices slide in and fade out')
                          : (i18n.language.startsWith('es') ? 'Movimiento desactivado: los avisos se quedan quietos' : 'Motion off: notices stay still')}
                      </p>
                      <div className="animation-sample-card flex items-center gap-3 rounded-lg border-2 border-primary bg-primary/10 p-4 font-semibold">
                        <Check className="animation-sample-icon text-primary shrink-0" aria-hidden="true" />
                        <span>{i18n.language.startsWith('es') ? 'Lección completada' : 'Lesson completed'}</span>
                      </div>
                    </div>

                    <div className="space-y-4" style={{ fontSize: '1em' }}>
                      <Label style={{ fontSize: '1em' }}>{t('onboarding.step5.brightness')}</Label>
                      <RadioGroup 
                        value={brightnessSensitivity} 
                        onValueChange={(v) => setBrightnessSensitivity(v as BrightnessSensitivity)}
                        className="flex flex-wrap gap-3"
                        style={{ fontSize: '1em' }}
                      >
                        {[
                          { value: 'low', id: 'brightness-low', label: t('onboarding.step5.brightnessLow') },
                          { value: 'medium', id: 'brightness-medium', label: t('onboarding.step5.brightnessMedium') },
                          { value: 'high', id: 'brightness-high', label: t('onboarding.step5.brightnessHigh') },
                        ].map((option) => (
                          <label
                            key={option.value}
                            htmlFor={option.id}
                            className={`
                              flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer
                              transition-all duration-200 min-w-fit
                              ${brightnessSensitivity === option.value 
                                ? 'border-primary bg-primary/10 font-semibold' 
                                : 'border-border hover:border-primary/50 hover:bg-muted/50'
                              }
                            `}
                            style={{ fontSize: '1em', lineHeight: 1.4 }}
                          >
                            <RadioGroupItem 
                              value={option.value} 
                              id={option.id}
                              className="sr-only"
                            />
                            <div 
                              className={`
                                w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
                                ${brightnessSensitivity === option.value 
                                  ? 'border-primary' 
                                  : 'border-muted-foreground'
                                }
                              `}
                              style={{ width: '1.25em', height: '1.25em' }}
                              aria-hidden="true"
                            >
                              {brightnessSensitivity === option.value && (
                                <div 
                                  className="rounded-full bg-primary"
                                  style={{ width: '0.625em', height: '0.625em' }}
                                />
                              )}
                            </div>
                            <span style={{ fontSize: '1em' }}>{option.label}</span>
                          </label>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div 
            className="flex flex-wrap justify-between items-stretch mt-8 gap-4"
            style={{ fontSize: currentFontSizePx }}
          >
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="touch-target flex items-center gap-2"
              style={{ 
                fontSize: '1em', 
                padding: '0.75em 1.5em',
                minHeight: '3em',
                flexShrink: 0,
              }}
            >
              <ArrowLeft style={{ width: '1em', height: '1em', flexShrink: 0 }} aria-hidden="true" />
              <span>{t('common.back')}</span>
            </Button>

            {currentStep < 5 ? (
              <Button 
                onClick={handleNext} 
                className="touch-target flex items-center gap-2"
                style={{ 
                  fontSize: '1em', 
                  padding: '0.75em 1.5em',
                  minHeight: '3em',
                }}
              >
                <span>{t('common.next')}</span>
                <ArrowRight style={{ width: '1em', height: '1em', flexShrink: 0 }} aria-hidden="true" />
              </Button>
            ) : (
              <button 
                onClick={handleComplete} 
                className="touch-target"
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5em',
                  fontSize: '1em', 
                  padding: '1em 1.5em',
                  minHeight: '3.5em',
                  width: '100%',
                  maxWidth: '400px',
                  backgroundColor: '#16A34A',
                  color: 'white',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  lineHeight: 1.3,
                  flexWrap: 'wrap',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                }}
              >
                <Check style={{ width: '1.25em', height: '1.25em', flexShrink: 0 }} aria-hidden="true" />
                <span style={{ 
                  wordBreak: 'break-word', 
                  overflowWrap: 'break-word',
                  textAlign: 'center',
                }}>
                  {t('onboarding.complete')}
                </span>
              </button>
            )}
          </div>
        </main>
      </motion.div>
    </div>
  );
}
