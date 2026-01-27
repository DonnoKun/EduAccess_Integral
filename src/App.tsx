import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useStore } from "@/store/useStore";
import { useAuthStore } from "@/store/useAuthStore";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import SearchPage from "./pages/Search";
import RemediatePage from "./pages/Remediate";
import ContentViewer from "./pages/ContentViewer";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import ReadingGuide from "./components/ReadingGuide";

const queryClient = new QueryClient();

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const { hasCompletedOnboarding } = useStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasCompletedOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

// Auth Route wrapper (for onboarding - requires auth but not profile)
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const { applyProfileStyles, visualProfile, currentTheme } = useStore();
  const { isAuthenticated } = useAuthStore();
  const { hasCompletedOnboarding } = useStore();

  // Apply visual profile on app load and when profile changes
  useEffect(() => {
    // Apply profile styles (includes theme)
    applyProfileStyles();
    console.log('🚀 App initialized - Profile applied:', !!visualProfile);
  }, [applyProfileStyles, visualProfile, currentTheme]);

  return (
    <Routes>
      <Route path="/" element={
        isAuthenticated 
          ? (hasCompletedOnboarding ? <Navigate to="/dashboard" replace /> : <Navigate to="/onboarding" replace />)
          : <Navigate to="/login" replace />
      } />
      <Route path="/login" element={
        isAuthenticated 
          ? (hasCompletedOnboarding ? <Navigate to="/dashboard" replace /> : <Navigate to="/onboarding" replace />)
          : <Login />
      } />
      <Route path="/onboarding" element={
        <AuthRoute>
          <Onboarding />
        </AuthRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/search" element={
        <ProtectedRoute>
          <SearchPage />
        </ProtectedRoute>
      } />
      <Route path="/remediate/:contentId" element={
        <ProtectedRoute>
          <RemediatePage />
        </ProtectedRoute>
      } />
      <Route path="/content/:contentId" element={
        <ProtectedRoute>
          <ContentViewer />
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function AppWrapper() {
  const { readingGuideEnabled } = useStore();
  
  return (
    <>
      <AppContent />
      <ReadingGuide enabled={readingGuideEnabled} />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppWrapper />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
