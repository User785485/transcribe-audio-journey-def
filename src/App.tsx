import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { TranscriptionUploader } from "./components/TranscriptionUploader";
import { Settings } from "./components/Settings";
import { AudioSplitter } from "./components/AudioSplitter";
import FileConverter from "./components/FileConverter";
import { Database } from "./components/Database";
import { Prompts } from "./components/Prompts";

const queryClient = new QueryClient();

const App = () => {
  return (
    <ThemeProvider defaultTheme="dark" attribute="class">
      <TooltipProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
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
          </BrowserRouter>
          <Toaster />
          <Sonner />
        </QueryClientProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
};

export default App;