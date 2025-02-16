import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface FileWithProgress extends File {
  progress?: number;
}

const ALLOWED_MIME_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/x-m4a",
  "audio/mp4",
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-ms-wmv",
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const TranscriptionUploader = () => {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => Object.assign(file, { progress: 0 }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ALLOWED_MIME_TYPES.filter(type => type.startsWith('audio/')),
      'video/*': ALLOWED_MIME_TYPES.filter(type => type.startsWith('video/')),
    },
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        setFiles((prev) =>
          prev.map((f) =>
            f === file ? { ...f, progress: 100 } : f
          )
        );

        toast({
          title: "Success",
          description: `${file.name} uploaded successfully`,
        });
      } catch (error) {
        if (error instanceof Error) {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    }
  };

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
        
        // Sanitize filename - remove non-ASCII characters and spaces
        const sanitizedFilename = file.name.replace(/[^\x00-\x7F]/g, '').replace(/\s+/g, '_');
        
        // Upload file to Supabase Storage
        console.log("⬆️ Uploading file to storage...");
        const uploadPath = `uploads/${Date.now()}_${sanitizedFilename}`;
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

        if (!transcriptionData?.transcription) {
          console.error("❌ No transcription data received");
          throw new Error(`Erreur: Aucune transcription reçue pour ${file.name}`);
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
    <div className="container mx-auto p-4">
      <div {...getRootProps()} className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer">
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the files here ...</p>
        ) : (
          <p>Drag 'n' drop some files here, or click to select files</p>
        )}
      </div>

      {files.length > 0 && (
        <div className="mt-4">
          {files.map((file, index) => (
            <Card key={index} className="mb-2">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="truncate">{file.name}</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    Remove
                  </Button>
                </div>
                <Progress value={file.progress} className="mt-2" />
              </CardContent>
            </Card>
          ))}
          <Button onClick={uploadFiles} className="mt-4">
            Upload All Files
          </Button>
        </div>
      )}
    </div>
  );
};
