import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";

interface PromptItemProps {
  id: string;
  content: string;
  isActive: boolean;
  onToggle: () => void;
  onRemove: () => void;
}

export function PromptItem({ id, content, isActive, onToggle, onRemove }: PromptItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-white border rounded shadow-sm"
      {...attributes}
      {...listeners}
    >
      <div className="flex-1">
        <p className={`${isActive ? "text-gray-900" : "text-gray-400"}`}>
          {content}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
      >
        {isActive ? "Disable" : "Enable"}
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={onRemove}
      >
        Remove
      </Button>
    </div>
  );
}