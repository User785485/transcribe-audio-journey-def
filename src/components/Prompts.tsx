import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { PromptItem } from "./prompts/PromptItem";

export function Prompts() {
  const [prompts, setPrompts] = useState<Array<{
    id: string;
    content: string;
    isActive: boolean;
  }>>([]);
  const [newPrompt, setNewPrompt] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPrompts((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addPrompt = () => {
    if (newPrompt.trim()) {
      const prompt = {
        id: `prompt-${Date.now()}`,
        content: newPrompt.trim(),
        isActive: true,
      };
      setPrompts([...prompts, prompt]);
      setNewPrompt("");
    }
  };

  const togglePrompt = (id: string) => {
    setPrompts(
      prompts.map((prompt) =>
        prompt.id === id ? { ...prompt, isActive: !prompt.isActive } : prompt
      )
    );
  };

  const removePrompt = (id: string) => {
    setPrompts(prompts.filter((prompt) => prompt.id !== id));
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Manage Prompts</h1>
      
      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            placeholder="Enter a new prompt..."
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={addPrompt}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Add
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={prompts} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {prompts.map((prompt) => (
              <PromptItem
                key={prompt.id}
                id={prompt.id}
                content={prompt.content}
                isActive={prompt.isActive}
                onToggle={() => togglePrompt(prompt.id)}
                onRemove={() => removePrompt(prompt.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
