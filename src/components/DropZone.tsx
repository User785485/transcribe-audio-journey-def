import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";

export interface DropZoneProps {
  onDrop: (files: File[]) => void;
  isUploading?: boolean;
  supportedFormats?: Record<string, string[]>;
}

export const SUPPORTED_FORMATS = {
  'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg'],
  'video/*': ['.mp4', '.webm']
};

export function DropZone({ onDrop, isUploading, supportedFormats = SUPPORTED_FORMATS }: DropZoneProps) {
  const handleDrop = useCallback((acceptedFiles: File[]) => {
    console.log("📁 Files received in DropZone:", acceptedFiles.map(f => ({ 
      name: f.name, 
      type: f.type, 
      size: f.size,
      lastModified: new Date(f.lastModified).toISOString()
    })));

    if (acceptedFiles.length === 0) {
      console.log("⚠️ No files were accepted by the dropzone");
      return;
    }

    // Validate file types
    const validFiles = acceptedFiles.filter(file => {
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      const isValidType = Object.values(supportedFormats).flat().includes(fileExtension);
      
      if (!isValidType) {
        console.log(`❌ File ${file.name} has an unsupported format`);
      }
      
      return isValidType;
    });

    console.log("✅ Valid files to process:", validFiles.map(f => f.name));
    onDrop(validFiles);
  }, [onDrop, supportedFormats]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: supportedFormats,
    disabled: isUploading,
    maxSize: 25 * 1024 * 1024, // 25MB max
    multiple: true,
    noClick: false,
    noKeyboard: false,
  });

  const formatsList = Object.values(supportedFormats).flat().join(', ');

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer ${
        isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary/50'
      } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        <Upload className="w-8 h-8 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-base">Déposez les fichiers ici...</p>
        ) : (
          <div className="space-y-1 text-center">
            <p className="text-base">
              Glissez-déposez des fichiers audio ou vidéo, ou cliquez pour sélectionner
            </p>
            <p className="text-xs text-muted-foreground">
              Formats supportés : {formatsList}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}