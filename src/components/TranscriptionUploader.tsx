import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { DropZone } from "./DropZone";
import { useNavigate } from "react-router-dom";

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

const MAX_TRANSCRIPTION_SIZE = 25 * 1024 * 1024; // 25MB

interface TranscriptionProgress {
  id: string;
  filename: string;
  progress: number;
  status: 'pending' | 'transcribing' | 'completed' | 'error';
  transcription?: string;
  error?: string;
}

export function TranscriptionUploader() {
  const [transcriptionProgress, setTranscriptionProgress] = useState<TranscriptionProgress[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  const processFile = async (file: File) => {
    const id = crypto.randomUUID();
    
    // Si le fichier est trop gros, rediriger vers la page de découpage
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

      const { data, error } = await supabase.functions.invoke('transcribe-simple', {
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
        description: `Le fichier ${file.name} a été transcrit avec succès.`,
      });
    } catch (error) {
      console.error('Erreur:', error);
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
        description: `Erreur lors de la transcription de ${file.name}: ${error instanceof Error ? error.message : "Une erreur est survenue"}`,
      });
    }
  };

  const handleDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(processFile);
  }, []);

  const handleCopyTranscription = (transcription: string) => {
    navigator.clipboard.writeText(transcription);
    toast({
      description: "Transcription copiée dans le presse-papier",
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Nouvelle transcription</h2>
        <p className="text-muted-foreground">
          Déposez vos fichiers audio ici. Les fichiers de plus de 25MB seront automatiquement redirigés vers l'outil de découpage.
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
            <p className="text-destructive">{item.error}</p>
          )}
        </div>
      ))}
    </div>
  );
}