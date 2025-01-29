import { useState } from 'react';
import { Database } from '@/integrations/supabase/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileAudio, Copy, Download, MoreVertical, Plus, FolderInput } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { SUPPORTED_FORMATS } from '../../components/DropZone';
import { FolderSelect } from '../FolderSelect';
import { useQuery } from '@tanstack/react-query';

type Transcription = Database['public']['Tables']['transcriptions']['Row'] & {
  audio_files: Database['public']['Tables']['audio_files']['Row'] | null;
};

interface FolderContentsProps {
  transcriptions: Transcription[];
  onMoveToFolder: (transcriptionId: string) => void;
  searchTerm: string;
  folderId: string | null;
}

export function FolderContents({ transcriptions, onMoveToFolder, searchTerm, folderId }: FolderContentsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("to_convert");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isFolderSelectOpen, setIsFolderSelectOpen] = useState(false);
  const [selectedTranscriptionId, setSelectedTranscriptionId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: folders } = useQuery({
    queryKey: ['folders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleMoveToFolder = async (folderId: string) => {
    if (!selectedTranscriptionId) return;

    try {
      const transcription = transcriptions.find(t => t.id === selectedTranscriptionId);
      if (!transcription?.audio_files) throw new Error('Audio file not found');

      const { error: audioFileError } = await supabase
        .from('audio_files')
        .update({ folder_id: folderId })
        .eq('id', transcription.audio_files.id);

      if (audioFileError) throw audioFileError;

      toast({
        description: "Fichier déplacé avec succès",
      });

      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['transcriptions'] });
      setIsFolderSelectOpen(false);
      setSelectedTranscriptionId(null);
    } catch (error) {
      console.error('Error moving file to folder:', error);
      toast({
        variant: "destructive",
        description: "Erreur lors du déplacement du fichier",
      });
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    try {
      console.log('Files dropped:', acceptedFiles);
      for (const file of acceptedFiles) {
        const filePath = `public/${crypto.randomUUID()}.${file.name.split('.').pop()}`;
        
        console.log('Uploading file to path:', filePath);
        const { error: uploadError } = await supabase.storage
          .from('audio')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        console.log('File uploaded successfully, creating database entry');
        const { error: dbError } = await supabase
          .from('audio_files')
          .insert({
            filename: file.name,
            file_path: filePath,
            file_type: activeTab,
            folder_id: folderId
          });

        if (dbError) {
          console.error('Database error:', dbError);
          throw dbError;
        }
      }

      toast({
        description: "Fichier(s) ajouté(s) avec succès",
      });
      
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['transcriptions', 'unorganized'] });
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Erreur lors de l\'ajout du fichier:', error);
      toast({
        variant: "destructive",
        description: "Erreur lors de l'ajout du fichier",
      });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: SUPPORTED_FORMATS
  });

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

  const getTabTitle = (type: string) => {
    switch (type) {
      case 'to_convert':
        return 'À convertir';
      case 'converted':
        return 'Convertis';
      case 'transcription':
        return 'Transcriptions';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="to_convert">À convertir</TabsTrigger>
              <TabsTrigger value="converted">Convertis</TabsTrigger>
              <TabsTrigger value="transcription">Transcriptions</TabsTrigger>
            </TabsList>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Ajouter un fichier
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un fichier {getTabTitle(activeTab).toLowerCase()}</DialogTitle>
                </DialogHeader>
                <div {...getRootProps()} className="border-2 border-dashed rounded-lg p-6 cursor-pointer hover:border-primary transition-colors">
                  <input {...getInputProps()} />
                  <div className="text-center space-y-2">
                    <p className="text-muted-foreground">
                      {isDragActive ? "Déposez les fichiers ici..." : "Glissez-déposez des fichiers ici, ou cliquez pour sélectionner"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Formats supportés : {Object.values(SUPPORTED_FORMATS).flat().join(', ')}
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <TabsContent value={activeTab}>
            <div className="rounded-lg border">
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
                  {filteredTranscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Aucun fichier trouvé dans cette catégorie
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTranscriptions.map((t) => (
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
                              onClick={() => t.transcription && handleCopy(t.transcription)}
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
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                setSelectedTranscriptionId(t.id);
                                setIsFolderSelectOpen(true);
                              }}
                              title="Déplacer vers un dossier"
                            >
                              <FolderInput className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <FolderSelect
        folders={folders || []}
        isOpen={isFolderSelectOpen}
        onClose={() => {
          setIsFolderSelectOpen(false);
          setSelectedTranscriptionId(null);
        }}
        onSelect={handleMoveToFolder}
      />
    </div>
  );
}
