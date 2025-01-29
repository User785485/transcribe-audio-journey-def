import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { DropZone } from "./DropZone";
import { TranscriptionHistory } from "./TranscriptionHistory";
import { supabase } from "@/integrations/supabase/client";

export function TranscriptionUploader() {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async (files: File[]) => {
    console.log("🎯 Starting upload process with files:", files.map(f => ({ name: f.name, size: f.size, type: f.type })));
    setIsUploading(true);

    try {
      for (const file of files) {
        console.log("📁 Processing file:", file.name);
        
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
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Nouvelle transcription</h2>
        <p className="text-muted-foreground">
          Déposez vos fichiers audio pour les transcrire automatiquement
        </p>
      </div>

      <DropZone onDrop={handleUpload} isUploading={isUploading} />
      
      <TranscriptionHistory />
    </div>
  );
}