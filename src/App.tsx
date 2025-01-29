import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { TranscriptionUploader } from "./components/TranscriptionUploader";
import { Settings } from "./components/Settings";
import { AudioSplitter } from "./components/AudioSplitter";
import FileConverter from "./components/FileConverter";
import { Database } from "./components/Database";
import { Prompts } from "./components/Prompts";
import { AuthPage } from "./components/auth/AuthPage";
import { useEffect, useState } from "react";
import { supabase } from "./integrations/supabase/client";

const queryClient = new QueryClient();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      console.log("👤 État initial de l'authentification:", !!session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      console.log("🔄 Changement d'état d'authentification:", !!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show nothing while checking auth state
  if (isAuthenticated === null) {
    return null;
  }

  return (
    <ThemeProvider defaultTheme="dark" attribute="class">
      <TooltipProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Routes>
              <Route
                path="/auth"
                element={
                  isAuthenticated ? (
                    <Navigate to="/" replace />
                  ) : (
                    <AuthPage />
                  )
                }
              />
              <Route
                element={
                  isAuthenticated ? (
                    <Layout>
                      <Routes>
                        <Route path="/" element={<TranscriptionUploader />} />
                        <Route path="/split" element={<AudioSplitter />} />
                        <Route path="/convert" element={<FileConverter />} />
                        <Route path="/database" element={<Database />} />
                        <Route path="/prompts" element={<Prompts />} />
                        <Route path="/settings" element={<Settings />} />
                      </Routes>
                    </Layout>
                  ) : (
                    <Navigate to="/auth" replace />
                  )
                }
                path="/*"
              />
            </Routes>
          </BrowserRouter>
          <Toaster />
          <Sonner />
        </QueryClientProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
};

export default App;