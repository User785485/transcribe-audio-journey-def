import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

export function TranscriptionUploader() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsTranscribing(true);
    setTranscription("");
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Simuler la progression du téléchargement
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);

      const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtcXZsbmtxcG5jYW5xZmt0bmxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwOTkwMDgsImV4cCI6MjA1MjY3NTAwOH0.SWio32U3svOm8GWqm384GhAm9aFpR2mYhtGKgDzE_64';

      const response = await fetch('https://vmqvlnkqpncanqfktnle.functions.supabase.co/transcribe-audio', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'apikey': ANON_KEY,
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const data = await response.json();
      setTranscription(data.data.transcription.transcription);
      
      toast({
        title: "Transcription terminée",
        description: "Le fichier a été transcrit avec succès.",
      });
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la transcription.",
      });
    } finally {
      setIsTranscribing(false);
      setUploadProgress(0);
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
        className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
          isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'
        }`}
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

      {(isTranscribing || uploadProgress > 0) && (
        <div className="space-y-4">
          <Progress value={uploadProgress} className="w-full" />
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <p>Transcription en cours...</p>
          </div>
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