import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { DropZone } from "./DropZone";
import { TranscriptionHistory } from "./TranscriptionHistory";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

export const SUPPORTED_FORMATS = {
  'audio/flac': ['.flac'],
  'audio/m4a': ['.m4a'],
  'audio/mpeg': ['.mp3', '.mpeg', '.mpga'],
  'audio/ogg': ['.oga', '.ogg'],
  'audio/wav': ['.wav'],
  'audio/webm': ['.webm'],
  'video/mp4': ['.mp4'],
  'audio/opus': ['.opus']
};

export function TranscriptionUploader() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const handleUpload = async (files: File[]) => {
    console.log("🎯 Starting upload process with files:", files.map(f => ({ name: f.name, size: f.size, type: f.type })));
    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (const file of files) {
        console.log("📁 Processing file:", file.name);
        
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return prev;
            }
            return prev + 10;
          });
        }, 500);
        
        // Upload file to Supabase Storage
        console.log("⬆️ Uploading file to storage...");
        const uploadPath = `uploads/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("audio")
          .upload(uploadPath, file);

        if (uploadError) {
          console.error("❌ Storage upload error:", uploadError);
          throw new Error(`Erreur lors de l'upload de ${file.name}: ${uploadError.message}`);
        }

        console.log("✅ File uploaded successfully:", uploadData);
        setUploadProgress(95);

        // Call transcription function
        console.log("🎙️ Starting transcription process...");
        const { data: transcriptionData, error: transcriptionError } = await supabase.functions
          .invoke("transcribe-simple", {
            body: { filePath: uploadPath },
          });

        if (transcriptionError) {
          console.error("❌ Transcription error:", transcriptionError);
          throw new Error(`Erreur lors de la transcription de ${file.name}: ${transcriptionError.message}`);
        }

        console.log("✅ Transcription completed:", transcriptionData);
        setUploadProgress(100);

        // Save to history
        console.log("💾 Saving to history...");
        const { error: historyError } = await supabase
          .from("history")
          .insert({
            filename: file.name,
            file_path: uploadPath,
            transcription: transcriptionData.transcription,
            file_type: "transcription"
          });

        if (historyError) {
          console.error("❌ History save error:", historyError);
          throw new Error(`Erreur lors de la sauvegarde de l'historique: ${historyError.message}`);
        }

        console.log("✅ History saved successfully");

        toast({
          title: "Transcription terminée",
          description: `Le fichier ${file.name} a été transcrit avec succès.`,
        });

        clearInterval(progressInterval);
      }
    } catch (error: any) {
      console.error("❌ Global error:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      console.log("🏁 Upload process completed");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Nouvelle transcription</h2>
        <p className="text-muted-foreground">
          Déposez vos fichiers audio ou vidéo pour les transcrire automatiquement
        </p>
      </div>

      <DropZone 
        onDrop={handleUpload} 
        isUploading={isUploading}
        supportedFormats={SUPPORTED_FORMATS}
      />
      
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Traitement en cours...</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}
      
      <TranscriptionHistory />
    </div>
  );
}