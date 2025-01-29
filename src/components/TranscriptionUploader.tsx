import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { DropZone } from "./DropZone";
import { TranscriptionHistory } from "./TranscriptionHistory";
import { supabase } from "@/integrations/supabase/client";

export function TranscriptionUploader() {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async (files: File[]) => {
    setIsUploading(true);
    console.log("📁 Fichiers reçus pour transcription:", files);

    try {
      for (const file of files) {
        console.log("🎵 Traitement du fichier:", file.name);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("audio")
          .upload(`uploads/${file.name}`, file);

        if (uploadError) {
          console.error("❌ Erreur lors de l'upload:", uploadError);
          throw new Error(`Erreur lors de l'upload de ${file.name}: ${uploadError.message}`);
        }

        console.log("✅ Upload réussi:", uploadData);

        const { data: transcriptionData, error: transcriptionError } = await supabase.functions
          .invoke("transcribe-simple", {
            body: { filePath: uploadData.path },
          });

        if (transcriptionError) {
          console.error("❌ Erreur lors de la transcription:", transcriptionError);
          throw new Error(`Erreur lors de la transcription de ${file.name}: ${transcriptionError.message}`);
        }

        console.log("✅ Transcription réussie:", transcriptionData);

        toast({
          title: "Transcription terminée",
          description: `Le fichier ${file.name} a été transcrit avec succès.`,
        });
      }
    } catch (error: any) {
      console.error("❌ Erreur générale:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
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

      <DropZone onUpload={handleUpload} isUploading={isUploading} />
      
      <TranscriptionHistory />
    </div>
  );
}