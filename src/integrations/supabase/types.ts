export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audio_files: {
        Row: {
          created_at: string
          file_path: string
          file_type: string
          filename: string
          folder_id: string | null
          id: string
        }
        Insert: {
          created_at?: string
          file_path: string
          file_type?: string
          filename: string
          folder_id?: string | null
          id?: string
        }
        Update: {
          created_at?: string
          file_path?: string
          file_type?: string
          filename?: string
          folder_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          }
        ]
      }
      folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          }
        ]
      }
      history: {
        Row: {
          created_at: string
          file_path: string
          file_type: string
          filename: string
          folder_name: string | null
          id: string
          transcription: string | null
        }
        Insert: {
          created_at?: string
          file_path: string
          file_type?: string
          filename: string
          folder_name?: string | null
          id?: string
          transcription?: string | null
        }
        Update: {
          created_at?: string
          file_path?: string
          file_type?: string
          filename?: string
          folder_name?: string | null
          id?: string
          transcription?: string | null
        }
        Relationships: []
      }
      prompts: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      transcriptions: {
        Row: {
          audio_file_id: string
          created_at: string
          id: string
          transcription: string | null
        }
        Insert: {
          audio_file_id: string
          created_at?: string
          id?: string
          transcription?: string | null
        }
        Update: {
          audio_file_id?: string
          created_at?: string
          id?: string
          transcription?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transcriptions_audio_file_id_fkey"
            columns: ["audio_file_id"]
            isOneToOne: false
            referencedRelation: "audio_files"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}