import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { TranscriptionUploader } from "./components/TranscriptionUploader";
import { TranscriptionHistory } from "./components/TranscriptionHistory";
import { Settings } from "./components/Settings";
import { AudioSplitter } from "./components/AudioSplitter";
import FileConverter from "./components/FileConverter";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<TranscriptionUploader />} />
              <Route path="dashboard" element={<TranscriptionUploader />} />
              <Route path="split" element={<AudioSplitter />} />
              <Route path="convert" element={<FileConverter />} />
              <Route path="history" element={<TranscriptionHistory />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;