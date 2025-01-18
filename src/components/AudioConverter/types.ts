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

export const SUPPORTED_FORMATS = {
  'audio/opus': ['.opus'],
  'audio/ogg': ['.ogg'],
  'audio/mpeg': ['.mp3'],
  'audio/flac': ['.flac'],
  'audio/m4a': ['.m4a'],
  'audio/wav': ['.wav'],
  'audio/webm': ['.webm'],
  'video/mp4': ['.mp4']
} as Record<string, string[]>;

export const MAX_CHUNK_SIZE = 20 * 1024 * 1024; // 20MB
export const MAX_TRANSCRIPTION_SIZE = 25 * 1024 * 1024; // 25MB Whisper API limit