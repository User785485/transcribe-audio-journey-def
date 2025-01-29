import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";

export interface DropZoneProps {
  onDrop: (files: File[]) => void;
  isUploading?: boolean;
  supportedFormats?: Record<string, string[]>;
  index?: number;
}

export const SUPPORTED_FORMATS = {
  'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg']
};

export function DropZone({ onDrop, isUploading, supportedFormats = SUPPORTED_FORMATS }: DropZoneProps) {
  const handleDrop = useCallback((acceptedFiles: File[]) => {
    console.log("📁 Files dropped:", acceptedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })));
    onDrop(acceptedFiles);
  }, [onDrop]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: supportedFormats,
    disabled: isUploading,
    maxSize: 25 * 1024 * 1024, // 25MB max
  });

  const formatsList = Object.values(supportedFormats).flat().join(', ');

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