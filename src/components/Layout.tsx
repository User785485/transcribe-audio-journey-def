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

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r bg-background">
        <nav className="h-full flex flex-col">
          <div className="p-6 border-b">
            <h1 className="text-xl font-bold">Transcripteur Whisper</h1>
          </div>
          <div className="flex-1 py-6 space-y-4">
            <div className="px-3">
              <p className="mb-3 px-4 text-sm font-medium text-muted-foreground">Principal</p>
              <div className="space-y-1">
                <Link to="/">
                  <Button variant="ghost" className="w-full justify-start">
                    <Upload className="mr-3 h-4 w-4" />
                    Nouvelle transcription
                  </Button>
                </Link>
                <Link to="/split">
                  <Button variant="ghost" className="w-full justify-start">
                    <Scissors className="mr-3 h-4 w-4" />
                    Découper les fichiers
                  </Button>
                </Link>
                <Link to="/convert">
                  <Button variant="ghost" className="w-full justify-start">
                    <FileType className="mr-3 h-4 w-4" />
                    Convertir fichiers
                  </Button>
                </Link>
              </div>
            </div>

            <div className="px-3">
              <p className="mb-3 px-4 text-sm font-medium text-muted-foreground">Gestion</p>
              <div className="space-y-1">
                <Link to="/database">
                  <Button variant="ghost" className="w-full justify-start">
                    <Database className="mr-3 h-4 w-4" />
                    Base de données
                  </Button>
                </Link>
                <Link to="/prompts">
                  <Button variant="ghost" className="w-full justify-start">
                    <FileText className="mr-3 h-4 w-4" />
                    Prompts
                  </Button>
                </Link>
                <Button variant="ghost" className="w-full justify-start">
                  <MessageSquare className="mr-3 h-4 w-4" />
                  <a href="https://web.whatsapp.com" target="_blank" rel="noopener noreferrer" className="w-full text-left">
                    WhatsApp Web
                  </a>
                </Button>
              </div>
            </div>

            <div className="px-3">
              <p className="mb-3 px-4 text-sm font-medium text-muted-foreground">Système</p>
              <div className="space-y-1">
                <Link to="/settings">
                  <Button variant="ghost" className="w-full justify-start">
                    <Settings className="mr-3 h-4 w-4" />
                    Paramètres
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
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
      </main>
    </div>
  );
}