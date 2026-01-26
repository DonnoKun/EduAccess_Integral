/**
 * EduAccess - Dashboard Page
 * Main hub with analytics, quick actions, and content recommendations
 */

import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStore } from '@/store/useStore';
import { recentSearches, recommendedContent } from '@/data/mockData';
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
  const { 
    visualProfile, 
    hasCompletedOnboarding, 
    sessionMetrics,
    currentTheme,
    setTheme,
  } = useStore();

  useEffect(() => {
    if (!hasCompletedOnboarding) {
      navigate('/onboarding');
    }
  }, [hasCompletedOnboarding, navigate]);

  if (!visualProfile) return null;

  const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
    { value: 'high-contrast', label: 'High Contrast', icon: <Contrast className="h-4 w-4" /> },
  ];

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
      {/* Skip link */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
              <Menu className="h-5 w-5" />
            </Button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
              <span className="text-xl font-bold">EduAccess</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            <Link 
              to="/search" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Search
            </Link>
            <Link 
              to="/dashboard" 
              className="text-foreground font-medium"
              aria-current="page"
            >
              Dashboard
            </Link>
            <Link 
              to="/settings" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Settings
            </Link>
          </nav>

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

            <Button variant="ghost" size="icon" aria-label="View profile">
              <Eye className="h-4 w-4" />
            </Button>
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
                      Welcome back, {visualProfile.userName}! 👋
                    </h1>
                    <p className="text-muted-foreground">
                      Your profile: {visualProfile.visualAcuity.snellen} · {' '}
                      {visualProfile.preferences.contrast === 'high' ? 'High Contrast' : 
                       visualProfile.preferences.contrast === 'inverted' ? 'Inverted' : 'Normal'} · {' '}
                      {visualProfile.preferences.fontSize}px
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => navigate('/search')} className="touch-target">
                      <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                      New Search
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/library')} className="touch-target">
                      <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />
                      My Library
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/settings')} className="touch-target">
                      <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                      Settings
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
                    Recent Searches
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
                    Recommended Content
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
                  Session Analytics
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    (For Research)
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
                    <p className="text-sm text-muted-foreground">Content Viewed</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-secondary/50 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Clock className="h-6 w-6 text-info" aria-hidden="true" />
                    </div>
                    <p className="text-2xl font-bold">
                      {Math.floor(sessionMetrics.totalTimeSpent / 60)}m
                    </p>
                    <p className="text-sm text-muted-foreground">Time Spent</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-secondary/50 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <CheckCircle2 className="h-6 w-6 text-success" aria-hidden="true" />
                    </div>
                    <p className="text-2xl font-bold">{sessionMetrics.tasksCompleted}</p>
                    <p className="text-sm text-muted-foreground">Tasks Completed</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-secondary/50 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Target className="h-6 w-6 text-warning" aria-hidden="true" />
                    </div>
                    <p className="text-2xl font-bold">87%</p>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
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
                  Quick Tips
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Use the search bar to find educational content across multiple sources</li>
                  <li>• Content marked with 🔴 needs accessibility remediation before viewing</li>
                  <li>• Adjust your visual profile in Settings at any time</li>
                  <li>• Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">?</kbd> for keyboard shortcuts</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
