export interface Transcription {
  id: string;
  filename: string;
  created_at: string;
  folder_id: string;
}

export interface Folder {
  id: string;
  name: string;
  transcriptions: Transcription[];
  subfolders: Folder[];
}
