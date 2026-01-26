import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useStore } from "@/store/useStore";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import SearchPage from "./pages/Search";
import RemediatePage from "./pages/Remediate";
import ContentViewer from "./pages/ContentViewer";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const { hasCompletedOnboarding, applyProfileStyles, currentTheme } = useStore();

  useEffect(() => {
    applyProfileStyles();
    // Apply theme on load
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'high-contrast', 'inverted');
    if (currentTheme !== 'light') {
      root.classList.add(currentTheme);
    }
  }, [applyProfileStyles, currentTheme]);

  return (
    <Routes>
      <Route path="/" element={
        hasCompletedOnboarding ? <Navigate to="/dashboard" replace /> : <Navigate to="/onboarding" replace />
      } />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/remediate/:contentId" element={<RemediatePage />} />
      <Route path="/content/:contentId" element={<ContentViewer />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
