import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FolderSelect } from "./FolderSelect";

export function TranscriptionHistory() {
  const { toast } = useToast();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isFolderSelectOpen, setIsFolderSelectOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: historyItems, error: historyError } = useQuery({
    queryKey: ['transcription-history'],
    queryFn: async () => {
      console.log('🔍 Fetching transcription history...');
      const { data, error } = await supabase
        .from('history')
        .select('*')
        .eq('file_type', 'transcription')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('❌ Error fetching history:', error);
        throw error;
      }

      console.log('✅ History items fetched:', data);
      return data;
    },
  });

  const { data: folders } = useQuery({
    queryKey: ['folders'],
    queryFn: async () => {
      console.log('🔍 Fetching folders...');
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching folders:', error);
        throw error;
      }

      console.log('✅ Folders fetched:', data);
      return data;
    },
  });

  const moveToFolderMutation = useMutation({
    mutationFn: async ({ historyItem, folderId }: { historyItem: any, folderId: string }) => {
      console.log('🚀 Starting move operation:', { historyItem, folderId });

      if (!historyItem.transcription) {
        console.error('❌ No transcription found in history item');
        throw new Error('Pas de transcription trouvée');
      }

      // 1. Create text file name
      const transcriptionFileName = `${historyItem.filename.split('.')[0]}_transcription.txt`;
      const transcriptionPath = `${folderId}/${transcriptionFileName}`;
      console.log('📝 Will create file:', { transcriptionFileName, transcriptionPath });

      // 2. Create text file blob
      const transcriptionBlob = new Blob([historyItem.transcription], { type: 'text/plain' });
      console.log('📦 Created blob:', { size: transcriptionBlob.size });

      // 3. Upload to storage
      console.log('📤 Uploading to storage...');
      const { error: uploadError } = await supabase.storage
        .from('audio')
        .upload(transcriptionPath, transcriptionBlob, {
          contentType: 'text/plain',
          upsert: true
        });

      if (uploadError) {
        console.error('❌ Storage upload failed:', uploadError);
        throw uploadError;
      }
      console.log('✅ File uploaded to storage');

      // 4. Create audio_files entry
      console.log('📝 Creating audio_files entry...');
      const { error: fileError } = await supabase
        .from('audio_files')
        .insert({
          filename: transcriptionFileName,
          file_path: transcriptionPath,
          file_type: 'text',
          folder_id: folderId
        });

      if (fileError) {
        console.error('❌ Failed to create audio_files entry:', fileError);
        throw fileError;
      }
      console.log('✅ Audio files entry created');

      // 5. Get folder name for history update
      console.log('🔍 Getting folder name...');
      const { data: folderData, error: folderError } = await supabase
        .from('folders')
        .select('name')
        .eq('id', folderId)
        .single();

      if (folderError) {
        console.error('❌ Failed to get folder name:', folderError);
        throw folderError;
      }
      console.log('✅ Got folder name:', folderData.name);

      // 6. Update history entry
      console.log('📝 Updating history entry...');
      const { error: historyError } = await supabase
        .from('history')
        .update({ folder_name: folderData.name })
        .eq('id', historyItem.id);

      if (historyError) {
        console.error('❌ Failed to update history:', historyError);
        throw historyError;
      }
      console.log('✅ History entry updated');

      return { folderName: folderData.name };
    },
    onSuccess: () => {
      console.log('🎉 Move operation completed successfully');
      queryClient.invalidateQueries({ queryKey: ['transcription-history'] });
      queryClient.invalidateQueries({ queryKey: ['folder-files'] });
      toast({
        description: "Transcription déplacée avec succès",
      });
      setIsFolderSelectOpen(false);
      setSelectedItemId(null);
    },
    onError: (error: Error) => {
      console.error('❌ Move operation failed:', error);
      toast({
        variant: "destructive",
        description: `Erreur lors du déplacement: ${error.message}`,
      });
    }
  });

  const handleMoveToFolder = async (folderId: string) => {
    if (!selectedItemId) {
      console.error('❌ No item selected');
      return;
    }

    const historyItem = historyItems?.find(item => item.id === selectedItemId);
    if (!historyItem) {
      console.error('❌ Selected item not found in history');
      return;
    }

    console.log('🎯 Moving item to folder:', { historyItem, folderId });
    await moveToFolderMutation.mutate({ historyItem, folderId });
  };

  if (historyError) {
    console.error('🚨 Error loading history:', historyError);
    return <div>Erreur de chargement des données. Veuillez rafraîchir la page.</div>;
  }

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
                    console.log('🔍 Selected item for transfer:', item);
                    setSelectedItemId(item.id);
                    setIsFolderSelectOpen(true);
                  }}
                  disabled={!!item.folder_name || moveToFolderMutation.isPending}
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
          console.log('🔍 Closing folder select');
          setIsFolderSelectOpen(false);
          setSelectedItemId(null);
        }}
        onSelect={handleMoveToFolder}
      />
    </div>
  );
}