export interface Transcription {
  id: string;
  filename: string;
  content: string;
  folder_id: string;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  transcriptions?: Transcription[];
  subfolders?: Folder[];
}
