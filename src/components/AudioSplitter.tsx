import { useState, useCallback } from "react";
import { DropZone } from "./DropZone";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChunkProgress, TranscriptionProgress } from "./AudioConverter/types";
import { AudioAnalyzer } from "./AudioConverter/AudioAnalyzer";
import { AudioChunker } from "./AudioConverter/AudioSplitter";
import { ChunkDisplay } from "./AudioConverter/ChunkDisplay";
import { TranscriptionDisplay } from "./AudioConverter/TranscriptionDisplay";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FileAudio, Download } from "lucide-react";
import { Loader2 } from "lucide-react";

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

export function AudioSplitter() {
  const [splitProgress, setSplitProgress] = useState<ChunkProgress[]>([]);
  const [transcriptionProgress, setTranscriptionProgress] = useState<TranscriptionProgress[]>([]);
  const { toast } = useToast();

  const audioAnalyzer = new AudioAnalyzer();
  const audioChunker = new AudioChunker();

  const processFile = async (file: File) => {
    const id = crypto.randomUUID();
    
    setSplitProgress(prev => [...prev, {
      id,
      originalName: file.name,
      chunks: [],
      status: 'splitting'
    }]);

    try {
      // Analyze file
      const metadata = await audioAnalyzer.analyzeFile(file);
      console.log('File metadata:', metadata);

      // Split into chunks
      const rawChunks = await audioChunker.splitFile(file);
      
      const chunks = rawChunks.map((blob, index) => ({
        number: index + 1,
        size: blob.size,
        blob
      }));

      setSplitProgress(prev => prev.map(p => 
        p.id === id ? {
          ...p,
          chunks,
          status: 'completed'
        } : p
      ));

      toast({
        title: "Découpage terminé",
        description: `Le fichier ${file.name} a été découpé en ${chunks.length} parties.`,
      });
    } catch (error) {
      console.error('Error processing file:', error);
      setSplitProgress(prev => prev.map(p => 
        p.id === id ? {
          ...p,
          status: 'error',
          error: error instanceof Error ? error.message : "Une erreur est survenue"
        } : p
      ));

      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors du traitement de ${file.name}: ${error instanceof Error ? error.message : "Une erreur est survenue"}`,
      });
    }
  };

  const processChunkForTranscription = async (chunk: Blob, originalName: string, chunkNumber: number, totalChunks: number) => {
    const id = crypto.randomUUID();
    const fileExtension = originalName.split('.').pop() || '';
    const chunkFileName = `${originalName.replace(`.${fileExtension}`, '')}_partie${chunkNumber}de${totalChunks}.${fileExtension}`;
    const chunkFile = new File([chunk], chunkFileName, { type: chunk.type });

    console.log('Processing chunk for transcription:', {
      filename: chunkFileName,
      type: chunkFile.type,
      size: chunk.size
    });

    setTranscriptionProgress(prev => [...prev, {
      id,
      filename: chunkFile.name,
      progress: 0,
      status: 'pending'
    }]);

    try {
      // Upload the chunk to storage first
      const chunkPath = `splits/${chunkFileName}`;
      const { error: uploadError } = await supabase.storage
        .from('audio')
        .upload(chunkPath, chunk, {
          contentType: chunk.type,
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading chunk:', uploadError);
        throw uploadError;
      }

      console.log('Chunk uploaded successfully to:', chunkPath);

      // Create history entry
      const { data: historyData, error: historyError } = await supabase
        .from('history')
        .insert({
          filename: chunkFileName,
          file_path: chunkPath,
          file_type: 'split'
        })
        .select()
        .single();

      if (historyError) {
        console.error('Error creating history entry:', historyError);
        throw historyError;
      }

      console.log('History entry created:', historyData);

      const formData = new FormData();
      formData.append('file', chunkFile);
      formData.append('language', 'fr');
      formData.append('chunkIndex', chunkNumber.toString());
      formData.append('totalChunks', totalChunks.toString());
      
      setTranscriptionProgress(prev => prev.map(p => 
        p.id === id ? {
          ...p,
          status: 'transcribing',
          progress: 50
        } : p
      ));

      const { data, error } = await supabase.functions.invoke('transcribe-chunks', {
        body: formData,
      });

      if (error) {
        throw new Error(error.message || 'Une erreur est survenue');
      }

      // Update history entry with transcription
      const { error: updateError } = await supabase
        .from('history')
        .update({
          transcription: data.data.transcription.transcription
        })
        .eq('id', historyData.id);

      if (updateError) {
        console.error('Error updating history with transcription:', updateError);
        throw updateError;
      }

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
        description: `La partie ${chunkNumber} de ${originalName} a été transcrite.`,
      });
    } catch (error) {
      console.error('Error during transcription:', error);
      setTranscriptionProgress(prev => prev.map(p => 
        p.id === id ? {
          ...p,
          status: 'error',
          progress: 100,
          error: error instanceof Error ? error.message : "Une erreur est survenue"
        } : p
      ));
      
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de la transcription de la partie ${chunkNumber}: ${error instanceof Error ? error.message : "Une erreur est survenue"}`,
      });
    }
  };

  const handleDrop = useCallback((files: File[]) => {
    files.forEach(file => {
      if (file.size > MAX_TRANSCRIPTION_SIZE) {
        processFile(file);
      } else {
        toast({
          variant: "destructive",
          title: "Fichier trop petit",
          description: "Ce fichier fait moins de 25MB. Utilisez la page 'Nouvelle transcription' pour le transcrire directement.",
        });
      }
    });
  }, []);

  const { data: splitHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['split-history'],
    queryFn: async () => {
      console.log('Fetching split history...');
      const { data, error } = await supabase
        .from('history')
        .select('*')
        .eq('file_type', 'split')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching split history:', error);
        throw error;
      }
      
      console.log('Split history fetched:', data);
      return data;
    },
  });

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
      console.error('Download error:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de télécharger le fichier audio",
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Découper et transcrire</h2>
        <p className="text-muted-foreground">
          Pour les fichiers de plus de 25MB : déposez votre fichier audio ici pour le découper en parties de 20MB maximum.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <DropZone
          onDrop={handleDrop}
          supportedFormats={SUPPORTED_FORMATS}
          index={0}
        />
      </div>

      {splitProgress.map((item) => (
        <ChunkDisplay
          key={item.id}
          item={item}
          onDownloadChunk={(chunk, originalName, chunkNumber, totalChunks) => {
            const extension = originalName.split('.').pop();
            const nameWithoutExt = originalName.replace(`.${extension}`, '');
            const newFileName = `${nameWithoutExt}_partie${chunkNumber}de${totalChunks}.${extension}`;
            
            const url = URL.createObjectURL(chunk);
            const a = document.createElement('a');
            a.href = url;
            a.download = newFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
          onTranscribeChunk={processChunkForTranscription}
        />
      ))}

      {transcriptionProgress.map((item) => (
        <TranscriptionDisplay key={item.id} item={item} />
      ))}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Derniers fichiers découpés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fichier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isHistoryLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : !splitHistory?.length ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Aucun fichier découpé trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  splitHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="flex items-center gap-2">
                        <FileAudio className="w-4 h-4" />
                        {item.filename}
                      </TableCell>
                      <TableCell>
                        {format(new Date(item.created_at), 'PPP', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDownload(item.file_path, item.filename)}
                          title="Télécharger l'audio"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
