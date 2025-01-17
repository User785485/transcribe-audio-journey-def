import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { DropZone } from "./DropZone";

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

// Reduced to 24MB to account for potential overhead
const CHUNK_SIZE = 24 * 1024 * 1024;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB Whisper API limit

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

  const processFile = async (file: File) => {
    const id = crypto.randomUUID();
    setTranscriptionProgress(prev => [...prev, {
      id,
      filename: file.name,
      progress: 0,
      status: 'pending'
    }]);

    try {
      let fileToUpload = file;
      
      // Check file size before processing
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`Le fichier est trop volumineux. La taille maximale est de ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB`);
      }

      if (file.type === 'audio/opus') {
        setTranscriptionProgress(prev => prev.map(p => 
          p.id === id ? { ...p, status: 'transcribing', progress: 10 } : p
        ));
        const wavBlob = await convertOpusToMp3(file);
        fileToUpload = new File([wavBlob], file.name.replace('.opus', '.wav'), {
          type: 'audio/wav'
        });
      }

      // Get file extension and MIME type
      const fileExt = fileToUpload.name.split('.').pop()?.toLowerCase();
      const mimeType = Object.entries(SUPPORTED_FORMATS).find(([, exts]) => 
        exts.some(ext => ext.endsWith(fileExt || ''))
      )?.[0];

      if (!fileExt || !mimeType) {
        throw new Error(`Format de fichier non supporté: ${fileExt}`);
      }

      // Calculate number of chunks needed
      const totalChunks = Math.ceil(fileToUpload.size / CHUNK_SIZE);
      let completeTranscription = '';

      // Process each chunk
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, fileToUpload.size);
        const chunk = fileToUpload.slice(start, end);
        
        // Create a new File with the correct MIME type for each chunk
        const chunkFile = new File([chunk], `chunk-${i}-${fileToUpload.name}`, {
          type: mimeType
        });

        console.log(`Processing chunk ${i + 1}/${totalChunks}:`, {
          size: chunkFile.size,
          type: chunkFile.type,
          name: chunkFile.name
        });
        
        const formData = new FormData();
        formData.append('file', chunkFile);
        formData.append('chunkIndex', i.toString());
        formData.append('totalChunks', totalChunks.toString());
        
        setTranscriptionProgress(prev => prev.map(p => 
          p.id === id ? {
            ...p,
            status: 'transcribing',
            progress: Math.round((i + 1) / totalChunks * 100)
          } : p
        ));

        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: formData,
        });

        if (error) {
          console.error('Error during transcription:', error);
          throw new Error(error.message || 'Une erreur est survenue');
        }

        if (data.data.transcription.isPartial) {
          completeTranscription += ' ' + data.data.transcription.transcription;
        } else {
          completeTranscription = data.data.transcription.transcription;
        }
      }

      setTranscriptionProgress(prev => prev.map(p => 
        p.id === id ? {
          ...p,
          status: 'completed',
          progress: 100,
          transcription: completeTranscription.trim()
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
