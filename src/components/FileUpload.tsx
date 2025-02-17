import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface FileUploadProps {
  onUploadComplete?: (files: string[]) => void;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  error?: string;
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      progress: 0,
    }));

    setUploadingFiles((prev) => [...prev, ...newFiles]);

    for (const fileData of newFiles) {
      try {
        const { error } = await supabase.storage
          .from("audio")
          .upload(`${fileData.id}-${fileData.file.name}`, fileData.file, {
            cacheControl: "3600",
          });

        if (error) throw error;

        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === fileData.id ? { ...f, progress: 100 } : f
          )
        );

        if (onUploadComplete) {
          onUploadComplete([`${fileData.id}-${fileData.file.name}`]);
        }

        toast({
          title: "Success",
          description: "File uploaded successfully",
        });
      } catch (error) {
        console.error("Upload error:", error);
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === fileData.id
              ? { ...f, error: "Upload failed", progress: 0 }
              : f
          )
        );

        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to upload file",
        });
      }
    }
  }, [onUploadComplete, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "audio/*": [".mp3", ".wav", ".m4a", ".ogg", ".opus"],
    },
    maxFiles: 10,
  });

  const removeFile = (id: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/10" : "border-muted"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {isDragActive
            ? "Drop the files here..."
            : "Drag & drop audio files here, or click to select files"}
        </p>
      </div>

      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((file) => (
            <Card key={file.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">{file.file.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Progress value={file.progress} className="h-2" />
                </div>
              </div>
              {file.error && (
                <p className="text-sm text-destructive mt-2">{file.error}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
