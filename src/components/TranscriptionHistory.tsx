import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download, Copy, Search, FileAudio, FolderPlus, Folder, ChevronRight, ChevronDown, MoreVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FolderSelect } from './FolderSelect';

type Transcription = Database['public']['Tables']['transcriptions']['Row'] & {
  audio_files: Database['public']['Tables']['audio_files']['Row'] | null;
};

type Folder = Database['public']['Tables']['folders']['Row'] & {
  transcriptions: Transcription[];
  subfolders: Folder[];
};

export function TranscriptionHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isFolderSelectOpen, setIsFolderSelectOpen] = useState(false);
  const [selectedTranscription, setSelectedTranscription] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch folders and their contents
  const { data: folders, isLoading: foldersLoading, refetch: refetchFolders } = useQuery({
    queryKey: ['folders'],
    queryFn: async () => {
      console.log('Fetching folders...');
      const { data: foldersData, error: foldersError } = await supabase
        .from('folders')
        .select('*')
        .is('parent_id', null)
        .order('name');

      if (foldersError) throw foldersError;

      // Fetch subfolders and contents recursively
      const foldersWithContents = await Promise.all(
        foldersData.map(async (folder) => {
          const contents = await fetchFolderContents(folder.id);
          return { ...folder, ...contents };
        })
      );

      console.log('Folders fetched:', foldersWithContents);
      return foldersWithContents;
    },
  });

  // Fetch transcriptions that are not in any folder
  const { data: unorganizedTranscriptions, isLoading: transcriptionsLoading } = useQuery({
    queryKey: ['transcriptions', 'unorganized'],
    queryFn: async () => {
      console.log('Fetching unorganized transcriptions...');
      const { data, error } = await supabase
        .from('transcriptions')
        .select(`
          *,
          audio_files (*)
        `)
        .is('folder_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Unorganized transcriptions:', data);
      return data as Transcription[];
    },
  });

  const fetchFolderContents = async (folderId: string) => {
    const [subfolders, transcriptions] = await Promise.all([
      supabase
        .from('folders')
        .select('*')
        .eq('parent_id', folderId)
        .order('name'),
      supabase
        .from('transcriptions')
        .select(`
          *,
          audio_files (*)
        `)
        .eq('folder_id', folderId)
        .order('created_at', { ascending: false }),
    ]);

    if (subfolders.error) throw subfolders.error;
    if (transcriptions.error) throw transcriptions.error;

    const subfoldersWithContents = await Promise.all(
      subfolders.data.map(async (subfolder) => {
        const contents = await fetchFolderContents(subfolder.id);
        return { ...subfolder, ...contents };
      })
    );

    return {
      subfolders: subfoldersWithContents,
      transcriptions: transcriptions.data as Transcription[],
    };
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast({
        variant: "destructive",
        description: "Le nom du dossier ne peut pas être vide",
      });
      return;
    }

    const { error } = await supabase
      .from('folders')
      .insert({
        name: newFolderName,
        parent_id: selectedFolder,
      });

    if (error) {
      console.error('Error creating folder:', error);
      toast({
        variant: "destructive",
        description: "Erreur lors de la création du dossier",
      });
      return;
    }

    toast({
      description: "Dossier créé avec succès",
    });
    setNewFolderName('');
    setIsCreateFolderOpen(false);
    refetchFolders();
  };

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

  const handleMoveToFolder = async (transcriptionId: string, folderId: string) => {
    console.log('Moving transcription to folder:', { transcriptionId, folderId });
    const { error } = await supabase
      .from('transcriptions')
      .update({ folder_id: folderId })
      .eq('id', transcriptionId);

    if (error) {
      console.error('Error moving transcription:', error);
      toast({
        variant: "destructive",
        description: "Erreur lors du déplacement de la transcription",
      });
      return;
    }

    // Also move the associated audio file
    const transcription = unorganizedTranscriptions?.find(t => t.id === transcriptionId);
    if (transcription?.audio_files?.id) {
      const { error: audioError } = await supabase
        .from('audio_files')
        .update({ folder_id: folderId })
        .eq('id', transcription.audio_files.id);

      if (audioError) {
        console.error('Error moving audio file:', audioError);
        toast({
          variant: "destructive",
          description: "Erreur lors du déplacement du fichier audio",
        });
        return;
      }
    }

    toast({
      description: "Fichier déplacé avec succès",
    });
    setIsFolderSelectOpen(false);
    setSelectedTranscription(null);
    queryClient.invalidateQueries({ queryKey: ['folders'] });
    queryClient.invalidateQueries({ queryKey: ['transcriptions', 'unorganized'] });
  };

  const renderFolderContents = (folder: Folder) => {
    const filteredTranscriptions = folder.transcriptions?.filter(t =>
      t.transcription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.audio_files?.filename.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-4">
        {folder.subfolders?.length > 0 && (
          <div className="space-y-2">
            {folder.subfolders.map((subfolder) => (
              <div key={subfolder.id} className="pl-4">
                <div className="flex items-center gap-2 p-2 hover:bg-accent rounded-lg cursor-pointer">
                  <ChevronRight className="w-4 h-4" />
                  <Folder className="w-4 h-4" />
                  <span>{subfolder.name}</span>
                </div>
                {renderFolderContents(subfolder)}
              </div>
            ))}
          </div>
        )}
        
        {filteredTranscriptions?.length > 0 && (
          <div className="pl-4">
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
                      {renderTranscriptionActions(t)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  };

  const renderTranscriptionActions = (t: Transcription) => (
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
          <DropdownMenuItem onClick={() => {
            setSelectedTranscription(t.id);
            setIsFolderSelectOpen(true);
          }}>
            Déplacer vers...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  if (foldersLoading || transcriptionsLoading) {
    return <div className="flex justify-center p-8">Chargement...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans les transcriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
          <DialogTrigger asChild>
            <Button>
              <FolderPlus className="w-4 h-4 mr-2" />
              Nouveau dossier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un nouveau dossier</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Nom du dossier"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
              <Button onClick={handleCreateFolder}>
                Créer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        {folders?.map((folder) => (
          <div key={folder.id} className="p-4">
            <div className="flex items-center gap-2 p-2 hover:bg-accent rounded-lg cursor-pointer">
              <ChevronDown className="w-4 h-4" />
              <Folder className="w-4 h-4" />
              <span className="font-medium">{folder.name}</span>
            </div>
            {renderFolderContents(folder)}
          </div>
        ))}

        {unorganizedTranscriptions && unorganizedTranscriptions.length > 0 && (
          <div className="p-4">
            <div className="font-medium mb-4">Fichiers non classés</div>
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
                {unorganizedTranscriptions.map((t) => (
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
                      {renderTranscriptionActions(t)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <FolderSelect
        folders={folders || []}
        isOpen={isFolderSelectOpen}
        onClose={() => {
          setIsFolderSelectOpen(false);
          setSelectedTranscription(null);
        }}
        onSelect={(folderId) => {
          if (selectedTranscription) {
            handleMoveToFolder(selectedTranscription, folderId);
          }
        }}
      />
    </div>
  );
}
