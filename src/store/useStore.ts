import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Folder, Transcription } from '@/types/folder'

interface AppState {
  folders: Folder[]
  transcriptions: Transcription[]
  isFFmpegLoaded: boolean
  currentFolder: string | null
  isProcessing: boolean
  uploadQueue: File[]
  errors: Record<string, string>
  
  // Actions
  setFolders: (folders: Folder[]) => void
  setTranscriptions: (transcriptions: Transcription[]) => void
  setFFmpegLoaded: (loaded: boolean) => void
  setCurrentFolder: (folderId: string | null) => void
  setProcessing: (processing: boolean) => void
  addToUploadQueue: (file: File) => void
  removeFromUploadQueue: (fileId: string) => void
  setError: (key: string, error: string) => void
  clearError: (key: string) => void
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      folders: [],
      transcriptions: [],
      isFFmpegLoaded: false,
      currentFolder: null,
      isProcessing: false,
      uploadQueue: [],
      errors: {},

      setFolders: (folders) => set({ folders }),
      setTranscriptions: (transcriptions) => set({ transcriptions }),
      setFFmpegLoaded: (loaded) => set({ isFFmpegLoaded: loaded }),
      setCurrentFolder: (folderId) => set({ currentFolder: folderId }),
      setProcessing: (processing) => set({ isProcessing: processing }),
      addToUploadQueue: (file) => 
        set((state) => ({ 
          uploadQueue: [...state.uploadQueue, file] 
        })),
      removeFromUploadQueue: (fileId) =>
        set((state) => ({
          uploadQueue: state.uploadQueue.filter(
            (file) => file.name !== fileId
          ),
        })),
      setError: (key, error) =>
        set((state) => ({ errors: { ...state.errors, [key]: error } })),
      clearError: (key) =>
        set((state) => {
          const { [key]: _, ...rest } = state.errors
          return { errors: rest }
        }),
    }),
    {
      name: 'audio-transcription-storage',
      partialize: (state) => ({
        folders: state.folders,
        transcriptions: state.transcriptions,
        currentFolder: state.currentFolder,
      }),
    }
  )
)
