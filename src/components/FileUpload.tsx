import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "./ui/card";
import { Upload } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onFilesAccepted: (files: File[]) => void;
  maxSize?: number;
  accept?: Record<string, string[]>;
}

export function FileUpload({ onFilesAccepted, maxSize = 100 * 1024 * 1024, accept }: FileUploadProps) {
  const { toast } = useToast();
  const { isProcessing } = useStore();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesAccepted(acceptedFiles);
  }, [onFilesAccepted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isProcessing,
    maxSize,
    accept,
    onDropRejected: (fileRejections) => {
      fileRejections.forEach((rejection) => {
        const error = rejection.errors[0];
        if (error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: `${rejection.file.name}: ${error.message}`
          });
        }
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  });

  return (
    <Card
      {...getRootProps()}
      className={`border-2 border-dashed p-6 text-center cursor-pointer transition-colors
        ${isDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25"}
        ${isProcessing ? "opacity-50 cursor-not-allowed" : "hover:border-primary"}
      `}
    >
      <input {...getInputProps()} />
      <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-sm text-muted-foreground">
        {isDragActive
          ? "Drop the files here..."
          : isProcessing
          ? "Processing..."
          : "Drag & drop files here, or click to select files"}
      </p>
    </Card>
  );
}
