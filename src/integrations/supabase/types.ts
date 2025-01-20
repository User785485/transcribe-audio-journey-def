export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      history: {
        Row: {
          id: string
          filename: string
          file_path: string
          transcription: string | null
          file_type: string
          folder_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          filename: string
          file_path: string
          transcription?: string | null
          file_type?: string
          folder_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          filename?: string
          file_path?: string
          transcription?: string | null
          file_type?: string
          folder_name?: string | null
          created_at?: string
        }
        Relationships: []
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