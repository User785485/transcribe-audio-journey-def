import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PromptItem } from "./prompts/PromptItem";
import { PromptDialog } from "./prompts/PromptDialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const { data: prompts, isLoading, error } = useQuery({
    queryKey: ["prompts"],
    queryFn: async () => {
      console.log("Fetching prompts...");
      try {
        const { data, error } = await supabase
          .from("prompts")
          .select("*")
          .order("order", { ascending: true });

        if (error) {
          console.error("Error fetching prompts:", error);
          throw error;
        }
        
        console.log("Prompts fetched:", data);
        return data;
      } catch (err) {
        console.error("Failed to fetch prompts:", err);
        throw err;
      }
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: string; newOrder: number }) => {
      console.log("Updating order for prompt:", id, "to:", newOrder);
      const { data, error } = await supabase
        .from("prompts")
        .update({ order: newOrder })
        .eq("id", id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
      toast({
        description: "Ordre mis à jour avec succès",
      });
    },
    onError: (error) => {
      console.error("Error updating order:", error);
      toast({
        variant: "destructive",
        description: "Erreur lors de la mise à jour de l'ordre",
      });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id || !prompts) {
      return;
    }

    const oldIndex = prompts.findIndex((p) => p.id === active.id);
    const newIndex = prompts.findIndex((p) => p.id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const newPrompts = arrayMove(prompts, oldIndex, newIndex);
      
      // Update orders in database
      newPrompts.forEach((prompt, index) => {
        updateOrderMutation.mutate({
          id: prompt.id,
          newOrder: index + 1,
        });
      });

      // Optimistically update the cache
      queryClient.setQueryData(["prompts"], newPrompts);
    }
  };

  const createPromptMutation = useMutation({
    mutationFn: async (values: { title: string; content: string }) => {
      console.log("Creating prompt:", values);
      const maxOrder = prompts ? Math.max(...prompts.map(p => p.order), 0) : 0;
      const { data, error } = await supabase
        .from("prompts")
        .insert([{ ...values, order: maxOrder + 1 }]);
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

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Une erreur est survenue lors du chargement des prompts. Veuillez réessayer.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Prompts</h2>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Prompt
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={prompts?.map(p => p.id) ?? []}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid gap-4">
            {prompts?.map((prompt) => (
              <PromptItem
                key={prompt.id}
                prompt={prompt}
                onEdit={handleEdit}
                onDelete={(id) => setPromptToDelete(id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <PromptDialog
        isOpen={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setEditingPrompt(null);
            setTitle("");
            setContent("");
          }
        }}
        title={title}
        content={content}
        onTitleChange={setTitle}
        onContentChange={setContent}
        onSubmit={handleSubmit}
        isEditing={!!editingPrompt}
      />

      <AlertDialog open={!!promptToDelete}>
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
              onClick={() => promptToDelete && handleDelete(promptToDelete)}
            >
              Supprimer
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
