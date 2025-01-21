import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PromptItemProps {
  prompt: {
    id: string;
    title: string;
    content: string;
    order: number;
  };
  onEdit: (prompt: { id: string; title: string; content: string }) => void;
  onDelete: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

export const PromptItem = ({ prompt, onEdit, onDelete, isFirst, isLast }: PromptItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const handleMoveUp = () => {
    updateOrderMutation.mutate({
      id: prompt.id,
      newOrder: prompt.order - 1,
    });
  };

  const handleMoveDown = () => {
    updateOrderMutation.mutate({
      id: prompt.id,
      newOrder: prompt.order + 1,
    });
  };

  return (
    <div className="p-4 border rounded-lg space-y-2 bg-background">
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-2 flex-1">
          <h3 className="font-medium">{prompt.title}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-2"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
        <div className="flex space-x-2">
          {!isFirst && (
            <Button variant="ghost" size="icon" onClick={handleMoveUp}>
              <ChevronUp className="w-4 h-4" />
            </Button>
          )}
          {!isLast && (
            <Button variant="ghost" size="icon" onClick={handleMoveDown}>
              <ChevronDown className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(prompt)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(prompt.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {isExpanded && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-2 p-2 bg-muted rounded-md">
          {prompt.content}
        </p>
      )}
    </div>
  );
};