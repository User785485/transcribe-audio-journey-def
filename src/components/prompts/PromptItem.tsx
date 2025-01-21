import { Button } from "@/components/ui/button";
import { Pencil, Trash2, GripVertical } from "lucide-react";
import { useState } from "react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";

interface PromptItemProps {
  prompt: {
    id: string;
    title: string;
    content: string;
    order: number;
  };
  onEdit: (prompt: { id: string; title: string; content: string }) => void;
  onDelete: (id: string) => void;
}

export const PromptItem = ({ prompt, onEdit, onDelete }: PromptItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: prompt.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="p-4 border rounded-lg space-y-2 bg-background"
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-2 flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="cursor-grab"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </Button>
          <h3 className="font-medium">{prompt.title}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-2"
          >
            {isExpanded ? "Réduire" : "Voir plus"}
          </Button>
        </div>
        <div className="flex space-x-2">
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