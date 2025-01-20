import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Search, FolderPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FolderSelect } from './FolderSelect';
import { FolderTree } from './TranscriptionList/FolderTree';
import { FolderContents } from './TranscriptionList/FolderContents';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const renameFolderMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      console.log('Renaming folder:', { id, name });
      const { error } = await supabase
        .from('folders')
        .update({ name })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast({
        description: "Dossier renommé avec succès",
      });
    },
    onError: (error) => {
      console.error('Error renaming folder:', error);
      toast({
        variant: "destructive",
        description: "Erreur lors du renommage du dossier",
      });
    },
  });

  const toggleFolder = (folderId: string) => {
    const newOpenFolders = new Set(openFolders);
    if (newOpenFolders.has(folderId)) {
      newOpenFolders.delete(folderId);
    } else {
      newOpenFolders.add(folderId);
    }
    setOpenFolders(newOpenFolders);
  };

  if (foldersLoading || transcriptionsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-lg text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold">Base de données</CardTitle>
          <div className="flex items-center space-x-4">
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
                <Button className="gap-2">
                  <FolderPlus className="w-4 h-4" />
                  Nouveau dossier
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un nouveau dossier</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    placeholder="Nom du dossier"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                  />
                  <Button onClick={handleCreateFolder} className="w-full">
                    Créer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <Separator className="mb-6" />
        <CardContent className="space-y-6">
          {folders?.map((folder) => (
            <FolderTree
              key={folder.id}
              folder={folder}
              searchTerm={searchTerm}
              onMoveToFolder={(transcriptionId) => {
                setSelectedTranscription(transcriptionId);
                setIsFolderSelectOpen(true);
              }}
              onRenameFolder={(id, name) => renameFolderMutation.mutate({ id, name })}
              openFolders={openFolders}
              onToggleFolder={toggleFolder}
            />
          ))}

          {unorganizedTranscriptions && unorganizedTranscriptions.length > 0 && (
            <div className="rounded-lg border bg-card p-6">
              <div className="font-medium text-lg mb-4">Fichiers non classés</div>
              <FolderContents
                transcriptions={unorganizedTranscriptions}
                onMoveToFolder={(transcriptionId) => {
                  setSelectedTranscription(transcriptionId);
                  setIsFolderSelectOpen(true);
                }}
                searchTerm={searchTerm}
                folderId={null}
              />
            </div>
          )}
        </CardContent>
      </Card>

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
