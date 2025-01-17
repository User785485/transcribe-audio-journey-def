import { useState, useCallback } from "react";
import { DropZone } from "./DropZone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SUPPORTED_FORMATS = {
  'audio/opus': ['.opus'],
  'audio/ogg': ['.ogg'],
  'audio/mpeg': ['.mp3'],
  'audio/flac': ['.flac'],
  'audio/m4a': ['.m4a'],
  'audio/wav': ['.wav'],
  'audio/webm': ['.webm'],
  'video/mp4': ['.mp4']
};

const MAX_CHUNK_SIZE = 20 * 1024 * 1024; // 20MB for splitting
const MAX_TRANSCRIPTION_SIZE = 25 * 1024 * 1024; // 25MB for Whisper API

interface ChunkProgress {
  id: string;
  originalName: string;
  chunks: {
    number: number;
    size: number;
    blob: Blob;
  }[];
  status: 'splitting' | 'completed' | 'error';
  error?: string;
}

interface TranscriptionProgress {
  id: string;
  filename: string;
  progress: number;
  status: 'pending' | 'transcribing' | 'completed' | 'error';
  transcription?: string;
  error?: string;
}

export function AudioSplitter() {
  const [splitProgress, setSplitProgress] = useState<ChunkProgress[]>([]);
  const [transcriptionProgress, setTranscriptionProgress] = useState<TranscriptionProgress[]>([]);
  const { toast } = useToast();

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
      const totalChunks = Math.ceil(file.size / MAX_CHUNK_SIZE);
      
      for (let i = 0; i < totalChunks; i++) {
        const start = i * MAX_CHUNK_SIZE;
        const end = Math.min(start + MAX_CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        
        const chunkBlob = new Blob([chunk], { type: file.type });
        chunks.push({
          number: i + 1,
          size: chunkBlob.size,
          blob: chunkBlob
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
    const chunkFile = new File([chunk], `${originalName}_partie${chunkNumber}de${totalChunks}`, { type: chunk.type });

    setTranscriptionProgress(prev => [...prev, {
      id,
      filename: chunkFile.name,
      progress: 0,
      status: 'pending'
    }]);

    try {
      const formData = new FormData();
      formData.append('file', chunkFile);
      
      setTranscriptionProgress(prev => prev.map(p => 
        p.id === id ? {
          ...p,
          status: 'transcribing',
          progress: 50
        } : p
      ));

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
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
          Vous pourrez ensuite télécharger ou transcrire chaque partie.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <DropZone
          onDrop={handleDrop}
          supportedFormats={SUPPORTED_FORMATS}
          index={0}
        />
      </div>

      {splitProgress.map((item) => (
        <div key={item.id} className="space-y-4 border rounded-lg p-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">{item.originalName}</h3>
            <span className="text-sm text-muted-foreground">
              {item.status === 'splitting' && 'Découpage en cours...'}
              {item.status === 'completed' && 'Terminé'}
              {item.status === 'error' && 'Erreur'}
            </span>
          </div>
          
          {item.status === 'splitting' && (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <p>Découpage en cours...</p>
            </div>
          )}

          {item.status === 'completed' && (
            <div className="space-y-4">
              <p>Fichier découpé en {item.chunks.length} parties</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {item.chunks.map((chunk) => (
                  <div key={chunk.number} className="flex gap-2">
                    <Button
                      onClick={() => downloadChunk(chunk.blob, item.originalName, chunk.number, item.chunks.length)}
                      variant="outline"
                      className="flex-1"
                    >
                      Partie {chunk.number} ({Math.round(chunk.size / 1024 / 1024)}MB)
                    </Button>
                    <Button
                      onClick={() => processChunkForTranscription(chunk.blob, item.originalName, chunk.number, item.chunks.length)}
                      variant="secondary"
                    >
                      Transcrire
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {item.status === 'error' && (
            <p className="text-destructive">{item.error}</p>
          )}
        </div>
      ))}

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
                onClick={() => {
                  navigator.clipboard.writeText(item.transcription!);
                  toast({
                    description: "Transcription copiée dans le presse-papier",
                  });
                }}
                size="sm"
              >
                Copier le texte
              </Button>
            </div>
          )}

          {item.status === 'error' && (
            <p className="text-destructive">{item.error}</p>
          )}
        </div>
      ))}
    </div>
  );
}