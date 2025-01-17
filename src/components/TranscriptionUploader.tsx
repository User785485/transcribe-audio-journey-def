import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export function TranscriptionUploader() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsTranscribing(true);
    setTranscription("");

    try {
      // Simulate transcription for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      setTranscription("Ceci est un exemple de transcription...");
      toast({
        title: "Transcription terminée",
        description: "Le fichier a été transcrit avec succès.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la transcription.",
      });
    } finally {
      setIsTranscribing(false);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.ogg']
    },
    maxFiles: 1
  });

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'active' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <Upload className="w-12 h-12 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-lg">Déposez le fichier ici...</p>
          ) : (
            <div className="space-y-2 text-center">
              <p className="text-lg">Glissez-déposez un fichier audio, ou cliquez pour sélectionner</p>
              <p className="text-sm text-muted-foreground">
                MP3, WAV, M4A ou OGG
              </p>
            </div>
          )}
        </div>
      </div>

      {isTranscribing && (
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <p>Transcription en cours...</p>
        </div>
      )}

      {transcription && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Transcription</h3>
          <p className="whitespace-pre-wrap">{transcription}</p>
          <div className="mt-4">
            <Button
              onClick={() => {
                navigator.clipboard.writeText(transcription);
                toast({
                  description: "Transcription copiée dans le presse-papier",
                });
              }}
            >
              Copier le texte
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}