import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useAudioProcessing } from "@/hooks/useAudioProcessing";

interface FileUploadProps {
  onUploadComplete?: (files: string[]) => void;
  maxFiles?: number;
  maxSize?: number;
  allowedTypes?: string[];
}

export function FileUpload({ 
  onUploadComplete, 
  maxFiles = 10,
  maxSize = 100 * 1024 * 1024, // 100MB
  allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a']
}: FileUploadProps) {
  const { uploadQueue, addToUploadQueue, removeFromUploadQueue } = useStore();
  const { toast } = useToast();
  const { isProcessing, uploadFile } = useAudioProcessing({
    maxSize,
    allowedTypes,
    onProgress: (progress) => {
      console.log(`Upload progress: ${progress}%`);
    }
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > maxFiles) {
      toast({
        variant: "destructive",
        title: "Too many files",
        description: `Maximum ${maxFiles} files allowed`
      });
      return;
    }

    for (const file of acceptedFiles) {
      const fileId = Math.random().toString(36).substring(7);
      try {
        addToUploadQueue(fileId);
        const path = `${fileId}-${file.name}`;
        await uploadFile(file, path);
        
        if (onUploadComplete) {
          onUploadComplete([path]);
        }
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        toast({
          variant: "destructive",
          title: "Upload Error",
          description: `Failed to upload ${file.name}: ${error.message}`
        });
      } finally {
        removeFromUploadQueue(fileId);
      }
    }
  }, [maxFiles, uploadFile, addToUploadQueue, removeFromUploadQueue, onUploadComplete, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': allowedTypes
    },
    maxSize,
    disabled: isProcessing
  });

  return (
    <Card
      {...getRootProps()}
      className={`p-4 border-2 border-dashed transition-colors ${
        isDragActive ? "border-primary" : "border-muted-foreground"
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center space-y-4 h-32">
        <Upload
          className={`w-12 h-12 ${
            isDragActive ? "text-primary" : "text-muted-foreground"
          }`}
        />
        <div className="text-center space-y-2">
          <p className="text-sm">
            {isDragActive
              ? "Drop the files here..."
              : "Drag & drop audio files here, or click to select"}
          </p>
          <p className="text-xs text-muted-foreground">
            Supported formats: MP3, WAV, OGG, M4A (Max {maxSize / 1024 / 1024}MB)
          </p>
        </div>
      </div>

      {uploadQueue.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadQueue.map((fileId) => (
            <div
              key={fileId}
              className="flex items-center justify-between p-2 bg-muted rounded"
            >
              <div className="flex items-center space-x-2">
                <Upload className="w-4 h-4 text-muted-foreground animate-pulse" />
                <span className="text-sm">Uploading...</span>
              </div>
              <Progress value={undefined} className="w-24 h-2" />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
