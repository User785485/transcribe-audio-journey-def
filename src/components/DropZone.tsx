import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { toast } from "sonner";

export interface DropZoneProps {
  onDrop: (files: File[]) => void;
  isUploading?: boolean;
  supportedFormats?: Record<string, string[]>;
  maxSize?: number;
}

export const SUPPORTED_FORMATS = {
  'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg'],
  'video/*': ['.mp4', '.webm']
};

export function DropZone({ 
  onDrop, 
  isUploading, 
  supportedFormats = SUPPORTED_FORMATS,
  maxSize = 100 * 1024 * 1024 // Default to 100MB if not specified
}: DropZoneProps) {
  const handleDrop = useCallback((acceptedFiles: File[]) => {
    console.log("📁 Files received in DropZone:", acceptedFiles);

    if (acceptedFiles?.length === 0) {
      console.log("⚠️ No files were accepted by the dropzone");
      toast.error("Aucun fichier n'a été accepté. Vérifiez le format de vos fichiers.");
      return;
    }

    const validFiles = acceptedFiles.filter(file => {
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      const isValidType = Object.values(supportedFormats).flat().includes(fileExtension);
      
      if (!isValidType) {
        console.log(`❌ File ${file.name} has an unsupported format`);
        toast.error(`Le fichier ${file.name} n'est pas dans un format supporté`);
      }
      
      return isValidType;
    });

    if (validFiles.length > 0) {
      console.log("✅ Valid files to process:", validFiles);
      onDrop(validFiles);
    }
  }, [onDrop, supportedFormats]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: supportedFormats,
    disabled: isUploading,
    maxSize: maxSize,
    multiple: true,
    noClick: false,
    noKeyboard: false,
    onDropRejected: (rejectedFiles) => {
      console.log("❌ Files rejected:", rejectedFiles);
      rejectedFiles.forEach(rejection => {
        if (rejection.errors[0]?.code === "file-too-large") {
          const sizeMB = Math.round(maxSize / 1024 / 1024);
          toast.error(`Le fichier ${rejection.file.name} est trop volumineux (max ${sizeMB}MB)`);
        } else {
          toast.error(`Le fichier ${rejection.file.name} n'a pas pu être accepté`);
        }
      });
    },
    onError: (error) => {
      console.error("❌ Dropzone error:", error);
      toast.error("Une erreur s'est produite lors du dépôt des fichiers");
    }
  });

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
              Formats supportés : {Object.values(supportedFormats).flat().join(', ')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}