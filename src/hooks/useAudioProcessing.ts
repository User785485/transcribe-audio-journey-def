import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useStore } from '@/store/useStore';
import { useToast } from '@/hooks/use-toast';

interface UseAudioProcessingOptions {
  maxSize?: number;
  allowedTypes?: string[];
  onProgress?: (progress: number) => void;
}

export function useAudioProcessing({
  maxSize = 100 * 1024 * 1024,
  allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a'],
  onProgress
}: UseAudioProcessingOptions = {}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { setProcessing } = useStore();
  const { toast } = useToast();

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File size exceeds ${maxSize / 1024 / 1024}MB limit`;
    }
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type';
    }
    return null;
  };

  const uploadFile = useCallback(async (file: File, path: string): Promise<string> => {
    const error = validateFile(file);
    if (error) {
      throw new Error(error);
    }

    setIsProcessing(true);
    setProcessing(true);

    try {
      const { error: uploadError, data } = await supabase.storage
        .from('audio')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          onProgress
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      return data.path;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown upload error occurred';
      toast({
        variant: "destructive",
        title: "Upload Error",
        description: errorMessage
      });
      throw error;
    } finally {
      setIsProcessing(false);
      setProcessing(false);
    }
  }, [maxSize, allowedTypes, onProgress, setProcessing, toast]);

  return {
    isProcessing,
    uploadFile
  };
}
