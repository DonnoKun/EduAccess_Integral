/**
 * EduAccess - Settings Page
 * Full profile customization and preferences
 */

import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Palette,
  Accessibility,
  Database,
  Info,
  ArrowLeft,
  Sparkles,
  Sun,
  Moon,
  Contrast,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useStore } from '@/store/useStore';
import type { ThemeMode, ContrastMode } from '@/types';

export default function Settings() {
  const navigate = useNavigate();
  const {
    visualProfile,
    hasCompletedOnboarding,
    currentTheme,
    setTheme,
    updateVisualProfile,
    events,
    sessionMetrics,
  } = useStore();

  useEffect(() => {
    if (!hasCompletedOnboarding) {
      navigate('/onboarding');
    }
  }, [hasCompletedOnboarding, navigate]);

  if (!visualProfile) return null;

  const handleFontSizeChange = (value: number[]) => {
    updateVisualProfile({
      preferences: {
        ...visualProfile.preferences,
        fontSize: value[0],
      },
      technicalParameters: {
        ...visualProfile.technicalParameters,
        fontSizeCSS: `${value[0]}px`,
      },
    });
  };

  const handleLineSpacingChange = (value: number[]) => {
    updateVisualProfile({
      preferences: {
        ...visualProfile.preferences,
        lineSpacing: value[0],
      },
      technicalParameters: {
        ...visualProfile.technicalParameters,
        lineHeightCSS: String(value[0]),
      },
    });
  };

  const handleContrastChange = (value: ContrastMode) => {
    updateVisualProfile({
      preferences: {
        ...visualProfile.preferences,
        contrast: value,
      },
    });
    
    // Update theme to match contrast
    if (value === 'high') {
      setTheme('high-contrast');
    } else if (value === 'inverted') {
      setTheme('inverted');
    } else {
      setTheme('light');
    }
  };

  const handleAnimationsChange = (enabled: boolean) => {
    updateVisualProfile({
      preferences: {
        ...visualProfile.preferences,
        enableAnimations: enabled,
      },
      technicalParameters: {
        ...visualProfile.technicalParameters,
        animationDuration: enabled ? 300 : 0,
      },
    });
  };

  const exportData = () => {
    const data = {
      profile: visualProfile,
      metrics: sessionMetrics,
      events: events,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eduaccess-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Skip link */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              Back
            </Button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
              <span className="text-xl font-bold">Settings</span>
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden md:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span className="hidden md:inline">Appearance</span>
              </TabsTrigger>
              <TabsTrigger value="accessibility" className="flex items-center gap-2">
                <Accessibility className="h-4 w-4" />
                <span className="hidden md:inline">Accessibility</span>
              </TabsTrigger>
              <TabsTrigger value="data" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="hidden md:inline">Data</span>
              </TabsTrigger>
              <TabsTrigger value="about" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                <span className="hidden md:inline">About</span>
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={visualProfile.userName}
                      onChange={(e) => updateVisualProfile({ userName: e.target.value })}
                    />
                  </div>

                  <div className="p-4 rounded-lg bg-secondary/50">
                    <h3 className="font-semibold mb-2">Visual Acuity</h3>
                    <p className="text-muted-foreground">
                      Snellen: {visualProfile.visualAcuity.snellen} · 
                      logMAR: {visualProfile.visualAcuity.logMAR.toFixed(2)} · 
                      Severity: {visualProfile.visualAcuity.severity}
                    </p>
                    <Button variant="link" className="p-0 mt-2" onClick={() => navigate('/onboarding')}>
                      Reconfigure visual profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Theme Selection */}
                  <div className="space-y-4">
                    <Label>Theme</Label>
                    <div className="grid grid-cols-3 gap-4">
                      {(['light', 'dark', 'high-contrast'] as ThemeMode[]).map((theme) => (
                        <Button
                          key={theme}
                          variant={currentTheme === theme ? 'default' : 'outline'}
                          className="h-20 flex-col gap-2"
                          onClick={() => setTheme(theme)}
                        >
                          {theme === 'light' && <Sun className="h-6 w-6" />}
                          {theme === 'dark' && <Moon className="h-6 w-6" />}
                          {theme === 'high-contrast' && <Contrast className="h-6 w-6" />}
                          <span className="capitalize">{theme.replace('-', ' ')}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Font Size */}
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <Label>Font Size: {visualProfile.preferences.fontSize}px</Label>
                    </div>
                    <Slider
                      value={[visualProfile.preferences.fontSize]}
                      onValueChange={handleFontSizeChange}
                      min={16}
                      max={48}
                      step={2}
                    />
                    <p 
                      className="p-4 border rounded-lg"
                      style={{ fontSize: `${visualProfile.preferences.fontSize}px` }}
                    >
                      Preview text at {visualProfile.preferences.fontSize}px
                    </p>
                  </div>

                  {/* Line Spacing */}
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <Label>Line Spacing: {visualProfile.preferences.lineSpacing.toFixed(2)}</Label>
                    </div>
                    <Slider
                      value={[visualProfile.preferences.lineSpacing]}
                      onValueChange={handleLineSpacingChange}
                      min={1.5}
                      max={3}
                      step={0.25}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Accessibility Tab */}
            <TabsContent value="accessibility">
              <Card>
                <CardHeader>
                  <CardTitle>Accessibility Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Contrast Mode */}
                  <div className="space-y-4">
                    <Label>Contrast Mode</Label>
                    <RadioGroup
                      value={visualProfile.preferences.contrast}
                      onValueChange={(v) => handleContrastChange(v as ContrastMode)}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2 p-3 rounded-lg border">
                        <RadioGroupItem value="normal" id="contrast-normal" />
                        <Label htmlFor="contrast-normal">Normal (4.5:1 contrast)</Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 rounded-lg border">
                        <RadioGroupItem value="high" id="contrast-high" />
                        <Label htmlFor="contrast-high">High Contrast (21:1)</Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 rounded-lg border">
                        <RadioGroupItem value="inverted" id="contrast-inverted" />
                        <Label htmlFor="contrast-inverted">Inverted (for photophobia)</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Animations */}
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <Label htmlFor="animations">Enable Animations</Label>
                      <p className="text-sm text-muted-foreground">
                        Smooth transitions and micro-interactions
                      </p>
                    </div>
                    <Switch
                      id="animations"
                      checked={visualProfile.preferences.enableAnimations}
                      onCheckedChange={handleAnimationsChange}
                    />
                  </div>

                  {/* TTS Preference */}
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <Label htmlFor="tts">Text-to-Speech</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable audio narration for content
                      </p>
                    </div>
                    <Switch
                      id="tts"
                      checked={visualProfile.technicalParameters.enableTTS}
                      onCheckedChange={(enabled) =>
                        updateVisualProfile({
                          technicalParameters: {
                            ...visualProfile.technicalParameters,
                            enableTTS: enabled,
                          },
                        })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Data Tab */}
            <TabsContent value="data">
              <Card>
                <CardHeader>
                  <CardTitle>Data & Privacy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <h3 className="font-semibold mb-2">Session Statistics</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>Content viewed: {sessionMetrics.contentViewed}</li>
                      <li>Tasks completed: {sessionMetrics.tasksCompleted}</li>
                      <li>Events tracked: {events.length}</li>
                    </ul>
                  </div>

                  <Button onClick={exportData} className="w-full">
                    <Database className="h-4 w-4 mr-2" />
                    Export My Data (GDPR)
                  </Button>

                  <p className="text-sm text-muted-foreground">
                    Your data is stored locally in your browser and is used only for research purposes.
                    No personal information is shared with third parties.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* About Tab */}
            <TabsContent value="about">
              <Card>
                <CardHeader>
                  <CardTitle>About EduAccess</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <Sparkles className="h-12 w-12 text-primary" />
                    <div>
                      <h2 className="text-2xl font-bold">EduAccess</h2>
                      <p className="text-muted-foreground">Version 1.0.0 (Doctoral Thesis Prototype)</p>
                    </div>
                  </div>

                  <p className="text-muted-foreground">
                    EduAccess is an intelligent educational content aggregation ecosystem with automatic 
                    accessibility remediation for students with mild to moderate visual impairment.
                  </p>

                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <h3 className="font-semibold mb-2">Research Project</h3>
                    <p className="text-sm text-muted-foreground">
                      This prototype is part of a doctoral thesis investigating middleware architectures 
                      for educational accessibility. Based on research by Michael (2024), Jeanneret & Baudet (2022), 
                      and ISO/IEC 24751 standards.
                    </p>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>Technology Stack:</strong></p>
                    <ul className="list-disc list-inside ml-4">
                      <li>React 18 with TypeScript</li>
                      <li>Tailwind CSS + shadcn/ui</li>
                      <li>Zustand for state management</li>
                      <li>Framer Motion for animations</li>
                      <li>WCAG 2.1 AA Compliant</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}
