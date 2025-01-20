import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FolderSelect } from "./FolderSelect";

export function TranscriptionHistory() {
  const { toast } = useToast();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isFolderSelectOpen, setIsFolderSelectOpen] = useState(false);

  const { data: historyItems, refetch } = useQuery({
    queryKey: ['transcription-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('history')
        .select('*')
        .eq('file_type', 'transcription')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
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

  const handleMoveToFolder = async (folderId: string) => {
    if (!selectedItemId) return;

    try {
      console.log('Moving transcription to folder:', { selectedItemId, folderId });
      
      // Get the history item
      const historyItem = historyItems?.find(item => item.id === selectedItemId);
      if (!historyItem) throw new Error('Item not found');
      if (!historyItem.transcription) throw new Error('No transcription found');

      // Create a text file in the folder
      const transcriptionFileName = `${historyItem.filename.split('.')[0]}_transcription.txt`;
      const transcriptionPath = `${folderId}/${transcriptionFileName}`;
      
      // Create a Blob from the transcription text
      const transcriptionBlob = new Blob([historyItem.transcription], { type: 'text/plain' });
      
      // First, create the audio_files entry
      const { data: audioFileData, error: dbError } = await supabase
        .from('audio_files')
        .insert({
          filename: transcriptionFileName,
          file_path: transcriptionPath,
          file_type: 'text',
          folder_id: folderId
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      console.log('Created audio_files entry:', audioFileData);

      // Then upload the file to storage
      const { error: storageError } = await supabase.storage
        .from('audio')
        .upload(transcriptionPath, transcriptionBlob, {
          contentType: 'text/plain',
          upsert: true
        });

      if (storageError) {
        console.error('Storage error:', storageError);
        // Rollback the database entry if storage upload fails
        await supabase.from('audio_files').delete().eq('id', audioFileData.id);
        throw storageError;
      }

      console.log('Uploaded file to storage:', transcriptionPath);

      // Update the history item to mark it as moved
      const { error: historyError } = await supabase
        .from('history')
        .update({ folder_name: folderId })
        .eq('id', selectedItemId);

      if (historyError) {
        console.error('History error:', historyError);
        throw historyError;
      }

      console.log('Updated history item');

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

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fichier</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {historyItems?.map(item => (
            <TableRow key={item.id}>
              <TableCell>{item.filename}</TableCell>
              <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                <Button
                  onClick={() => {
                    setSelectedItemId(item.id);
                    setIsFolderSelectOpen(true);
                  }}
                  disabled={!!item.folder_name}
                >
                  {item.folder_name ? 'Déjà transféré' : 'Déplacer vers un dossier'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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