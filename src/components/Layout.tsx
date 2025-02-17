import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Upload, Settings, Scissors, FileType, FileText, MessageSquare, Database } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AudioConverter } from "./AudioConverter/AudioConverter";
import { TranscriptionList } from "./TranscriptionList/TranscriptionList";
import { Prompts } from "./Prompts";
import { FileUpload } from "./FileUpload";
import { Card } from "./ui/card";
import { Mic, FolderOpen, Wand2, FileAudio } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { useStore } from "@/store/useStore";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { addFiles } = useStore();

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <FileUpload 
            onFilesAccepted={addFiles}
            accept={{ 'audio/*': ['.mp3', '.wav', '.ogg', '.m4a'] }}
          />
          <div className="container py-8">
            <div className="container mx-auto py-8 px-4">
              <h1 className="text-3xl font-bold mb-8 text-center">Audio Transcription Studio</h1>
              
              <Tabs defaultValue="transcribe" className="space-y-6">
                <Card className="p-4">
                  <TabsList className="grid grid-cols-4 gap-4">
                    <TabsTrigger value="transcribe" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Mic className="w-4 h-4 mr-2" />
                      Transcribe
                    </TabsTrigger>
                    <TabsTrigger value="convert" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <FileAudio className="w-4 h-4 mr-2" />
                      Convert Audio
                    </TabsTrigger>
                    <TabsTrigger value="files" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Files
                    </TabsTrigger>
                    <TabsTrigger value="prompts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Wand2 className="w-4 h-4 mr-2" />
                      Prompts
                    </TabsTrigger>
                  </TabsList>
                </Card>

                <TabsContent value="transcribe" className="space-y-6">
                  <FileUpload />
                </TabsContent>

                <TabsContent value="convert" className="space-y-6">
                  <AudioConverter />
                </TabsContent>

                <TabsContent value="files" className="space-y-6">
                  <TranscriptionList />
                </TabsContent>

                <TabsContent value="prompts" className="space-y-6">
                  <Prompts />
                </TabsContent>
              </Tabs>
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}