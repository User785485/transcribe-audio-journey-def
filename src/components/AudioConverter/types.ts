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

export interface AudioMetadata {
  duration?: number;
  format: string;
  size: number;
  needsConversion: boolean;
}

export const SUPPORTED_FORMATS: Record<string, string[]> = {
  'audio/opus': ['.opus'],
  'audio/ogg': ['.ogg'],
  'audio/mpeg': ['.mp3'],
  'audio/flac': ['.flac'],
  'audio/m4a': ['.m4a'],
  'audio/wav': ['.wav'],
  'audio/webm': ['.webm'],
  'video/mp4': ['.mp4']
};

export type ConversionType = 'ogg-to-mp3' | 'opus-to-mp3' | 'other-to-mp3';

export const CONVERSION_TYPES: Record<ConversionType, { label: string, formats: string[] }> = {
  'ogg-to-mp3': {
    label: 'OGG vers MP3',
    formats: ['.ogg']
  },
  'opus-to-mp3': {
    label: 'OPUS vers MP3',
    formats: ['.opus']
  },
  'other-to-mp3': {
    label: 'Autres formats vers MP3',
    formats: ['.flac', '.m4a', '.wav', '.webm', '.mp4']
  }
};

export const MAX_CHUNK_SIZE = 20 * 1024 * 1024; // 20MB
export const MAX_TRANSCRIPTION_SIZE = 25 * 1024 * 1024; // 25MB Whisper API limit