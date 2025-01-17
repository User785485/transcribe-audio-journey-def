import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

const SUPPORTED_FORMATS = {
  'audio/flac': ['.flac'],
  'audio/m4a': ['.m4a'],
  'audio/mpeg': ['.mp3', '.mpeg', '.mpga'],
  'audio/ogg': ['.oga', '.ogg'],
  'audio/wav': ['.wav'],
  'audio/webm': ['.webm'],
  'video/mp4': ['.mp4'],
  'audio/opus': ['.opus']
};

const FORMATS_LIST = Object.values(SUPPORTED_FORMATS).flat().join(', ');

async function convertOpusToMp3(opusBlob: Blob): Promise<Blob> {
  console.log('Starting Opus to MP3 conversion...');
  
  // Créer un AudioContext
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Convertir le blob en ArrayBuffer
  const arrayBuffer = await opusBlob.arrayBuffer();
  console.log('Opus file loaded into ArrayBuffer');
  
  // Décoder l'audio
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  console.log('Audio successfully decoded', {
    numberOfChannels: audioBuffer.numberOfChannels,
    sampleRate: audioBuffer.sampleRate,
    length: audioBuffer.length
  });
  
  // Créer un OfflineAudioContext pour le rendu
  const offlineAudioContext = new OfflineAudioContext({
    numberOfChannels: audioBuffer.numberOfChannels,
    length: audioBuffer.length,
    sampleRate: 44100,
  });
  
  // Créer une source et la connecter
  const source = offlineAudioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineAudioContext.destination);
  
  // Démarrer la source et effectuer le rendu
  source.start();
  const renderedBuffer = await offlineAudioContext.startRendering();
  console.log('Audio rendered successfully');
  
  // Convertir en MP3 avec Lame
  const mp3encoder = new (window as any).lamejs.Mp3Encoder(
    renderedBuffer.numberOfChannels,
    renderedBuffer.sampleRate,
    128
  );
  
  // Préparer les données pour l'encodage
  const samples = new Int16Array(renderedBuffer.length * renderedBuffer.numberOfChannels);
  const leftChannel = renderedBuffer.getChannelData(0);
  const rightChannel = renderedBuffer.numberOfChannels > 1 ? renderedBuffer.getChannelData(1) : leftChannel;
  
  // Convertir les échantillons en format Int16
  for (let i = 0; i < renderedBuffer.length; i++) {
    samples[i * 2] = Math.max(-32768, Math.min(32767, Math.floor(leftChannel[i] * 32768)));
    samples[i * 2 + 1] = Math.max(-32768, Math.min(32767, Math.floor(rightChannel[i] * 32768)));
  }
  
  console.log('Samples prepared for MP3 encoding');
  
  // Encoder en MP3
  const mp3Data = [];
  const blockSize = 1152; // Taille standard pour MP3
  for (let i = 0; i < samples.length; i += blockSize * 2) {
    const sampleChunk = samples.subarray(i, i + blockSize * 2);
    const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }
  
  // Finaliser l'encodage
  const end = mp3encoder.flush();
  if (end.length > 0) {
    mp3Data.push(end);
  }
  
  console.log('MP3 encoding completed');
  
  // Créer un nouveau Blob MP3
  const mp3Blob = new Blob(mp3Data, { type: 'audio/mpeg' });
  console.log('MP3 blob created', { size: mp3Blob.size });
  
  return mp3Blob;
}

export function TranscriptionUploader() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    console.log('File type:', file.type);
    
    setIsTranscribing(true);
    setTranscription("");
    setUploadProgress(0);

    try {
      // Convertir le fichier Opus en MP3 si nécessaire
      let fileToUpload = file;
      if (file.type === 'audio/opus') {
        toast({
          title: "Conversion en cours",
          description: "Conversion du fichier Opus en MP3...",
        });
        const mp3Blob = await convertOpusToMp3(file);
        fileToUpload = new File([mp3Blob], file.name.replace('.opus', '.mp3'), {
          type: 'audio/mpeg'
        });
        console.log('Conversion completed, new file:', fileToUpload);
      }

      const formData = new FormData();
      formData.append('file', fileToUpload);
      
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

      console.log('Sending request to transcribe audio...');
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
        const errorData = await response.json();
        console.error('Transcription error:', errorData);
        throw new Error(errorData.details || errorData.error || 'Une erreur est survenue');
      }

      const data = await response.json();
      console.log('Transcription received:', data);
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
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de la transcription.",
      });
    } finally {
      setIsTranscribing(false);
      setUploadProgress(0);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: SUPPORTED_FORMATS,
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
                Formats supportés : {FORMATS_LIST}
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