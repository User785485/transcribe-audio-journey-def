import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Folder, File, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";

export const Database = () => {
  const [newFolderName, setNewFolderName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: folders, isLoading } = useQuery({
    queryKey: ["folders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .is("parent_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("folders")
        .insert([{ name }]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      setNewFolderName("");
      toast({
        description: "Dossier créé avec succès",
      });
    },
    onError: (error) => {
      console.error("Error creating folder:", error);
      toast({
        variant: "destructive",
        description: "Erreur lors de la création du dossier",
      });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, folderId }: { file: File, folderId?: string }) => {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const isAudio = ['mp3', 'wav', 'm4a', 'ogg'].includes(fileExt || '');
      const isText = fileExt === 'txt';

      if (!isAudio && !isText) {
        throw new Error("Format de fichier non supporté");
      }

      const filePath = `${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("audio")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("audio_files")
        .insert([{
          filename: file.name,
          file_path: filePath,
          file_type: isAudio ? 'audio' : 'text',
          folder_id: folderId
        }]);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audio_files"] });
      toast({
        description: "Fichier uploadé avec succès",
      });
    },
    onError: (error) => {
      console.error("Error uploading file:", error);
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "Erreur lors de l'upload du fichier",
      });
    },
  });

  const onDrop = async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      await uploadFileMutation.mutate({ file });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.ogg'],
      'text/plain': ['.txt']
    }
  });

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast({
        variant: "destructive",
        description: "Le nom du dossier est requis",
      });
      return;
    }
    createFolderMutation.mutate(newFolderName);
  };

  if (isLoading) {
    return <div className="p-4">Chargement...</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-4">
        <Input
          placeholder="Nom du nouveau dossier"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={handleCreateFolder}>
          <Folder className="w-4 h-4 mr-2" />
          Créer un dossier
        </Button>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/10" : "border-muted"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">
          {isDragActive
            ? "Déposez les fichiers ici"
            : "Glissez et déposez des fichiers audio (.mp3, .wav, .m4a, .ogg) ou texte (.txt), ou cliquez pour sélectionner"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {folders?.map((folder) => (
          <div
            key={folder.id}
            className="p-4 border rounded-lg flex items-center gap-3 cursor-pointer hover:bg-accent transition-colors"
          >
            <Folder className="w-6 h-6 text-blue-500" />
            <span className="font-medium">{folder.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};