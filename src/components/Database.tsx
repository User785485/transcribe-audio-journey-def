import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Folder, File, Plus, Upload } from "lucide-react";
import { useDropzone } from 'react-dropzone';

export function Database() {
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const { toast } = useToast();

  const { data: folders, isLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const onDrop = async (acceptedFiles: File[]) => {
    try {
      for (const file of acceptedFiles) {
        const filePath = `public/${crypto.randomUUID()}.${file.name.split('.').pop()}`;
        
        const { error: uploadError } = await supabase.storage
          .from('audio')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('audio_files')
          .insert({
            filename: file.name,
            file_path: filePath,
            file_type: 'to_convert'
          });

        if (dbError) throw dbError;
      }

      toast({
        description: "Fichier(s) ajouté(s) avec succès",
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout du fichier:', error);
      toast({
        variant: "destructive",
        description: "Erreur lors de l'ajout du fichier",
      });
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.ogg'],
      'text/plain': ['.txt']
    }
  });

  const handleCreateFolder = async () => {
    try {
      const { error } = await supabase
        .from('folders')
        .insert({ name: newFolderName });

      if (error) throw error;

      toast({
        description: "Dossier créé avec succès",
      });
      setIsCreateFolderOpen(false);
      setNewFolderName('');
    } catch (error) {
      console.error('Erreur lors de la création du dossier:', error);
      toast({
        variant: "destructive",
        description: "Erreur lors de la création du dossier",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-lg text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold">Base de données</CardTitle>
          <div className="flex gap-2">
            <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nouveau dossier
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un nouveau dossier</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Input
                    placeholder="Nom du dossier"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                  />
                  <Button onClick={handleCreateFolder} className="w-full">
                    Créer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div {...getRootProps()} className="border-2 border-dashed rounded-lg p-6 cursor-pointer hover:border-primary transition-colors mb-6">
            <input {...getInputProps()} />
            <div className="text-center space-y-2">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                Glissez-déposez des fichiers ici, ou cliquez pour sélectionner
              </p>
              <p className="text-sm text-muted-foreground">
                Formats supportés : .mp3, .wav, .m4a, .ogg, .txt
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {folders?.map((folder) => (
              <div
                key={folder.id}
                className="flex items-center gap-2 p-4 rounded-lg border hover:bg-accent cursor-pointer"
              >
                <Folder className="h-5 w-5 text-blue-500" />
                <span>{folder.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}