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
          duration: number | null
          file_path: string
          filename: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration?: number | null
          file_path: string
          filename: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration?: number | null
          file_path?: string
          filename?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      conversions: {
        Row: {
          converted_filename: string
          converted_format: string
          created_at: string
          file_path: string
          id: string
          original_filename: string
          original_format: string
          user_id: string | null
        }
        Insert: {
          converted_filename: string
          converted_format: string
          created_at?: string
          file_path: string
          id?: string
          original_filename: string
          original_format: string
          user_id?: string | null
        }
        Update: {
          converted_filename?: string
          converted_format?: string
          created_at?: string
          file_path?: string
          id?: string
          original_filename?: string
          original_format?: string
          user_id?: string | null
        }
        Relationships: []
      }
      splits: {
        Row: {
          created_at: string
          end_time: number
          file_path: string
          id: string
          original_filename: string
          split_filename: string
          start_time: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          end_time: number
          file_path: string
          id?: string
          original_filename: string
          split_filename: string
          start_time: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          end_time?: number
          file_path?: string
          id?: string
          original_filename?: string
          split_filename?: string
          start_time?: number
          user_id?: string | null
        }
        Relationships: []
      }
      transcriptions: {
        Row: {
          audio_file_id: string
          created_at: string
          id: string
          language: string | null
          status: string | null
          transcription: string
        }
        Insert: {
          audio_file_id: string
          created_at?: string
          id?: string
          language?: string | null
          status?: string | null
          transcription: string
        }
        Update: {
          audio_file_id?: string
          created_at?: string
          id?: string
          language?: string | null
          status?: string | null
          transcription?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcriptions_audio_file_id_fkey"
            columns: ["audio_file_id"]
            isOneToOne: false
            referencedRelation: "audio_files"
            referencedColumns: ["id"]
          },
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
