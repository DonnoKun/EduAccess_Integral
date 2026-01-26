/**
 * EduAccess - Dashboard Page
 * Main hub with analytics, quick actions, and content recommendations
 */


import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Search,
  BookOpen,
  Settings,
  BarChart3,
  Clock,
  CheckCircle2,
  Target,
  Sparkles,
  TrendingUp,
  Eye,
  Menu,
  Sun,
  Moon,
  Contrast,
  User,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { recentSearches, recommendedContent } from '@/data/mockData';
import LanguageSelector from '@/components/LanguageSelector';
import type { ThemeMode } from '@/types';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { 
    visualProfile, 
    hasCompletedOnboarding, 
    sessionMetrics,
    currentTheme,
    setTheme,
  } = useStore();
  const { isAuthenticated, logout, currentUser } = useAuthStore();
  const [readingGuideEnabled, setReadingGuideEnabled] = useState(false);
  const [guidePosition, setGuidePosition] = useState(0);

  // Reading guide - follows mouse position
  useEffect(() => {
    if (!readingGuideEnabled) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      setGuidePosition(e.clientY);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [readingGuideEnabled]);

  const toggleReadingGuide = () => {
    const newState = !readingGuideEnabled;
    setReadingGuideEnabled(newState);
    toast.success(newState ? t('dashboard.readingGuideEnabled') : t('dashboard.readingGuideDisabled'));
  };

  const handleLogout = () => {
    console.log('🚪 Logging out user...');
    
    // Clear visual profile styles
    const root = document.documentElement;
    root.removeAttribute('data-user-profile');
    root.removeAttribute('data-theme');
    root.style.removeProperty('--profile-font-size');
    root.style.removeProperty('--profile-line-height');
    root.classList.remove('dark', 'high-contrast', 'inverted');
    
    // Clear auth state
    logout();
    
    // Show success message
    toast.success(t('auth.logoutSuccess'));
    
    // Navigate to login
    navigate('/login');
    
    console.log('✅ Logout complete');
  };

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

  const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: t('themes.light'), icon: <Sun className="h-4 w-4" /> },
    { value: 'dark', label: t('themes.dark'), icon: <Moon className="h-4 w-4" /> },
    { value: 'high-contrast', label: t('themes.highContrast'), icon: <Contrast className="h-4 w-4" /> },
  ];

  const getContrastLabel = () => {
    switch (visualProfile.preferences.contrast) {
      case 'high':
        return t('dashboard.contrastHigh');
      case 'inverted':
        return t('dashboard.contrastInverted');
      default:
        return t('dashboard.contrastNormal');
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'youtube':
      case 'khan':
        return '📹';
      case 'wikipedia':
      case 'article':
        return '📄';
      case 'openstax':
        return '📚';
      default:
        return '📝';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Reading Guide Line */}
      {readingGuideEnabled && (
        <div 
          className="reading-guide"
          style={{ top: guidePosition }}
          aria-hidden="true"
        />
      )}
      {/* Skip link */}
      <a href="#main-content" className="skip-link">
        {t('common.skipToMain')}
      </a>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden" aria-label={t('navigation.menu')}>
              <Menu className="h-5 w-5" />
            </Button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
              <span className="text-xl font-bold">{t('common.appName')}</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            <Link 
              to="/search" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('navigation.search')}
            </Link>
            <Link 
              to="/dashboard" 
              className="text-foreground font-medium"
              aria-current="page"
            >
              {t('navigation.dashboard')}
            </Link>
            <Link 
              to="/settings" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('navigation.settings')}
            </Link>
          </nav>

          <div className="flex items-center gap-2">
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

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={readingGuideEnabled ? 'default' : 'ghost'} 
                  size="icon" 
                  onClick={toggleReadingGuide}
                  aria-label={t('dashboard.toggleReadingGuide')}
                  aria-pressed={readingGuideEnabled}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('dashboard.readingGuideTooltip')}</p>
              </TooltipContent>
            </Tooltip>

            {/* User Menu with Logout */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-3">
                  <User className="h-4 w-4" />
                  <span className="hidden md:inline max-w-[120px] truncate">
                    {visualProfile?.userName || currentUser?.name || t('navigation.user')}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background border">
                <DropdownMenuItem onClick={() => navigate('/settings')} className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  {t('navigation.settings')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  {t('common.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="container mx-auto px-4 py-8">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          {/* Welcome Card */}
          <motion.div variants={item}>
            <Card className="glass-card border-primary/20">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-2">
                      {t('dashboard.welcome', { name: visualProfile.userName })}
                    </h1>
                    <p className="text-muted-foreground">
                      {t('dashboard.profileInfo', {
                        snellen: visualProfile.visualAcuity.snellen,
                        contrast: getContrastLabel(),
                        fontSize: visualProfile.preferences.fontSize,
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => navigate('/search')} className="touch-target">
                      <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                      {t('dashboard.quickActions.search')}
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/library')} className="touch-target">
                      <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />
                      {t('dashboard.quickActions.library')}
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/settings')} className="touch-target">
                      <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                      {t('dashboard.quickActions.settings')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Stats & Recent Activity */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Recent Searches */}
            <motion.div variants={item}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
                    {t('dashboard.recentSearches')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {recentSearches.map((search, index) => (
                      <li key={index}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-left"
                          onClick={() => navigate(`/search?q=${encodeURIComponent(search)}`)}
                        >
                          <Search className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          {search}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recommended Content */}
            <motion.div variants={item}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
                    {t('dashboard.recommendedContent')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {recommendedContent.slice(0, 5).map((content) => (
                      <li key={content.id}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-left h-auto py-2"
                          onClick={() => navigate(`/content/${content.id}`)}
                        >
                          <span className="mr-2" aria-hidden="true">
                            {getSourceIcon(content.source)}
                          </span>
                          <span className="truncate">{content.title}</span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Session Analytics */}
          <motion.div variants={item}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
                  {t('dashboard.sessionAnalytics')}
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    {t('dashboard.forResearch')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-secondary/50 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <BookOpen className="h-6 w-6 text-primary" aria-hidden="true" />
                    </div>
                    <p className="text-2xl font-bold">{sessionMetrics.contentViewed}</p>
                    <p className="text-sm text-muted-foreground">{t('dashboard.contentViewed')}</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-secondary/50 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Clock className="h-6 w-6 text-info" aria-hidden="true" />
                    </div>
                    <p className="text-2xl font-bold">
                      {Math.floor(sessionMetrics.totalTimeSpent / 60)}m
                    </p>
                    <p className="text-sm text-muted-foreground">{t('dashboard.timeSpent')}</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-secondary/50 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <CheckCircle2 className="h-6 w-6 text-success" aria-hidden="true" />
                    </div>
                    <p className="text-2xl font-bold">{sessionMetrics.tasksCompleted}</p>
                    <p className="text-sm text-muted-foreground">{t('dashboard.tasksCompleted')}</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-secondary/50 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Target className="h-6 w-6 text-warning" aria-hidden="true" />
                    </div>
                    <p className="text-2xl font-bold">87%</p>
                    <p className="text-sm text-muted-foreground">{t('dashboard.successRate')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Tips */}
          <motion.div variants={item}>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
                  {t('dashboard.quickTips')}
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {t('dashboard.tip1')}</li>
                  <li>• {t('dashboard.tip2')}</li>
                  <li>• {t('dashboard.tip3')}</li>
                  <li>• {t('dashboard.tip4')}</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
