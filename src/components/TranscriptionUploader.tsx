import { useState, useCallback } from "react";
import { DropZone } from "./DropZone";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileAudio, Copy, Download, FolderInput } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { FolderSelect } from "./FolderSelect";

export const SUPPORTED_FORMATS = {
  'audio/flac': ['.flac'],
  'audio/m4a': ['.m4a'],
  'audio/mpeg': ['.mp3', '.mpeg', '.mpga'],
  'audio/ogg': ['.oga', '.ogg'],
  'audio/wav': ['.wav'],
  'audio/webm': ['.webm'],
  'video/mp4': ['.mp4'],
  'audio/opus': ['.opus']
};

export const MAX_TRANSCRIPTION_SIZE = 25 * 1024 * 1024; // 25MB

export function TranscriptionUploader() {
  const [transcriptionProgress, setTranscriptionProgress] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isFolderSelectOpen, setIsFolderSelectOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const processFile = async (file) => {
    const id = crypto.randomUUID();
    
    if (file.size > MAX_TRANSCRIPTION_SIZE) {
      toast({
        title: "Fichier trop volumineux",
        description: "Redirection vers l'outil de découpage...",
      });
      navigate("/split");
      return;
    }

    setTranscriptionProgress(prev => [...prev, {
      id,
      filename: file.name,
      progress: 0,
      status: 'pending'
    }]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      setTranscriptionProgress(prev => prev.map(p => 
        p.id === id ? {
          ...p,
          status: 'transcribing',
          progress: 50
        } : p
      ));

      console.log('📤 Envoi du fichier pour transcription:', {
        filename: file.name,
        size: file.size,
        type: file.type
      });

      // Créer un blob à partir du fichier pour s'assurer que le type MIME est correct
      const audioBlob = new Blob([file], { type: file.type });
      const formDataForFunction = new FormData();
      formDataForFunction.append('file', audioBlob, file.name);

      const { data, error } = await supabase.functions.invoke('transcribe-simple', {
        body: formDataForFunction,
      });

      if (error) {
        console.error('❌ Erreur de transcription:', error);
        throw new Error(error.message || 'Une erreur est survenue');
      }

      console.log('✅ Réponse de transcription reçue:', data);

      setTranscriptionProgress(prev => prev.map(p => 
        p.id === id ? {
          ...p,
          status: 'completed',
          progress: 100,
          transcription: data.data.transcription.transcription
        } : p
      ));
      
      toast({
        title: "Transcription terminée",
        description: `Le fichier ${file.name} a été transcrit avec succès.`,
      });
    } catch (error) {
      console.error('❌ Erreur:', error);
      
      let errorMessage = 'Une erreur est survenue';
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('Stack trace:', error.stack);
      }
      
      setTranscriptionProgress(prev => prev.map(p => 
        p.id === id ? {
          ...p,
          status: 'error',
          progress: 100,
          error: errorMessage
        } : p
      ));
      
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de la transcription de ${file.name}: ${errorMessage}`,
      });
    }
  };

  const handleDrop = useCallback((acceptedFiles) => {
    acceptedFiles.forEach(processFile);
  }, []);

  const handleCopyTranscription = (transcription) => {
    navigator.clipboard.writeText(transcription);
    toast({
      description: "Transcription copiée dans le presse-papier",
    });
  };

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

  const { data: historyItems, isLoading: isHistoryLoading, refetch } = useQuery({
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

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast({
      description: "Texte copié dans le presse-papier",
    });
  };

  const handleDownload = async (filePath, filename) => {
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

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Nouvelle transcription</h2>
        <p className="text-muted-foreground">
          Déposez vos fichiers audio ici (25MB maximum). Pour les fichiers plus volumineux, utilisez l'outil de découpage.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, index) => (
          <DropZone
            key={index}
            onDrop={handleDrop}
            supportedFormats={SUPPORTED_FORMATS}
            index={index}
          />
        ))}
      </div>

      {transcriptionProgress.map((item) => (
        <div key={item.id} className="space-y-4 border rounded-lg p-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">{item.filename}</h3>
            <span className="text-sm text-muted-foreground">
              {item.status === 'pending' && 'En attente...'}
              {item.status === 'transcribing' && 'Transcription en cours...'}
              {item.status === 'completed' && 'Terminé'}
              {item.status === 'error' && 'Erreur'}
            </span>
          </div>
          
          <Progress value={item.progress} className="w-full" />
          
          {item.status === 'transcribing' && (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <p>Transcription en cours...</p>
            </div>
          )}

          {item.status === 'completed' && item.transcription && (
            <div className="rounded-lg bg-card p-4">
              <p className="whitespace-pre-wrap mb-4">{item.transcription}</p>
              <Button
                onClick={() => handleCopyTranscription(item.transcription!)}
                size="sm"
              >
                Copier le texte
              </Button>
            </div>
          )}

          {item.status === 'error' && (
            <div className="text-destructive space-y-2">
              <p className="font-medium">Erreur :</p>
              <p className="text-sm">{item.error}</p>
            </div>
          )}
        </div>
      ))}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Dernières transcriptions</CardTitle>
        </CardHeader>
        <CardContent>
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
                {isHistoryLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : !historyItems?.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Aucune transcription trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  historyItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="flex items-center gap-2">
                        <FileAudio className="w-4 h-4" />
                        {item.filename}
                      </TableCell>
                      <TableCell>
                        {format(new Date(item.created_at), 'PPP', { locale: fr })}
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
