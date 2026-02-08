/**
 * EduAccess - Search Page
 * Educational content discovery with filters and accessibility badges
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search as SearchIcon,
  Filter,
  Grid3X3,
  List,
  Mic,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Sun,
  Moon,
  Contrast,
  User,
  ChevronDown,
  LogOut,
  Settings,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import LanguageSelector from '@/components/LanguageSelector';
import type { ContentType, EducationLevel, AccessibilityStatus, ThemeMode } from '@/types';

export default function SearchPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] || 'es';
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    searchQuery,
    searchResults,
    searchLoading,
    searchFilters,
    searchSuggestions,
    searchNoResultsReason,
    performSearch,
    setSearchFilters,
    clearFilters,
    selectContent,
    hasCompletedOnboarding,
    currentTheme,
    setTheme,
    readingGuideEnabled,
    toggleReadingGuide,
    visualProfile,
  } = useStore();
  const { isAuthenticated, logout, currentUser } = useAuthStore();

  const [localQuery, setLocalQuery] = useState(searchParams.get('q') || '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isListening, setIsListening] = useState(false);

  const handleVoiceSearch = () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast.error(lang === 'es' ? 'Tu navegador no soporta búsqueda por voz' : 'Voice search not supported');
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = lang === 'es' ? 'es-ES' : 'en-US';
    recognition.interimResults = false;
    setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setLocalQuery(transcript);
      setSearchParams({ q: transcript });
      performSearch(transcript);
      setIsListening(false);
    };
    recognition.onerror = (event: any) => {
      let msg = '';
      switch (event.error) {
        case 'not-allowed':
        case 'service-not-allowed':
          msg = lang === 'es' ? 'Permiso de micrófono denegado. Actívalo en la configuración del navegador.' : 'Microphone permission denied.';
          break;
        case 'no-speech':
          msg = lang === 'es' ? 'No se detectó voz. Intenta de nuevo.' : 'No speech detected.';
          break;
        case 'network':
          msg = lang === 'es' ? 'Error de red en reconocimiento de voz.' : 'Network error in voice recognition.';
          break;
        case 'aborted':
          msg = lang === 'es' ? 'Reconocimiento de voz cancelado.' : 'Voice recognition cancelled.';
          break;
        default:
          msg = lang === 'es' ? `Error en reconocimiento de voz: ${event.error || 'desconocido'}` : `Voice recognition error: ${event.error || 'unknown'}`;
      }
      toast.error(msg);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
    toast.info(lang === 'es' ? '🎤 Habla ahora...' : '🎤 Speak now...');
  };

  const contentTypeLabels: Record<ContentType, string> = {
    video: t('search.contentTypes.video'),
    article: t('search.contentTypes.article'),
    textbook: t('search.contentTypes.textbook'),
    exercise: t('search.contentTypes.exercise'),
    diagram: t('search.contentTypes.diagram'),
  };

  const educationLevelLabels: Record<EducationLevel, string> = {
    elementary: t('search.educationLevels.elementary'),
    middle: t('search.educationLevels.middle'),
    high: t('search.educationLevels.high'),
    college: t('search.educationLevels.college'),
  };

  // ProtectedRoute already handles auth/onboarding redirects
  // This effect only handles search execution
  useEffect(() => {
    const queryParam = searchParams.get('q');
    if (queryParam) {
      setLocalQuery(queryParam);
      performSearch(queryParam);
    } else {
      performSearch('');
    }
  }, [searchParams, performSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(localQuery ? { q: localQuery } : {});
    performSearch(localQuery);
  };

  const handleLogout = () => {
    console.log('🚪 Logging out user from Search...');
    logout();
    toast.success(t('auth.logoutSuccess'));
    // Navigate after a brief delay to allow state cleanup
    setTimeout(() => navigate('/login'), 100);
  };

  const handleContentClick = (contentId: string) => {
    const content = searchResults.find((r) => r.id === contentId);
    if (content) {
      selectContent(content);
      const navState = { fromSearch: true, searchQuery: localQuery };
      if (content.accessibilityStatus === 'needs_remediation') {
        navigate(`/remediate/${contentId}`, { state: navState });
      } else {
        navigate(`/content/${contentId}`, { state: navState });
      }
    }
  };

  const handleFilterChange = (
    type: 'contentType' | 'educationLevel' | 'accessibilityStatus',
    value: string,
    checked: boolean
  ) => {
    const currentValues = (searchFilters[type] as string[]) || [];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter((v) => v !== value);
    
    setSearchFilters({
      ...searchFilters,
      [type]: newValues.length > 0 ? newValues : undefined,
    });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchFilters.contentType?.length) count += searchFilters.contentType.length;
    if (searchFilters.educationLevel?.length) count += searchFilters.educationLevel.length;
    if (searchFilters.accessibilityStatus?.length) count += searchFilters.accessibilityStatus.length;
    return count;
  }, [searchFilters]);

  // Get the current font size for badge scaling
  // Use higher scale for large font sizes to ensure readability
  const currentFontSize = visualProfile?.preferences?.fontSize 
    ? parseInt(String(visualProfile.preferences.fontSize)) 
    : 16;
  // For small fonts (≤24px): 80%, for large fonts (>24px): 90%
  const badgeScaleFactor = currentFontSize <= 24 ? 0.8 : 0.9;
  const badgeFontSize = Math.max(14, currentFontSize * badgeScaleFactor);

  const getAccessibilityBadge = (status: AccessibilityStatus, isListView = false) => {
    const badgeConfigs = {
      accessible: {
        icon: CheckCircle2,
        label: t('search.badges.accessible'),
        bgColor: 'rgba(22, 163, 74, 0.15)',
        textColor: '#16A34A',
        borderColor: '#16A34A',
        darkBgColor: 'rgba(34, 197, 94, 0.25)',
        darkTextColor: '#86EFAC',
        darkBorderColor: '#22C55E',
      },
      needs_remediation: {
        icon: AlertCircle,
        label: t('search.badges.needsRemediation'),
        bgColor: 'rgba(220, 38, 38, 0.15)',
        textColor: '#DC2626',
        borderColor: '#DC2626',
        darkBgColor: 'rgba(239, 68, 68, 0.25)',
        darkTextColor: '#FCA5A5',
        darkBorderColor: '#EF4444',
      },
      partially_accessible: {
        icon: AlertTriangle,
        label: t('search.badges.partial'),
        bgColor: 'rgba(245, 158, 11, 0.15)',
        textColor: '#D97706',
        borderColor: '#F59E0B',
        darkBgColor: 'rgba(245, 158, 11, 0.25)',
        darkTextColor: '#FCD34D',
        darkBorderColor: '#F59E0B',
      },
    };

    const config = badgeConfigs[status];
    const Icon = config.icon;
    const isDark = currentTheme === 'dark';

    const badgeContent = (
      <div
        className="inline-flex items-center gap-2 rounded-full border-2 font-semibold cursor-help"
        style={{
          fontSize: `${badgeFontSize}px`,
          padding: `0.4em 0.9em`,
          backgroundColor: isDark ? config.darkBgColor : config.bgColor,
          color: isDark ? config.darkTextColor : config.textColor,
          borderColor: isDark ? config.darkBorderColor : config.borderColor,
          lineHeight: 1.2,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
          flexShrink: 0,
          maxWidth: '100%',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
        role="status"
      >
        <Icon 
          style={{ 
            width: '1.2em', 
            height: '1.2em',
            flexShrink: 0,
          }} 
          aria-hidden="true" 
        />
        <span style={{ 
          fontWeight: 600, 
          lineHeight: 1.1, 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
        }}>{config.label}</span>
      </div>
    );

    // Wrap in tooltip to show full text on hover
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeContent}
          </TooltipTrigger>
          <TooltipContent 
            side="top" 
            className="bg-popover text-popover-foreground border shadow-lg"
            style={{ fontSize: `${Math.max(14, currentFontSize * 0.85)}px` }}
          >
            <p>{config.label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: t('themes.light'), icon: <Sun className="h-4 w-4" /> },
    { value: 'dark', label: t('themes.dark'), icon: <Moon className="h-4 w-4" /> },
    { value: 'high-contrast', label: t('themes.highContrast'), icon: <Contrast className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <a href="#search-results" className="skip-link">{t('common.skipToMain')}</a>

      <header className="sticky top-0 z-50 glass-card border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="text-xl font-bold hidden md:inline">{t('search.title')}</span>
          </Link>

          <div className="flex items-center gap-2">
            <LanguageSelector />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label={t('navigation.changeTheme')}>
                  {currentTheme === 'dark' ? <Moon className="h-4 w-4" /> : currentTheme === 'high-contrast' ? <Contrast className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="bg-background border"
                style={{ fontSize: `${currentFontSize}px` }}
              >
                {themeOptions.map((option) => (
                  <DropdownMenuItem 
                    key={option.value} 
                    onClick={() => setTheme(option.value)} 
                    className="flex items-center gap-3 cursor-pointer"
                    style={{ fontSize: '1em', padding: '0.75em 1em' }}
                  >
                    <span style={{ width: '1.25em', height: '1.25em', display: 'flex', alignItems: 'center' }}>
                      {option.icon}
                    </span>
                    <span className="flex-1">{option.label}</span>
                    {currentTheme === option.value && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              variant={readingGuideEnabled ? 'default' : 'ghost'} 
              size="icon" 
              onClick={() => {
                toggleReadingGuide();
                toast.success(!readingGuideEnabled ? t('dashboard.readingGuideEnabled') : t('dashboard.readingGuideDisabled'));
              }}
              aria-label={t('dashboard.toggleReadingGuide')}
              aria-pressed={readingGuideEnabled}
            >
              <Eye className="h-4 w-4" />
            </Button>

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
              <DropdownMenuContent 
                align="end" 
                className="bg-background border"
                style={{ 
                  fontSize: `${currentFontSize}px`,
                  minWidth: 'max-content',
                  width: 'auto',
                }}
              >
                <DropdownMenuItem 
                  onClick={() => navigate('/dashboard')} 
                  className="flex items-center gap-2"
                  style={{ fontSize: '1em', padding: '0.75em 1.25em', whiteSpace: 'nowrap' }}
                >
                  <Sparkles style={{ width: '1.25em', height: '1.25em', flexShrink: 0 }} />
                  <span>{t('navigation.dashboard')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => navigate('/settings')} 
                  className="flex items-center gap-2"
                  style={{ fontSize: '1em', padding: '0.75em 1.25em', whiteSpace: 'nowrap' }}
                >
                  <Settings style={{ width: '1.25em', height: '1.25em', flexShrink: 0 }} />
                  <span>{t('navigation.settings')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                  style={{ fontSize: '1em', padding: '0.75em 1.25em', whiteSpace: 'nowrap' }}
                >
                  <LogOut style={{ width: '1.25em', height: '1.25em', flexShrink: 0 }} />
                  <span>{t('common.logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <Input type="text" placeholder={t('search.placeholder')} value={localQuery} onChange={(e) => setLocalQuery(e.target.value)} className="pl-10 pr-10 h-12 text-lg" aria-label={t('search.placeholder')} />
              {localQuery && (
                <button type="button" onClick={() => { setLocalQuery(''); setSearchParams({}); performSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={t('search.clearSearch')}>
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            <Button 
              type="button" 
              variant={isListening ? 'default' : 'outline'} 
              size="icon" 
              className={`h-12 w-12 ${isListening ? 'animate-pulse' : ''}`} 
              aria-label={t('search.voiceSearch')}
              onClick={handleVoiceSearch}
            >
              <Mic className="h-5 w-5" />
            </Button>
            <Button type="submit" className="h-12 px-6">{t('search.searchButton')}</Button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9">
                  <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
                  {t('search.filters.contentType')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-background border">
                <DropdownMenuLabel>{t('search.filters.filterByType')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.entries(contentTypeLabels) as [ContentType, string][]).map(([type, label]) => (
                  <DropdownMenuCheckboxItem key={type} checked={searchFilters.contentType?.includes(type)} onCheckedChange={(checked) => handleFilterChange('contentType', type, checked)}>
                    {label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9">{t('search.filters.level')}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-background border">
                <DropdownMenuLabel>{t('search.filters.educationLevel')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.entries(educationLevelLabels) as [EducationLevel, string][]).map(([level, label]) => (
                  <DropdownMenuCheckboxItem key={level} checked={searchFilters.educationLevel?.includes(level)} onCheckedChange={(checked) => handleFilterChange('educationLevel', level, checked)}>
                    {label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9">{t('search.filters.accessibility')}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-background border">
                <DropdownMenuLabel>{t('search.filters.accessibilityStatus')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={searchFilters.accessibilityStatus?.includes('accessible')} onCheckedChange={(checked) => handleFilterChange('accessibilityStatus', 'accessible', checked)}>
                  {t('search.accessibilityStatuses.accessible')}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={searchFilters.accessibilityStatus?.includes('partially_accessible')} onCheckedChange={(checked) => handleFilterChange('accessibilityStatus', 'partially_accessible', checked)}>
                  {t('search.accessibilityStatuses.partiallyAccessible')}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={searchFilters.accessibilityStatus?.includes('needs_remediation')} onCheckedChange={(checked) => handleFilterChange('accessibilityStatus', 'needs_remediation', checked)}>
                  {t('search.accessibilityStatuses.needsRemediation')}
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                {t('search.filters.clearFilters')} ({activeFilterCount})
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('search.results', { count: searchResults.length })}</span>
            <div className="flex border rounded-lg">
              <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} aria-label={t('search.gridView')} aria-pressed={viewMode === 'grid'}>
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} aria-label={t('search.listView')} aria-pressed={viewMode === 'list'}>
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <section id="search-results" aria-label="Search results" aria-busy={searchLoading}>
          {searchLoading ? (
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : ''}`}>
              {[...Array(6)].map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-40 w-full mb-4" /><Skeleton className="h-6 w-3/4 mb-2" /><Skeleton className="h-4 w-full mb-2" /><Skeleton className="h-4 w-2/3" /></CardContent></Card>
              ))}
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12 max-w-lg mx-auto">
              <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
              <h2 className="text-xl font-semibold mb-2">{t('search.noResults')}</h2>
              <p className="text-muted-foreground mb-6">
                {searchNoResultsReason || t('search.noResultsHint')}
              </p>
              
              {/* Show AI-generated search suggestions */}
              {searchSuggestions && searchSuggestions.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-3">
                    {t('search.suggestionsTitle')}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {searchSuggestions.map((suggestion, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => {
                          setLocalQuery(suggestion);
                          setSearchParams({ q: suggestion });
                          performSearch(suggestion);
                        }}
                      >
                        <SearchIcon className="h-3 w-3 mr-1.5" aria-hidden="true" />
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div 
                key={viewMode} 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className={`grid gap-4 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : ''}`}
              >
                {searchResults.map((result, index) => (
                  <motion.div key={result.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                    <Card 
                      className="h-full hover:shadow-lg transition-shadow cursor-pointer group" 
                      onClick={() => handleContentClick(result.id)} 
                      role="article" 
                      tabIndex={0} 
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleContentClick(result.id); } }}
                    >
                      <CardContent className={`p-4 ${viewMode === 'list' ? 'flex gap-4' : ''}`} style={{ overflow: 'hidden' }}>
                        {/* GRID VIEW: Thumbnail + Badge below */}
                        {viewMode === 'grid' && (
                          <>
                            <div className="relative overflow-hidden rounded-lg bg-muted h-40 mb-3">
                              {result.thumbnail ? (
                                <img src={result.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl">{contentTypeLabels[result.contentType]?.split(' ')[0]}</div>
                              )}
                            </div>
                            <div className="mb-3" style={{ maxWidth: '100%', overflow: 'hidden' }}>{getAccessibilityBadge(result.accessibilityStatus)}</div>
                          </>
                        )}
                        
                        {/* LIST VIEW: Thumbnail without badge */}
                        {viewMode === 'list' && (
                          <div className="relative overflow-hidden rounded-lg bg-muted w-32 h-24 flex-shrink-0">
                            {result.thumbnail ? (
                              <img src={result.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">{contentTypeLabels[result.contentType]?.split(' ')[0]}</div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          {/* LIST VIEW: Title + Badge in same row */}
                          {viewMode === 'list' && (
                            <div className="flex flex-wrap items-start gap-3 mb-2">
                              <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors flex-1 min-w-[150px]">
                                {result.title}
                              </h3>
                              {getAccessibilityBadge(result.accessibilityStatus, true)}
                            </div>
                          )}
                          
                          {/* GRID VIEW: Title only */}
                          {viewMode === 'grid' && (
                            <h3 className="font-semibold text-lg mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                              {result.title}
                            </h3>
                          )}
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {result.source.charAt(0).toUpperCase() + result.source.slice(1)}
                            {result.metadata.duration && ` · ${result.metadata.duration}`}
                            {result.metadata.wordCount && ` · ${result.metadata.wordCount.toLocaleString()} words`}
                          </p>
                          <p className={`text-sm text-muted-foreground ${viewMode === 'list' ? '' : 'line-clamp-2'}`}>{result.description}</p>
                          {result.accessibilityIssues && result.accessibilityIssues.length > 0 && (
                            <p className="text-xs text-warning mt-2">{t('search.issues', { count: result.accessibilityIssues.length })}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </section>
      </main>
    </div>
  );
}
