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
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import LanguageSelector from '@/components/LanguageSelector';
import type { ContentType, EducationLevel, AccessibilityStatus, ThemeMode } from '@/types';

export default function SearchPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    searchQuery,
    searchResults,
    searchLoading,
    searchFilters,
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

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!hasCompletedOnboarding) {
      navigate('/onboarding');
      return;
    }
    
    const queryParam = searchParams.get('q');
    if (queryParam) {
      setLocalQuery(queryParam);
      performSearch(queryParam);
    } else {
      performSearch('');
    }
  }, [searchParams, isAuthenticated, hasCompletedOnboarding, navigate, performSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(localQuery ? { q: localQuery } : {});
    performSearch(localQuery);
  };

  const handleLogout = () => {
    console.log('🚪 Logging out user...');
    const root = document.documentElement;
    root.removeAttribute('data-user-profile');
    root.removeAttribute('data-theme');
    root.style.removeProperty('--profile-font-size');
    root.style.removeProperty('--profile-line-height');
    root.classList.remove('dark', 'high-contrast', 'inverted');
    logout();
    toast.success(t('auth.logoutSuccess'));
    navigate('/login');
    console.log('✅ Logout complete');
  };

  const handleContentClick = (contentId: string) => {
    const content = searchResults.find((r) => r.id === contentId);
    if (content) {
      selectContent(content);
      if (content.accessibilityStatus === 'needs_remediation') {
        navigate(`/remediate/${contentId}`);
      } else {
        navigate(`/content/${contentId}`);
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

  const getAccessibilityBadge = (status: AccessibilityStatus) => {
    switch (status) {
      case 'accessible':
        return (
          <Badge className="badge-accessible">
            <CheckCircle2 className="h-3 w-3 mr-1" aria-hidden="true" />
            {t('search.badges.accessible')}
          </Badge>
        );
      case 'needs_remediation':
        return (
          <Badge className="badge-needs-remediation">
            <AlertCircle className="h-3 w-3 mr-1" aria-hidden="true" />
            {t('search.badges.needsRemediation')}
          </Badge>
        );
      case 'partially_accessible':
        return (
          <Badge className="badge-partial">
            <AlertTriangle className="h-3 w-3 mr-1" aria-hidden="true" />
            {t('search.badges.partial')}
          </Badge>
        );
    }
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
              <DropdownMenuContent align="end" className="bg-background border">
                {themeOptions.map((option) => (
                  <DropdownMenuCheckboxItem key={option.value} checked={currentTheme === option.value} onCheckedChange={() => setTheme(option.value)} className="flex items-center gap-2">
                    {option.icon}
                    {option.label}
                  </DropdownMenuCheckboxItem>
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
              <DropdownMenuContent align="end" className="w-56 bg-background border">
                <DropdownMenuItem onClick={() => navigate('/dashboard')} className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {t('navigation.dashboard')}
                </DropdownMenuItem>
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

      <main className="container mx-auto px-4 py-6">
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <Input type="search" placeholder={t('search.placeholder')} value={localQuery} onChange={(e) => setLocalQuery(e.target.value)} className="pl-10 pr-10 h-12 text-lg" aria-label={t('search.placeholder')} />
              {localQuery && (
                <button type="button" onClick={() => { setLocalQuery(''); setSearchParams({}); performSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={t('search.clearSearch')}>
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            <Button type="button" variant="outline" size="icon" className="h-12 w-12" aria-label={t('search.voiceSearch')}>
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
            <div className="text-center py-12">
              <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
              <h2 className="text-xl font-semibold mb-2">{t('search.noResults')}</h2>
              <p className="text-muted-foreground">{t('search.noResultsHint')}</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={viewMode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`grid gap-4 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : ''}`}>
                {searchResults.map((result, index) => (
                  <motion.div key={result.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                    <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => handleContentClick(result.id)} role="article" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleContentClick(result.id); } }}>
                      <CardContent className={`p-4 ${viewMode === 'list' ? 'flex gap-4' : ''}`}>
                        <div className={`relative overflow-hidden rounded-lg bg-muted ${viewMode === 'list' ? 'w-32 h-24 flex-shrink-0' : 'h-40 mb-4'}`}>
                          {result.thumbnail ? (
                            <img src={result.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl">{contentTypeLabels[result.contentType]?.split(' ')[0]}</div>
                          )}
                          <div className="absolute top-2 right-2">{getAccessibilityBadge(result.accessibilityStatus)}</div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1 line-clamp-2 group-hover:text-primary transition-colors">{result.title}</h3>
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
