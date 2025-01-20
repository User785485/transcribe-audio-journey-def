import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Folder, Upload, Plus, Search, Pencil } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const SUPPORTED_AUDIO_FORMATS = {
  'audio/*': [
    '.mp3',
    '.wav',
    '.m4a',
    '.ogg',
    '.aac',
    '.wma',
    '.flac',
    '.aiff',
    '.alac'
  ],
  'text/plain': ['.txt']
};

export const Database = () => {
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
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

  const { data: selectedFolderFiles } = useQuery({
    queryKey: ["folder-files", selectedFolderId],
    enabled: !!selectedFolderId,
    queryFn: async () => {
      console.log('Fetching files for folder:', selectedFolderId);
      const { data: files, error } = await supabase
        .from("audio_files")
        .select("*")
        .eq("folder_id", selectedFolderId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      console.log('Files found:', files);
      return files || [];
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("folders")
        .insert([{ name }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      setNewFolderName("");
      setIsCreateFolderOpen(false);
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

  const renameFolderMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from("folders")
        .update({ name })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      setEditingFolderId(null);
      setEditingFolderName("");
      toast({
        description: "Dossier renommé avec succès",
      });
    },
    onError: (error) => {
      console.error("Error renaming folder:", error);
      toast({
        variant: "destructive",
        description: "Erreur lors du renommage du dossier",
      });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, folderId }: { file: File, folderId?: string }) => {
      if (!folderId) {
        throw new Error("Veuillez sélectionner un dossier");
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const isAudio = SUPPORTED_AUDIO_FORMATS['audio/*'].some(format => 
        format.toLowerCase().includes(fileExt?.toLowerCase() || '')
      );
      const isText = fileExt === 'txt';

      if (!isAudio && !isText) {
        throw new Error(`Format de fichier non supporté. Formats acceptés: ${SUPPORTED_AUDIO_FORMATS['audio/*'].join(', ')} et .txt`);
      }

      const filePath = `${folderId}/${file.name}`;
      console.log('Uploading file:', file.name, 'to path:', filePath);
      
      const { error: uploadError } = await supabase.storage
        .from("audio")
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('File uploaded successfully, creating database entry');
      const { error: dbError } = await supabase
        .from("audio_files")
        .insert([{
          filename: file.name,
          file_path: filePath,
          file_type: isAudio ? 'audio' : 'text',
          folder_id: folderId
        }]);

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folder-files"] });
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
    console.log('Files dropped:', acceptedFiles);
    for (const file of acceptedFiles) {
      await uploadFileMutation.mutate({ file, folderId: selectedFolderId });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: SUPPORTED_AUDIO_FORMATS,
    disabled: !selectedFolderId
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

  const handleRenameFolder = (id: string) => {
    if (!editingFolderName.trim()) {
      toast({
        variant: "destructive",
        description: "Le nom du dossier est requis",
      });
      return;
    }
    renameFolderMutation.mutate({ id, name: editingFolderName });
  };

  const startEditing = (folder: { id: string; name: string }) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };

  const filteredFolders = folders?.filter(folder => 
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="p-4">Chargement...</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un dossier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau dossier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un nouveau dossier</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Nom du dossier"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
              <Button onClick={handleCreateFolder} className="w-full">
                Créer le dossier
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredFolders?.map((folder) => (
          <div
            key={folder.id}
            className={`p-4 border rounded-lg flex items-center gap-3 cursor-pointer hover:bg-accent transition-colors group ${
              selectedFolderId === folder.id ? 'bg-accent' : ''
            }`}
            onClick={() => setSelectedFolderId(folder.id)}
          >
            <Folder className="w-6 h-6 text-blue-500" />
            {editingFolderId === folder.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRenameFolder(folder.id);
                }}
                className="flex-1 flex gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <Input
                  value={editingFolderName}
                  onChange={(e) => setEditingFolderName(e.target.value)}
                  autoFocus
                  onBlur={() => {
                    if (editingFolderName.trim()) {
                      handleRenameFolder(folder.id);
                    }
                  }}
                />
              </form>
            ) : (
              <>
                <span className="font-medium flex-1">{folder.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing(folder);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>

      {selectedFolderId && (
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
              : `Glissez et déposez des fichiers audio (${SUPPORTED_AUDIO_FORMATS['audio/*'].join(', ')}) ou texte (.txt), ou cliquez pour sélectionner`}
          </p>
        </div>
      )}

      {selectedFolderFiles && selectedFolderFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">Fichiers dans ce dossier :</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {selectedFolderFiles.map((file) => (
              <div key={file.id} className="p-4 border rounded-lg">
                <p className="truncate">{file.filename}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(file.created_at), 'PPP', { locale: fr })}
                </p>
                <p className="text-sm text-muted-foreground">
                  Type: {file.file_type === 'text' ? 'Transcription' : 'Audio'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};