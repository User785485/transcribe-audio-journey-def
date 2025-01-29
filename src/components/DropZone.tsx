import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";

interface DropZoneProps {
  onDrop: (files: File[]) => void;
  isUploading?: boolean;
}

export const SUPPORTED_FORMATS = {
  'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg']
};

export function DropZone({ onDrop, isUploading }: DropZoneProps) {
  const handleDrop = useCallback((acceptedFiles: File[]) => {
    onDrop(acceptedFiles);
  }, [onDrop]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: SUPPORTED_FORMATS,
    disabled: isUploading
  });

  const formatsList = Object.values(SUPPORTED_FORMATS).flat().join(', ');

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
        isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'
      } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        <Upload className="w-8 h-8 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-base">Déposez les fichiers ici...</p>
        ) : (
          <div className="space-y-1 text-center">
            <p className="text-base">Glissez-déposez des fichiers audio</p>
            <p className="text-xs text-muted-foreground">
              Formats : {formatsList}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}