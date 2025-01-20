import { Link, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Upload, History, Settings, Scissors, FileType, FileText, MessageSquare, Database } from "lucide-react";

export function Layout() {
  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r bg-background">
        <nav className="h-full flex flex-col">
          <div className="p-4 border-b">
            <h1 className="text-lg font-bold">Transcripteur Whisper</h1>
          </div>
          <div className="flex-1 p-4 space-y-2">
            <Link to="/dashboard">
              <Button variant="ghost" className="w-full justify-start">
                <Upload className="mr-2 h-4 w-4" />
                Nouvelle transcription
              </Button>
            </Link>
            <Link to="/split">
              <Button variant="ghost" className="w-full justify-start">
                <Scissors className="mr-2 h-4 w-4" />
                Découper les fichiers
              </Button>
            </Link>
            <Link to="/convert">
              <Button variant="ghost" className="w-full justify-start">
                <FileType className="mr-2 h-4 w-4" />
                Convertir fichiers
              </Button>
            </Link>
            <Link to="/history">
              <Button variant="ghost" className="w-full justify-start">
                <History className="mr-2 h-4 w-4" />
                Historique
              </Button>
            </Link>
            <Link to="/database">
              <Button variant="ghost" className="w-full justify-start">
                <Database className="mr-2 h-4 w-4" />
                Base de données
              </Button>
            </Link>
            <Link to="/prompts">
              <Button variant="ghost" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Prompts
              </Button>
            </Link>
            <Link to="/whatsapp">
              <Button variant="ghost" className="w-full justify-start">
                <MessageSquare className="mr-2 h-4 w-4" />
                <a href="https://web.whatsapp.com" target="_blank" rel="noopener noreferrer" className="w-full text-left">
                  WhatsApp Web
                </a>
              </Button>
            </Link>
            <Link to="/settings">
              <Button variant="ghost" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                Paramètres
              </Button>
            </Link>
          </div>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="container py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}