/**
 * EduAccess - Settings Page
 * Full profile customization and preferences with sidebar navigation
 */

import { useState, useEffect } from 'react';
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

type SettingsTab = 'profile' | 'appearance' | 'accessibility' | 'data' | 'about';

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ReactNode;
}

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
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

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

  const tabs: TabConfig[] = [
    { id: 'profile', label: t('settings.tabs.profile'), icon: <User className="h-5 w-5" /> },
    { id: 'appearance', label: t('settings.tabs.appearance'), icon: <Palette className="h-5 w-5" /> },
    { id: 'accessibility', label: t('settings.tabs.accessibility'), icon: <Accessibility className="h-5 w-5" /> },
    { id: 'data', label: t('settings.tabs.data'), icon: <Database className="h-5 w-5" /> },
    { id: 'about', label: t('settings.tabs.about'), icon: <Info className="h-5 w-5" /> },
  ];

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

      <main id="main-content" className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="settings-layout"
        >
          {/* Sidebar with tabs */}
          <aside className="settings-sidebar">
            <nav className="settings-nav" aria-label={t('settings.title')}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`settings-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Main content area */}
          <div className="settings-content">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <Card className="settings-card">
                <CardHeader>
                  <CardTitle className="settings-title">{t('settings.profile.title')}</CardTitle>
                </CardHeader>
                <CardContent className="settings-card-content">
                  <div className="settings-field">
                    <Label htmlFor="name" className="settings-label">{t('settings.profile.name')}</Label>
                    <Input
                      id="name"
                      value={visualProfile.userName}
                      onChange={(e) => updateVisualProfile({ userName: e.target.value })}
                      className="settings-input"
                    />
                  </div>

                  <div className="settings-info-box">
                    <h3 className="settings-info-title">{t('settings.profile.visualAcuity')}</h3>
                    <div className="settings-info-grid">
                      <div className="settings-info-item">
                        <span className="settings-info-label">Snellen</span>
                        <span className="settings-info-value">{visualProfile.visualAcuity.snellen}</span>
                      </div>
                      <div className="settings-info-item">
                        <span className="settings-info-label">logMAR</span>
                        <span className="settings-info-value">{visualProfile.visualAcuity.logMAR.toFixed(2)}</span>
                      </div>
                      <div className="settings-info-item">
                        <span className="settings-info-label">{t('onboarding.step1.severity')}</span>
                        <span className="settings-info-value">{visualProfile.visualAcuity.severity}</span>
                      </div>
                    </div>
                    <Button variant="link" className="settings-reconfigure-link" onClick={() => navigate('/onboarding')}>
                      {t('settings.profile.reconfigure')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <Card className="settings-card">
                <CardHeader>
                  <CardTitle className="settings-title">{t('settings.appearance.title')}</CardTitle>
                </CardHeader>
                <CardContent className="settings-card-content">
                  {/* Theme Selection */}
                  <div className="settings-field">
                    <Label className="settings-label">{t('settings.appearance.theme')}</Label>
                    <div className="settings-theme-grid">
                      {(['light', 'dark', 'high-contrast'] as ThemeMode[]).map((theme) => (
                        <Button
                          key={theme}
                          variant={currentTheme === theme ? 'default' : 'outline'}
                          className="settings-theme-button"
                          onClick={() => setTheme(theme)}
                        >
                          {theme === 'light' && <Sun className="h-6 w-6" />}
                          {theme === 'dark' && <Moon className="h-6 w-6" />}
                          {theme === 'high-contrast' && <Contrast className="h-6 w-6" />}
                          <span>
                            {theme === 'light' && t('settings.appearance.light')}
                            {theme === 'dark' && t('settings.appearance.dark')}
                            {theme === 'high-contrast' && t('settings.appearance.highContrast')}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Font Size */}
                  <div className="settings-field">
                    <div className="settings-field-header">
                      <Label className="settings-label">{t('settings.appearance.fontSize')}</Label>
                      <span className="settings-field-value">{visualProfile.preferences.fontSize}px</span>
                    </div>
                    <Slider
                      value={[visualProfile.preferences.fontSize]}
                      onValueChange={handleFontSizeChange}
                      min={16}
                      max={48}
                      step={2}
                      className="settings-slider"
                    />
                    <p 
                      className="settings-preview-text"
                      style={{ 
                        fontSize: `${visualProfile.preferences.fontSize}px`,
                        lineHeight: visualProfile.preferences.lineSpacing
                      }}
                    >
                      {t('settings.appearance.previewText', { size: visualProfile.preferences.fontSize })}
                    </p>
                  </div>

                  {/* Line Spacing */}
                  <div className="settings-field">
                    <div className="settings-field-header">
                      <Label className="settings-label">{t('settings.appearance.lineSpacing')}</Label>
                      <span className="settings-field-value">{visualProfile.preferences.lineSpacing.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[visualProfile.preferences.lineSpacing]}
                      onValueChange={handleLineSpacingChange}
                      min={1.5}
                      max={3}
                      step={0.25}
                      className="settings-slider"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Accessibility Tab */}
            {activeTab === 'accessibility' && (
              <Card className="settings-card">
                <CardHeader>
                  <CardTitle className="settings-title">{t('settings.accessibility.title')}</CardTitle>
                </CardHeader>
                <CardContent className="settings-card-content">
                  {/* Contrast Mode */}
                  <div className="settings-field">
                    <Label className="settings-label">{t('settings.accessibility.contrastMode')}</Label>
                    <RadioGroup
                      value={visualProfile.preferences.contrast}
                      onValueChange={(v) => handleContrastChange(v as ContrastMode)}
                      className="settings-radio-group"
                    >
                      <div className="settings-radio-item">
                        <RadioGroupItem value="normal" id="contrast-normal" />
                        <Label htmlFor="contrast-normal" className="settings-radio-label">
                          {t('settings.accessibility.normal')}
                        </Label>
                      </div>
                      <div className="settings-radio-item">
                        <RadioGroupItem value="high" id="contrast-high" />
                        <Label htmlFor="contrast-high" className="settings-radio-label">
                          {t('settings.accessibility.high')}
                        </Label>
                      </div>
                      <div className="settings-radio-item">
                        <RadioGroupItem value="inverted" id="contrast-inverted" />
                        <Label htmlFor="contrast-inverted" className="settings-radio-label">
                          {t('settings.accessibility.inverted')}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Animations */}
                  <div className="settings-toggle-item">
                    <div className="settings-toggle-content">
                      <Label htmlFor="animations" className="settings-toggle-label">
                        {t('settings.accessibility.animations')}
                      </Label>
                      <p className="settings-toggle-description">
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
                  <div className="settings-toggle-item">
                    <div className="settings-toggle-content">
                      <Label htmlFor="tts" className="settings-toggle-label">
                        {t('settings.accessibility.tts')}
                      </Label>
                      <p className="settings-toggle-description">
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
            )}

            {/* Data Tab */}
            {activeTab === 'data' && (
              <Card className="settings-card">
                <CardHeader>
                  <CardTitle className="settings-title">{t('settings.data.title')}</CardTitle>
                </CardHeader>
                <CardContent className="settings-card-content">
                  <div className="settings-info-box">
                    <h3 className="settings-info-title">{t('settings.data.sessionStats')}</h3>
                    <ul className="settings-stats-list">
                      <li>
                        <span>{t('settings.data.contentViewed')}:</span>
                        <strong>{sessionMetrics.contentViewed}</strong>
                      </li>
                      <li>
                        <span>{t('settings.data.tasksCompleted')}:</span>
                        <strong>{sessionMetrics.tasksCompleted}</strong>
                      </li>
                      <li>
                        <span>{t('settings.data.eventsTracked')}:</span>
                        <strong>{events.length}</strong>
                      </li>
                    </ul>
                  </div>

                  <Button onClick={exportData} className="settings-action-button">
                    <Database className="h-4 w-4 mr-2" />
                    {t('settings.data.exportData')}
                  </Button>

                  <p className="settings-privacy-note">
                    {t('settings.data.privacyNote')}
                  </p>

                  <div className="settings-divider" />

                  <Button 
                    variant="destructive" 
                    onClick={handleLogout}
                    className="settings-action-button"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('settings.data.logout')}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* About Tab */}
            {activeTab === 'about' && (
              <Card className="settings-card">
                <CardHeader>
                  <CardTitle className="settings-title">{t('settings.about.title')}</CardTitle>
                </CardHeader>
                <CardContent className="settings-card-content">
                  <div className="settings-about-header">
                    <Sparkles className="h-12 w-12 text-primary" />
                    <div>
                      <h2 className="settings-about-name">{t('common.appName')}</h2>
                      <p className="settings-about-version">{t('settings.about.version')}</p>
                    </div>
                  </div>

                  <p className="settings-about-description">
                    {t('settings.about.description')}
                  </p>

                  <div className="settings-research-box">
                    <h3 className="settings-research-title">{t('settings.about.research')}</h3>
                    <p className="settings-research-description">
                      {t('settings.about.researchDesc')}
                    </p>
                  </div>

                  <div className="settings-tech-stack">
                    <p className="settings-tech-title">{t('settings.about.techStack')}:</p>
                    <ul className="settings-tech-list">
                      <li>React 18 with TypeScript</li>
                      <li>Tailwind CSS + shadcn/ui</li>
                      <li>Zustand for state management</li>
                      <li>Framer Motion for animations</li>
                      <li>WCAG 2.1 AA Compliant</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
