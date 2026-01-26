/**
 * EduAccess - Settings Page
 * Full profile customization and preferences
 */

import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import LanguageSelector from '@/components/LanguageSelector';
import type { ThemeMode, ContrastMode } from '@/types';

export default function Settings() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    visualProfile,
    hasCompletedOnboarding,
    currentTheme,
    setTheme,
    updateVisualProfile,
    events,
    sessionMetrics,
  } = useStore();
  const { isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!hasCompletedOnboarding) {
      navigate('/onboarding');
    }
  }, [isAuthenticated, hasCompletedOnboarding, navigate]);

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
    
    toast({
      description: t('toasts.dataExported'),
    });
  };

  const handleLogout = () => {
    logout();
    toast({
      description: t('auth.logoutSuccess'),
    });
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Skip link */}
      <a href="#main-content" className="skip-link">
        {t('common.skipToMain')}
      </a>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              {t('common.back')}
            </Button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
              <span className="text-xl font-bold">{t('settings.title')}</span>
            </Link>
          </div>
          <LanguageSelector />
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
                <span className="hidden md:inline">{t('settings.tabs.profile')}</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span className="hidden md:inline">{t('settings.tabs.appearance')}</span>
              </TabsTrigger>
              <TabsTrigger value="accessibility" className="flex items-center gap-2">
                <Accessibility className="h-4 w-4" />
                <span className="hidden md:inline">{t('settings.tabs.accessibility')}</span>
              </TabsTrigger>
              <TabsTrigger value="data" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="hidden md:inline">{t('settings.tabs.data')}</span>
              </TabsTrigger>
              <TabsTrigger value="about" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                <span className="hidden md:inline">{t('settings.tabs.about')}</span>
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>{t('settings.profile.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('settings.profile.name')}</Label>
                    <Input
                      id="name"
                      value={visualProfile.userName}
                      onChange={(e) => updateVisualProfile({ userName: e.target.value })}
                    />
                  </div>

                  <div className="p-4 rounded-lg bg-secondary/50">
                    <h3 className="font-semibold mb-2">{t('settings.profile.visualAcuity')}</h3>
                    <p className="text-muted-foreground">
                      Snellen: {visualProfile.visualAcuity.snellen} · 
                      logMAR: {visualProfile.visualAcuity.logMAR.toFixed(2)} · 
                      {t('onboarding.step1.severity')}: {visualProfile.visualAcuity.severity}
                    </p>
                    <Button variant="link" className="p-0 mt-2" onClick={() => navigate('/onboarding')}>
                      {t('settings.profile.reconfigure')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance">
              <Card>
                <CardHeader>
                  <CardTitle>{t('settings.appearance.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Theme Selection */}
                  <div className="space-y-4">
                    <Label>{t('settings.appearance.theme')}</Label>
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
                          <span className="capitalize">
                            {theme === 'light' && t('settings.appearance.light')}
                            {theme === 'dark' && t('settings.appearance.dark')}
                            {theme === 'high-contrast' && t('settings.appearance.highContrast')}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Font Size */}
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <Label>{t('settings.appearance.fontSize')}: {visualProfile.preferences.fontSize}px</Label>
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
                      {t('settings.appearance.previewText', { size: visualProfile.preferences.fontSize })}
                    </p>
                  </div>

                  {/* Line Spacing */}
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <Label>{t('settings.appearance.lineSpacing')}: {visualProfile.preferences.lineSpacing.toFixed(2)}</Label>
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
                  <CardTitle>{t('settings.accessibility.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Contrast Mode */}
                  <div className="space-y-4">
                    <Label>{t('settings.accessibility.contrastMode')}</Label>
                    <RadioGroup
                      value={visualProfile.preferences.contrast}
                      onValueChange={(v) => handleContrastChange(v as ContrastMode)}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2 p-3 rounded-lg border">
                        <RadioGroupItem value="normal" id="contrast-normal" />
                        <Label htmlFor="contrast-normal">{t('settings.accessibility.normal')}</Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 rounded-lg border">
                        <RadioGroupItem value="high" id="contrast-high" />
                        <Label htmlFor="contrast-high">{t('settings.accessibility.high')}</Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 rounded-lg border">
                        <RadioGroupItem value="inverted" id="contrast-inverted" />
                        <Label htmlFor="contrast-inverted">{t('settings.accessibility.inverted')}</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Animations */}
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <Label htmlFor="animations">{t('settings.accessibility.animations')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('settings.accessibility.animationsDesc')}
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
                      <Label htmlFor="tts">{t('settings.accessibility.tts')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('settings.accessibility.ttsDesc')}
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
                  <CardTitle>{t('settings.data.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <h3 className="font-semibold mb-2">{t('settings.data.sessionStats')}</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>{t('settings.data.contentViewed')}: {sessionMetrics.contentViewed}</li>
                      <li>{t('settings.data.tasksCompleted')}: {sessionMetrics.tasksCompleted}</li>
                      <li>{t('settings.data.eventsTracked')}: {events.length}</li>
                    </ul>
                  </div>

                  <Button onClick={exportData} className="w-full">
                    <Database className="h-4 w-4 mr-2" />
                    {t('settings.data.exportData')}
                  </Button>

                  <p className="text-sm text-muted-foreground">
                    {t('settings.data.privacyNote')}
                  </p>

                  <div className="pt-4 border-t">
                    <Button 
                      variant="destructive" 
                      onClick={handleLogout}
                      className="w-full"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {t('settings.data.logout')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* About Tab */}
            <TabsContent value="about">
              <Card>
                <CardHeader>
                  <CardTitle>{t('settings.about.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <Sparkles className="h-12 w-12 text-primary" />
                    <div>
                      <h2 className="text-2xl font-bold">{t('common.appName')}</h2>
                      <p className="text-muted-foreground">{t('settings.about.version')}</p>
                    </div>
                  </div>

                  <p className="text-muted-foreground">
                    {t('settings.about.description')}
                  </p>

                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <h3 className="font-semibold mb-2">{t('settings.about.research')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.about.researchDesc')}
                    </p>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>{t('settings.about.techStack')}:</strong></p>
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
