import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { createClient } from '@supabase/supabase-js';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { Layout } from "./components/Layout";
import { TranscriptionUploader } from "./components/TranscriptionUploader";
import { TranscriptionHistory } from "./components/TranscriptionHistory";
import { Settings } from "./components/Settings";
import { Auth } from "./components/Auth";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SessionContextProvider supabaseClient={supabase}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<ProtectedRoute><TranscriptionUploader /></ProtectedRoute>} />
                <Route path="dashboard" element={<ProtectedRoute><TranscriptionUploader /></ProtectedRoute>} />
                <Route path="history" element={<ProtectedRoute><TranscriptionHistory /></ProtectedRoute>} />
                <Route path="settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              </Route>
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </SessionContextProvider>
  </QueryClientProvider>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const session = supabase.auth.getSession();
  
  if (!session) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

export default App;