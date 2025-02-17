import { useState, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { useToast } from '@/hooks/use-toast';
import { SupabaseService } from '@/lib/supabase-client';

interface AudioProcessingOptions {
  maxSize?: number;
  allowedTypes?: string[];
  onProgress?: (progress: number) => void;
}

export function useAudioProcessing(options: AudioProcessingOptions = {}) {
  const {
    maxSize = 100 * 1024 * 1024, // 100MB default
    allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a'],
    onProgress
  } = options;

  const [isProcessing, setIsProcessing] = useState(false);
  const { setError, clearError } = useStore();
  const { toast } = useToast();

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxSize) {
      return `File size exceeds ${maxSize / 1024 / 1024}MB limit`;
    }
    if (!allowedTypes.includes(file.type)) {
      return `File type ${file.type} is not supported. Supported types: ${allowedTypes.join(', ')}`;
    }
    return null;
  }, [maxSize, allowedTypes]);

  const uploadFile = useCallback(async (file: File, path: string): Promise<string> => {
    const error = validateFile(file);
    if (error) {
      throw new Error(error);
    }

    setIsProcessing(true);
    clearError('upload');

    try {
      const filePath = await SupabaseService.uploadFile(file, path);
      toast({
        title: 'Upload Success',
        description: `Successfully uploaded ${file.name}`,
      });
      return filePath;
    } catch (error) {
      setError('upload', error.message);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error.message,
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [validateFile, setError, clearError, toast]);

  const processAudioChunk = useCallback(async (
    chunk: ArrayBuffer,
    offset: number,
    total: number
  ): Promise<Uint8Array> => {
    const result = new Uint8Array(chunk);
    if (onProgress) {
      onProgress((offset + chunk.byteLength) / total * 100);
    }
    return result;
  }, [onProgress]);

  const processAudioFile = useCallback(async (
    file: File,
    chunkSize: number = 1024 * 1024 // 1MB chunks
  ): Promise<Uint8Array> => {
    const chunks: Uint8Array[] = [];
    let offset = 0;
    
    while (offset < file.size) {
      const chunk = await file.slice(offset, offset + chunkSize).arrayBuffer();
      const processedChunk = await processAudioChunk(chunk, offset, file.size);
      chunks.push(processedChunk);
      offset += chunkSize;
    }
    
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let position = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, position);
      position += chunk.length;
    }
    
    return result;
  }, [processAudioChunk]);

  return {
    isProcessing,
    validateFile,
    uploadFile,
    processAudioFile,
  };
}
