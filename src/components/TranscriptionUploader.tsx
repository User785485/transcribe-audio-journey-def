import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface FileWithProgress extends File {
  progress?: number;
}

interface TranscriptionUploaderProps {
  onUploadComplete?: (result: any) => void;
}

const ALLOWED_MIME_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/x-m4a",
  "audio/mp4",
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-ms-wmv",
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function TranscriptionUploader({ onUploadComplete }: TranscriptionUploaderProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => Object.assign(file, { progress: 0 }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress((prev) => {
              const newProgress = Math.round((event.loaded * 100) / event.total);
              return newProgress;
            });
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            const result = JSON.parse(xhr.responseText);
            onUploadComplete?.(result);
            toast.success("File uploaded successfully!");
          } else {
            throw new Error("Upload failed");
          }
        };

        xhr.onerror = () => {
          throw new Error("Upload failed");
        };

        xhr.open("POST", "/api/upload");
        await xhr.send(formData);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ALLOWED_MIME_TYPES.filter(type => type.startsWith('audio/')),
      'video/*': ALLOWED_MIME_TYPES.filter(type => type.startsWith('video/')),
    },
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        setFiles((prev) =>
          prev.map((f) =>
            f === file ? { ...f, progress: 100 } : f
          )
        );

        toast({
          title: "Success",
          description: `${file.name} uploaded successfully`,
        });
      } catch (error) {
        if (error instanceof Error) {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div {...getRootProps()} className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer">
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the files here ...</p>
        ) : (
          <p>Drag 'n' drop some files here, or click to select files</p>
        )}
      </div>

      {files.length > 0 && (
        <div className="mt-4">
          {files.map((file, index) => (
            <Card key={index} className="mb-2">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="truncate">{file.name}</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    Remove
                  </Button>
                </div>
                <Progress value={file.progress} className="mt-2" />
              </CardContent>
            </Card>
          ))}
          <Button onClick={uploadFiles} className="mt-4">
            Upload All Files
          </Button>
        </div>
      )}
    </div>
  );
}
