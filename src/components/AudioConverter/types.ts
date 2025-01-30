export const MAX_TRANSCRIPTION_SIZE = 25 * 1024 * 1024; // 25MB
export const MAX_CHUNK_SIZE = 20 * 1024 * 1024; // 20MB

export interface AudioMetadata {
  duration?: number;
  format: string;
  size: number;
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
  progress: number;
}

export interface TranscriptionProgress {
  id: string;
  filename: string;
  progress: number;
  status: 'pending' | 'transcribing' | 'completed' | 'error';
  transcription?: string;
  error?: string;
}