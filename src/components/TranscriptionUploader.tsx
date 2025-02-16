import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Card } from "./ui/card";

export function TranscriptionUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = (acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.ogg'],
    },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (files.length === 0) return;

    try {
      setIsUploading(true);
      const file = files[0];

      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 500);

      // Simulated success after "upload"
      setTimeout(() => {
        clearInterval(interval);
        setIsUploading(false);
        setUploadProgress(0);
        setFiles([]);
        toast({
          title: "Upload Complete",
          description: `Successfully uploaded ${file.name}`,
        });
      }, 5000);

    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Card className="p-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary"}`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the audio file here...</p>
        ) : (
          <p>Drag and drop an audio file here, or click to select</p>
        )}
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">{files[0].name}</span>
            <Button
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
          {isUploading && (
            <Progress value={uploadProgress} className="w-full" />
          )}
        </div>
      )}
    </Card>
  );
}
