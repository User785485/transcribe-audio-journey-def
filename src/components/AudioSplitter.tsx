import { useState, useCallback } from "react";
import { DropZone } from "./DropZone";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChunkProgress, TranscriptionProgress, SUPPORTED_FORMATS, MAX_CHUNK_SIZE, MAX_TRANSCRIPTION_SIZE } from "./AudioConverter/types";
import { Mp3Converter } from "./AudioConverter/Mp3Converter";
import { ChunkDisplay } from "./AudioConverter/ChunkDisplay";
import { TranscriptionDisplay } from "./AudioConverter/TranscriptionDisplay";

export function AudioSplitter() {
  const [splitProgress, setSplitProgress] = useState<ChunkProgress[]>([]);
  const [transcriptionProgress, setTranscriptionProgress] = useState<TranscriptionProgress[]>([]);
  const { toast } = useToast();
  const mp3Converter = new Mp3Converter();

  const splitFile = async (file: File) => {
    const id = crypto.randomUUID();
    const chunks: { number: number; size: number; blob: Blob }[] = [];
    
    setSplitProgress(prev => [...prev, {
      id,
      originalName: file.name,
      chunks: [],
      status: 'splitting'
    }]);

    try {
      // Convert to MP3 first if needed
      const mp3File = await mp3Converter.convertToMp3(file);
      const totalChunks = Math.ceil(mp3File.size / MAX_CHUNK_SIZE);
      
      for (let i = 0; i < totalChunks; i++) {
        const start = i * MAX_CHUNK_SIZE;
        const end = Math.min(start + MAX_CHUNK_SIZE, mp3File.size);
        const chunk = mp3File.slice(start, end, mp3File.type);
        
        const chunkBlob = new Blob([chunk], { type: 'audio/mpeg' });
        chunks.push({
          number: i + 1,
          size: chunkBlob.size,
          blob: chunkBlob
        });

        console.log(`Created chunk ${i + 1}/${totalChunks}:`, {
          size: chunkBlob.size,
          type: chunkBlob.type
        });
      }

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
      console.error('Erreur lors du découpage:', error);
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
        description: `Erreur lors du découpage de ${file.name}`,
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

      console.log('Sending chunk to transcribe-chunks function:', {
        filename: chunkFile.name,
        type: chunkFile.type,
        size: chunkFile.size
      });

      const { data, error } = await supabase.functions.invoke('transcribe-chunks', {
        body: formData,
      });

      if (error) {
        throw new Error(error.message || 'Une erreur est survenue');
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
        splitFile(file);
      } else {
        toast({
          variant: "destructive",
          title: "Fichier trop petit",
          description: "Ce fichier fait moins de 25MB. Utilisez la page 'Nouvelle transcription' pour le transcrire directement.",
        });
      }
    });
  }, []);

  const downloadChunk = (chunk: Blob, originalName: string, chunkNumber: number, totalChunks: number) => {
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
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Découper et transcrire</h2>
        <p className="text-muted-foreground">
          Pour les fichiers de plus de 25MB : déposez votre fichier audio ici pour le découper en parties de 20MB maximum.
          Les fichiers seront automatiquement convertis en MP3 pour une meilleure compatibilité.
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
          onDownloadChunk={downloadChunk}
          onTranscribeChunk={processChunkForTranscription}
        />
      ))}

      {transcriptionProgress.map((item) => (
        <TranscriptionDisplay key={item.id} item={item} />
      ))}
    </div>
  );
}