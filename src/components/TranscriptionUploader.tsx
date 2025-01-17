import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

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
  
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const arrayBuffer = await opusBlob.arrayBuffer();
  console.log('Opus file loaded into ArrayBuffer');
  
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  console.log('Audio successfully decoded', {
    numberOfChannels: audioBuffer.numberOfChannels,
    sampleRate: audioBuffer.sampleRate,
    length: audioBuffer.length
  });
  
  const offlineAudioContext = new OfflineAudioContext({
    numberOfChannels: audioBuffer.numberOfChannels,
    length: audioBuffer.length,
    sampleRate: 44100,
  });
  
  const source = offlineAudioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineAudioContext.destination);
  
  source.start();
  const renderedBuffer = await offlineAudioContext.startRendering();
  console.log('Audio rendered successfully');
  
  const numberOfChannels = renderedBuffer.numberOfChannels;
  const length = renderedBuffer.length;
  const sampleRate = renderedBuffer.sampleRate;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numberOfChannels * (bitsPerSample / 8);
  const blockAlign = numberOfChannels * (bitsPerSample / 8);
  const wavDataLength = length * numberOfChannels * (bitsPerSample / 8);
  
  const buffer = new ArrayBuffer(44 + wavDataLength);
  const view = new DataView(buffer);
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + wavDataLength, true);
  writeString(view, 8, 'WAVE');
  
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  
  writeString(view, 36, 'data');
  view.setUint32(40, wavDataLength, true);
  
  const samples = new Float32Array(length * numberOfChannels);
  for (let channel = 0; channel < numberOfChannels; channel++) {
    const channelData = renderedBuffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      samples[i * numberOfChannels + channel] = channelData[i];
    }
  }
  
  const offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  
  console.log('WAV file created successfully');
  
  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
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
      let fileToUpload = file;
      if (file.type === 'audio/opus') {
        toast({
          title: "Conversion en cours",
          description: "Conversion du fichier Opus en WAV...",
        });
        const wavBlob = await convertOpusToMp3(file);
        fileToUpload = new File([wavBlob], file.name.replace('.opus', '.wav'), {
          type: 'audio/wav'
        });
        console.log('Conversion completed, new file:', fileToUpload);
      }

      const formData = new FormData();
      formData.append('file', fileToUpload);
      
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);

      console.log('Sending request to transcribe audio...');
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (error) {
        console.error('Transcription error:', error);
        throw new Error(error.message || 'Une erreur est survenue');
      }

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
