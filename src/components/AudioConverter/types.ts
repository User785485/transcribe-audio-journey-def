export const MAX_TRANSCRIPTION_SIZE = 25 * 1024 * 1024; // 25MB
export const MAX_CHUNK_SIZE = 20 * 1024 * 1024; // 20MB

export type ConversionType = 'ogg-to-mp3' | 'wav-to-mp3' | 'wma-to-mp3';

export const CONVERSION_TYPES: Record<ConversionType, { label: string; formats: string[] }> = {
  'ogg-to-mp3': {
    label: 'OGG vers MP3',
    formats: ['.ogg']
  },
  'wav-to-mp3': {
    label: 'WAV vers MP3',
    formats: ['.wav']
  },
  'wma-to-mp3': {
    label: 'WMA vers MP3',
    formats: ['.wma']
  }
};

export const SUPPORTED_FORMATS: Record<string, string[]> = {
  'audio/ogg': ['.ogg'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/x-ms-wma': ['.wma']
};

export interface AudioMetadata {
  duration?: number;
  format: string;
  size: number;
  needsConversion: boolean;
}

export interface ChunkProgress {
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

export interface TranscriptionProgress {
  id: string;
  filename: string;
  progress: number;
  status: 'pending' | 'transcribing' | 'completed' | 'error';
  transcription?: string;
  error?: string;
}