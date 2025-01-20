import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Upload, Settings, Scissors, FileType, FileText, MessageSquare, Database } from "lucide-react";

export function Layout({ children }) {
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
          {children}
        </div>
      </main>
    </div>
  );
}