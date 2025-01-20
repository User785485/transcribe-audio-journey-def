import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileAudio, Copy, Download, FolderInput } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FolderSelect } from './FolderSelect';

type HistoryItem = {
  id: string;
  filename: string;
  file_path: string;
  transcription: string | null;
  file_type: string;
  folder_name: string | null;
  created_at: string;
};

export function TranscriptionHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isFolderSelectOpen, setIsFolderSelectOpen] = useState(false);
  const { toast } = useToast();

  const { data: historyItems, isLoading, refetch } = useQuery({
    queryKey: ['history'],
    queryFn: async () => {
      console.log('Fetching history items...');
      const { data, error } = await supabase
        .from('history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching history:', error);
        throw error;
      }

      console.log('History items fetched:', data);
      return data as HistoryItem[];
    },
  });

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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      description: "Texte copié dans le presse-papier",
    });
  };

  const handleDownload = async (filePath: string, filename: string) => {
    try {
      console.log('Downloading file:', { filePath, filename });
      const { data, error } = await supabase.storage
        .from('audio')
        .download(filePath);

      if (error) {
        console.error('Error downloading file:', error);
        throw error;
      }

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log('File downloaded successfully');
    } catch (error) {
      console.error('Error in handleDownload:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de télécharger le fichier audio",
      });
    }
  };

  const handleMoveToFolder = async (folderId: string) => {
    if (!selectedItemId) return;

    try {
      console.log('Moving transcription to folder:', { selectedItemId, folderId });
      
      // Get the history item
      const historyItem = historyItems?.find(item => item.id === selectedItemId);
      if (!historyItem) throw new Error('Item not found');
      if (!historyItem.transcription) throw new Error('No transcription found');

      // Get the folder name
      const { data: folderData } = await supabase
        .from('folders')
        .select('name')
        .eq('id', folderId)
        .single();

      if (!folderData) throw new Error('Folder not found');

      // Create a text file in the folder with the transcription
      const transcriptionFileName = `${historyItem.filename.split('.')[0]}_transcription.txt`;
      const transcriptionPath = `${folderId}/${transcriptionFileName}`;

      // Store the transcription text file
      const transcriptionBlob = new Blob([historyItem.transcription], { type: 'text/plain' });
      const { error: storageError } = await supabase.storage
        .from('audio')
        .upload(transcriptionPath, transcriptionBlob, {
          contentType: 'text/plain',
          upsert: true
        });

      if (storageError) throw storageError;

      // Update the history item with the folder name
      const { error: historyError } = await supabase
        .from('history')
        .update({ folder_name: folderData.name })
        .eq('id', selectedItemId);

      if (historyError) throw historyError;

      toast({
        description: "Transcription déplacée avec succès",
      });

      // Refresh the data
      refetch();

      setIsFolderSelectOpen(false);
      setSelectedItemId(null);
    } catch (error) {
      console.error('Error moving transcription to folder:', error);
      toast({
        variant: "destructive",
        description: "Erreur lors du déplacement de la transcription",
      });
    }
  };

  const filteredItems = historyItems?.filter(item =>
    item.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.transcription?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold">Historique</CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher dans l'historique..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fichier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Transcription</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!filteredItems?.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Aucun fichier trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="flex items-center gap-2">
                        <FileAudio className="w-4 h-4" />
                        {item.filename}
                      </TableCell>
                      <TableCell>
                        {format(new Date(item.created_at), 'PPP', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        {item.file_type === 'to_convert' ? 'À convertir' :
                         item.file_type === 'converted' ? 'Converti' : 'Transcription'}
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {item.transcription}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {item.transcription && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleCopy(item.transcription!)}
                              title="Copier la transcription"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDownload(item.file_path, item.filename)}
                            title="Télécharger l'audio"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {item.transcription && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                setSelectedItemId(item.id);
                                setIsFolderSelectOpen(true);
                              }}
                              title="Déplacer la transcription vers un dossier"
                            >
                              <FolderInput className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <FolderSelect
        folders={folders || []}
        isOpen={isFolderSelectOpen}
        onClose={() => {
          setIsFolderSelectOpen(false);
          setSelectedItemId(null);
        }}
        onSelect={handleMoveToFolder}
      />
    </div>
  );
}
