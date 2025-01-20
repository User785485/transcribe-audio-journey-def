import { useState } from 'react';
import { Database } from '@/integrations/supabase/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileAudio, Copy, Download, MoreVertical, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from '@tanstack/react-query';

type Transcription = Database['public']['Tables']['transcriptions']['Row'] & {
  audio_files: Database['public']['Tables']['audio_files']['Row'] | null;
};

interface FolderContentsProps {
  transcriptions: Transcription[];
  onMoveToFolder: (transcriptionId: string) => void;
  searchTerm: string;
  folderId?: string;
}

export function FolderContents({ transcriptions, onMoveToFolder, searchTerm, folderId }: FolderContentsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("to_convert");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newTranscription, setNewTranscription] = useState('');
  const queryClient = useQueryClient();

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

  const handleAddContent = async () => {
    try {
      if (activeTab === 'transcription' && !newTranscription) {
        toast({
          variant: "destructive",
          description: "Veuillez entrer une transcription",
        });
        return;
      }

      if ((activeTab === 'to_convert' || activeTab === 'converted') && !newFileName) {
        toast({
          variant: "destructive",
          description: "Veuillez entrer un nom de fichier",
        });
        return;
      }

      // Create audio file entry if needed
      let audioFileId;
      if (activeTab !== 'transcription') {
        const { data: audioFile, error: audioError } = await supabase
          .from('audio_files')
          .insert({
            filename: newFileName,
            file_path: `manual/${newFileName}`,
            file_type: activeTab,
            folder_id: folderId
          })
          .select()
          .single();

        if (audioError) throw audioError;
        audioFileId = audioFile.id;
      }

      // Create transcription if in transcription tab
      if (activeTab === 'transcription') {
        const { error: transcriptionError } = await supabase
          .from('transcriptions')
          .insert({
            transcription: newTranscription,
            folder_id: folderId,
            audio_file_id: audioFileId
          });

        if (transcriptionError) throw transcriptionError;
      }

      toast({
        description: "Contenu ajouté avec succès",
      });
      
      setIsAddDialogOpen(false);
      setNewFileName('');
      setNewTranscription('');
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['transcriptions', 'unorganized'] });
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      toast({
        variant: "destructive",
        description: "Erreur lors de l'ajout du contenu",
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
          <TabsContent key={tabValue} value={tabValue} className="relative">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="absolute right-0 -top-12 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter {tabValue === 'transcription' ? 'une transcription' : 'un fichier'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    Ajouter {tabValue === 'transcription' ? 'une transcription' : 'un fichier'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  {tabValue === 'transcription' ? (
                    <Textarea
                      placeholder="Entrez la transcription..."
                      value={newTranscription}
                      onChange={(e) => setNewTranscription(e.target.value)}
                      className="min-h-[200px]"
                    />
                  ) : (
                    <Input
                      placeholder="Nom du fichier"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                    />
                  )}
                  <Button onClick={handleAddContent} className="w-full">
                    Ajouter
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

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