import { createClient } from '@supabase/supabase-js'
import { Folder, Transcription } from '@/types/folder'
import { useStore } from '@/store/useStore'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export class SupabaseService {
  private static retryCount = 3
  private static retryDelay = 1000

  static async fetchFoldersWithRetry(): Promise<Folder[]> {
    for (let i = 0; i < this.retryCount; i++) {
      try {
        const { data, error } = await supabase
          .from('folders')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
      } catch (error) {
        if (i === this.retryCount - 1) throw error
        await new Promise(resolve => setTimeout(resolve, this.retryDelay))
      }
    }
    return []
  }

  static async fetchTranscriptionsWithRetry(): Promise<Transcription[]> {
    for (let i = 0; i < this.retryCount; i++) {
      try {
        const { data, error } = await supabase
          .from('transcriptions')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
      } catch (error) {
        if (i === this.retryCount - 1) throw error
        await new Promise(resolve => setTimeout(resolve, this.retryDelay))
      }
    }
    return []
  }

  static async uploadFile(file: File, path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('audio')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error
    return data.path
  }

  static async deleteFile(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from('audio')
      .remove([path])

    if (error) throw error
  }

  static async createFolder(name: string): Promise<Folder> {
    const { data, error } = await supabase
      .from('folders')
      .insert([{ name }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteFolder(id: string): Promise<void> {
    // First, delete all transcriptions in the folder
    const { error: transcriptionsError } = await supabase
      .from('transcriptions')
      .delete()
      .match({ folder_id: id })

    if (transcriptionsError) throw transcriptionsError

    // Then delete the folder
    const { error } = await supabase
      .from('folders')
      .delete()
      .match({ id })

    if (error) throw error
  }

  static async updateTranscriptionStatus(
    id: string,
    status: 'pending' | 'processing' | 'completed' | 'error',
    error?: string
  ): Promise<void> {
    const { error: updateError } = await supabase
      .from('transcriptions')
      .update({ 
        status,
        error_message: error,
        updated_at: new Date().toISOString()
      })
      .match({ id })

    if (updateError) throw updateError
  }
}
