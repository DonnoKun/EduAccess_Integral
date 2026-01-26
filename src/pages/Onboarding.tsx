/**
 * EduAccess - Onboarding Page
 * 5-step visual profile wizard with live preview
 * WCAG 2.1 AA Compliant
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import type { 
  SnellenNotation, 
  ContrastMode, 
  PreferredModality, 
  BrightnessSensitivity 
} from '@/types';
import { snellenToLogMAR, getSeverityFromLogMAR } from '@/types';

const steps = [
  { id: 1, title: 'Visual Acuity', icon: Eye },
  { id: 2, title: 'Font Size', icon: Type },
  { id: 3, title: 'Contrast', icon: Contrast },
  { id: 4, title: 'Modality', icon: Volume2 },
  { id: 5, title: 'Additional', icon: Settings2 },
];

const snellenOptions: SnellenNotation[] = ['6/6', '6/12', '6/18', '6/24', '6/36', '6/60'];

export default function Onboarding() {
  const navigate = useNavigate();
  const { setVisualProfile, completeOnboarding, setTheme } = useStore();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [userName, setUserName] = useState('');
  const [snellen, setSnellen] = useState<SnellenNotation>('6/12');
  const [fontSize, setFontSize] = useState(20);
  const [lineSpacing, setLineSpacing] = useState(1.75);
  const [contrast, setContrast] = useState<ContrastMode>('normal');
  const [modality, setModality] = useState<PreferredModality>('visual');
  const [enableAnimations, setEnableAnimations] = useState(true);
  const [brightnessSensitivity, setBrightnessSensitivity] = useState<BrightnessSensitivity>('low');

  // Apply live preview
  useEffect(() => {
    document.documentElement.style.setProperty('--profile-font-size', `${fontSize}px`);
    document.documentElement.style.setProperty('--profile-line-height', String(lineSpacing));
  }, [fontSize, lineSpacing]);

  // Apply contrast preview
  useEffect(() => {
    if (contrast === 'high') {
      setTheme('high-contrast');
    } else if (contrast === 'inverted') {
      setTheme('inverted');
    } else {
      setTheme('light');
    }
  }, [contrast, setTheme]);

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
    const profile = createVisualProfile(userName || 'User', snellen, {
      fontSize,
      contrast,
      lineSpacing,
      preferredModality: modality,
      enableAnimations,
      brightnessSensitivity,
    });
    
    setVisualProfile(profile);
    completeOnboarding();
    navigate('/dashboard');
  };

  const logMAR = snellenToLogMAR(snellen);
  const severity = getSeverityFromLogMAR(logMAR);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8">
      {/* Skip link for accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

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
              EduAccess
            </h1>
          </motion.div>
          <p className="text-muted-foreground text-lg">
            Configure your visual profile for an optimized experience
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
                    aria-label={`Step ${step.id}: ${step.title}${isCompleted ? ' (completed)' : ''}`}
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
            Step {currentStep} of 5: {steps[currentStep - 1].title}
          </p>
        </nav>

        {/* Main Content */}
        <main 
          id="main-content" 
          className="glass-card rounded-2xl p-6 md:p-8"
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
                    <h2 className="text-2xl font-semibold mb-2">Visual Acuity</h2>
                    <p className="text-muted-foreground">
                      Select your Snellen notation from your eye exam. This helps us optimize text display.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="userName">Your Name</Label>
                    <Input
                      id="userName"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Enter your name"
                      className="text-lg"
                    />
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="snellen">Snellen Notation</Label>
                    <Select value={snellen} onValueChange={(v) => setSnellen(v as SnellenNotation)}>
                      <SelectTrigger id="snellen" className="text-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {snellenOptions.map((option) => (
                          <SelectItem key={option} value={option} className="text-lg">
                            {option} {option === '6/6' && '(Normal vision)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      ℹ️ This measure comes from your optometrist or eye doctor
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary/50">
                    <p className="text-sm">
                      <strong>Calculated Values:</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      logMAR: {logMAR.toFixed(2)} · Severity: {severity}
                    </p>
                  </div>
                </div>
              )}

              {/* Step 2: Font Size */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">Font Size Preference</h2>
                    <p className="text-muted-foreground">
                      Adjust the text size to your comfort. The preview below updates in real-time.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <Label>Font Size: {fontSize}px</Label>
                      <span className="text-muted-foreground">16px - 48px</span>
                    </div>
                    <Slider
                      value={[fontSize]}
                      onValueChange={([v]) => setFontSize(v)}
                      min={16}
                      max={48}
                      step={2}
                      aria-label="Font size"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <Label>Line Spacing: {lineSpacing.toFixed(2)}</Label>
                      <span className="text-muted-foreground">1.5 - 3.0</span>
                    </div>
                    <Slider
                      value={[lineSpacing]}
                      onValueChange={([v]) => setLineSpacing(v)}
                      min={1.5}
                      max={3}
                      step={0.25}
                      aria-label="Line spacing"
                    />
                  </div>

                  {/* Live Preview */}
                  <div 
                    className="p-6 rounded-lg border-2 border-dashed border-border bg-card"
                    aria-label="Text preview"
                    style={{ fontSize: `${fontSize}px`, lineHeight: lineSpacing }}
                  >
                    <p>
                      The quick brown fox jumps over the lazy dog. This text will appear at your selected size and spacing.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Contrast */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">Contrast Mode</h2>
                    <p className="text-muted-foreground">
                      Choose a contrast setting that works best for your vision.
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
                        <span className="font-medium">Normal</span>
                        <p className="text-sm text-muted-foreground">
                          Standard contrast ratio (4.5:1)
                        </p>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-secondary/50 transition-colors">
                      <RadioGroupItem value="high" id="contrast-high" />
                      <Label htmlFor="contrast-high" className="flex-1 cursor-pointer">
                        <span className="font-medium">High Contrast</span>
                        <p className="text-sm text-muted-foreground">
                          Maximum contrast (21:1) - Yellow on black
                        </p>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-secondary/50 transition-colors">
                      <RadioGroupItem value="inverted" id="contrast-inverted" />
                      <Label htmlFor="contrast-inverted" className="flex-1 cursor-pointer">
                        <span className="font-medium">Inverted</span>
                        <p className="text-sm text-muted-foreground">
                          Warm colors for light sensitivity (photophobia)
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
                    <h2 className="text-2xl font-semibold mb-2">Preferred Modality</h2>
                    <p className="text-muted-foreground">
                      How would you prefer to consume educational content?
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
                        <span className="font-medium">Visual</span>
                        <p className="text-sm text-muted-foreground">
                          I prefer reading text and viewing diagrams
                        </p>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-secondary/50 transition-colors">
                      <RadioGroupItem value="audio" id="modality-audio" />
                      <Label htmlFor="modality-audio" className="flex-1 cursor-pointer">
                        <span className="font-medium">Audio</span>
                        <p className="text-sm text-muted-foreground">
                          I prefer listening to content with text-to-speech
                        </p>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-secondary/50 transition-colors">
                      <RadioGroupItem value="mixed" id="modality-mixed" />
                      <Label htmlFor="modality-mixed" className="flex-1 cursor-pointer">
                        <span className="font-medium">Mixed</span>
                        <p className="text-sm text-muted-foreground">
                          I want both visual and audio options available
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
                    <h2 className="text-2xl font-semibold mb-2">Additional Options</h2>
                    <p className="text-muted-foreground">
                      Fine-tune your experience with these accessibility settings.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div>
                        <Label htmlFor="animations" className="font-medium">Enable Animations</Label>
                        <p className="text-sm text-muted-foreground">
                          Smooth transitions and micro-interactions
                        </p>
                      </div>
                      <Switch
                        id="animations"
                        checked={enableAnimations}
                        onCheckedChange={setEnableAnimations}
                      />
                    </div>

                    <div className="space-y-4">
                      <Label>Brightness Sensitivity</Label>
                      <RadioGroup 
                        value={brightnessSensitivity} 
                        onValueChange={(v) => setBrightnessSensitivity(v as BrightnessSensitivity)}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="low" id="brightness-low" />
                          <Label htmlFor="brightness-low">Low</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="medium" id="brightness-medium" />
                          <Label htmlFor="brightness-medium">Medium</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="high" id="brightness-high" />
                          <Label htmlFor="brightness-high">High</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  {/* Profile Summary */}
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <h3 className="font-semibold mb-2">Profile Summary</h3>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>👤 Name: {userName || 'User'}</li>
                      <li>👁️ Visual Acuity: {snellen} (logMAR: {logMAR.toFixed(2)})</li>
                      <li>🔤 Font Size: {fontSize}px</li>
                      <li>🎨 Contrast: {contrast}</li>
                      <li>🔊 Modality: {modality}</li>
                      <li>✨ Animations: {enableAnimations ? 'Enabled' : 'Disabled'}</li>
                    </ul>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="touch-target"
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back
            </Button>

            {currentStep < 5 ? (
              <Button onClick={handleNext} className="touch-target">
                Next
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button onClick={handleComplete} className="touch-target bg-success hover:bg-success/90">
                <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                Complete Setup
              </Button>
            )}
          </div>
        </main>
      </motion.div>
    </div>
  );
}
