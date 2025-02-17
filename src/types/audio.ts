export interface AudioFile {
  id: string;
  name: string;
  file: File;
  progress: number;
  status: AudioFileStatus;
  outputUrl?: string;
  error?: string;
  format?: AudioFormat;
  duration?: number;
  size: number;
  createdAt: Date;
}

export type AudioFileStatus = 
  | "pending"
  | "converting"
  | "uploading"
  | "processing"
  | "done"
  | "error";

export type AudioFormat = "mp3" | "wav" | "ogg" | "m4a";

export interface AudioMetadata {
  duration: number;
  format: string;
  bitrate: number;
  channels: number;
  sampleRate: number;
}

export interface AudioProcessingOptions {
  maxSize?: number;
  allowedTypes?: string[];
  maxFiles?: number;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
  onSuccess?: (file: AudioFile) => void;
}

export interface AudioConversionOptions {
  outputFormat: AudioFormat;
  quality?: "low" | "medium" | "high";
  preserveMetadata?: boolean;
  normalize?: boolean;
}

export interface AudioUploadOptions {
  chunkSize?: number;
  retryAttempts?: number;
  retryDelay?: number;
  validateContent?: boolean;
  generateThumbnail?: boolean;
}
