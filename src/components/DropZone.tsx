import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";

interface DropZoneProps {
  onDrop: (files: File[]) => void;
  supportedFormats: Record<string, string[]>;
  index: number;
}

export function DropZone({ onDrop, supportedFormats, index }: DropZoneProps) {
  const handleDrop = useCallback((acceptedFiles: File[]) => {
    onDrop(acceptedFiles);
  }, [onDrop]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: supportedFormats,
  });

  const formatsList = Object.values(supportedFormats).flat().join(', ');

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
        isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        <Upload className="w-8 h-8 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-base">Déposez les fichiers ici...</p>
        ) : (
          <div className="space-y-1 text-center">
            <p className="text-base">Zone {index + 1} - Glissez-déposez des fichiers audio</p>
            <p className="text-xs text-muted-foreground">
              Formats : {formatsList}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}