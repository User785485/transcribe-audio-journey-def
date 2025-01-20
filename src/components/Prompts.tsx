import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export function Prompts() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [promptToDelete, setPromptToDelete] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<{
    id: string;
    title: string;
    content: string;
  } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const savedAuth = sessionStorage.getItem("prompts_authenticated");
    if (savedAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handlePasswordSubmit = () => {
    if (password === "1989") {
      setIsAuthenticated(true);
      sessionStorage.setItem("prompts_authenticated", "true");
    } else {
      toast({
        variant: "destructive",
        description: "Mot de passe incorrect",
      });
    }
  };

  const { data: prompts, isLoading } = useQuery({
    queryKey: ["prompts"],
    queryFn: async () => {
      console.log("Fetching prompts...");
      const { data, error } = await supabase
        .from("prompts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      console.log("Prompts fetched:", data);
      return data;
    },
  });

  const createPromptMutation = useMutation({
    mutationFn: async (values: { title: string; content: string }) => {
      console.log("Creating prompt:", values);
      const { data, error } = await supabase.from("prompts").insert([values]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
      setIsOpen(false);
      setTitle("");
      setContent("");
      toast({
        description: "Prompt créé avec succès",
      });
    },
    onError: (error) => {
      console.error("Error creating prompt:", error);
      toast({
        variant: "destructive",
        description: "Erreur lors de la création du prompt",
      });
    },
  });

  const updatePromptMutation = useMutation({
    mutationFn: async (values: { id: string; title: string; content: string }) => {
      console.log("Updating prompt:", values);
      const { data, error } = await supabase
        .from("prompts")
        .update({ title: values.title, content: values.content })
        .eq("id", values.id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
      setIsOpen(false);
      setEditingPrompt(null);
      toast({
        description: "Prompt mis à jour avec succès",
      });
    },
    onError: (error) => {
      console.error("Error updating prompt:", error);
      toast({
        variant: "destructive",
        description: "Erreur lors de la mise à jour du prompt",
      });
    },
  });

  const deletePromptMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log("Deleting prompt:", id);
      const { error } = await supabase.from("prompts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
      setPromptToDelete(null);
      setDeleteConfirmation("");
      toast({
        description: "Prompt supprimé avec succès",
      });
    },
    onError: (error) => {
      console.error("Error deleting prompt:", error);
      toast({
        variant: "destructive",
        description: "Erreur lors de la suppression du prompt",
      });
    },
  });

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) {
      toast({
        variant: "destructive",
        description: "Le titre et le contenu sont requis",
      });
      return;
    }

    if (editingPrompt) {
      updatePromptMutation.mutate({
        id: editingPrompt.id,
        title,
        content,
      });
    } else {
      createPromptMutation.mutate({ title, content });
    }
  };

  const handleEdit = (prompt: { id: string; title: string; content: string }) => {
    setEditingPrompt(prompt);
    setTitle(prompt.title);
    setContent(prompt.content);
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (deleteConfirmation.toLowerCase() === "confirmer") {
      deletePromptMutation.mutate(id);
    } else {
      toast({
        variant: "destructive",
        description: 'Veuillez écrire "confirmer" pour supprimer',
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md space-y-4">
          <h2 className="text-2xl font-bold text-center">Accès Protégé</h2>
          <Input
            type="password"
            placeholder="Entrez le mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
          />
          <Button className="w-full" onClick={handlePasswordSubmit}>
            Accéder
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-4">Chargement...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Prompts</h2>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setEditingPrompt(null);
            setTitle("");
            setContent("");
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Prompt
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPrompt ? "Modifier le prompt" : "Nouveau prompt"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Titre
                </label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titre du prompt"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="content" className="text-sm font-medium">
                  Contenu
                </label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Contenu du prompt"
                  rows={5}
                />
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingPrompt ? "Mettre à jour" : "Créer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {prompts?.map((prompt) => (
          <div
            key={prompt.id}
            className="p-4 border rounded-lg space-y-2 bg-background"
          >
            <div className="flex justify-between items-start">
              <h3 className="font-medium">{prompt.title}</h3>
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(prompt)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <AlertDialog open={promptToDelete === prompt.id}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPromptToDelete(prompt.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible. Écrivez "confirmer" pour supprimer ce prompt.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Input
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder='Écrivez "confirmer"'
                    />
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => {
                        setPromptToDelete(null);
                        setDeleteConfirmation("");
                      }}>
                        Annuler
                      </AlertDialogCancel>
                      <Button
                        variant="destructive"
                        onClick={() => handleDelete(prompt.id)}
                      >
                        Supprimer
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {prompt.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}