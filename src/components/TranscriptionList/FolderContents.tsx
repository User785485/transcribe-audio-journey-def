import { useState } from 'react';
import { Database } from '@/integrations/supabase/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileAudio, Copy, Download, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Transcription = Database['public']['Tables']['transcriptions']['Row'] & {
  audio_files: Database['public']['Tables']['audio_files']['Row'] | null;
};

interface FolderContentsProps {
  transcriptions: Transcription[];
  onMoveToFolder: (transcriptionId: string) => void;
  searchTerm: string;
}

export function FolderContents({ transcriptions, onMoveToFolder, searchTerm }: FolderContentsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("to_convert");

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      description: "Texte copié dans le presse-papier",
    });
  };

  const handleDownload = async (filePath: string, filename: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('audio')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de télécharger le fichier audio",
      });
    }
  };

  const filteredTranscriptions = transcriptions.filter(t =>
    (t.transcription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.audio_files?.filename.toLowerCase().includes(searchTerm.toLowerCase())) &&
    t.audio_files?.file_type === activeTab
  );

  return (
    <div className="space-y-4">
      <Tabs defaultValue="to_convert" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="to_convert">À convertir</TabsTrigger>
          <TabsTrigger value="converted">Convertis</TabsTrigger>
          <TabsTrigger value="transcription">Transcriptions</TabsTrigger>
        </TabsList>

        {['to_convert', 'converted', 'transcription'].map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fichier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Transcription</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTranscriptions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="flex items-center gap-2">
                      <FileAudio className="w-4 h-4" />
                      {t.audio_files?.filename}
                    </TableCell>
                    <TableCell>
                      {format(new Date(t.created_at), 'PPP', { locale: fr })}
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {t.transcription}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleCopy(t.transcription)}
                          title="Copier la transcription"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => t.audio_files && handleDownload(t.audio_files.file_path, t.audio_files.filename)}
                          title="Télécharger l'audio"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onMoveToFolder(t.id)}>
                              Déplacer vers...
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}