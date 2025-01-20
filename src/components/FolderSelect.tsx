import { useState } from "react";
import { Folder, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database } from "@/integrations/supabase/types";

type Folder = Database['public']['Tables']['folders']['Row'] & {
  subfolders?: Folder[];
};

interface FolderSelectProps {
  folders: Folder[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (folderId: string) => void;
}

export function FolderSelect({ folders, isOpen, onClose, onSelect }: FolderSelectProps) {
  const renderFolder = (folder: Folder, depth = 0) => (
    <div key={folder.id}>
      <Button
        variant="ghost"
        className="w-full justify-start gap-2 pl-4"
        style={{ paddingLeft: `${depth * 16 + 16}px` }}
        onClick={() => onSelect(folder.id)}
      >
        <Folder className="h-4 w-4" />
        <ChevronRight className="h-4 w-4" />
        {folder.name}
      </Button>
      {folder.subfolders?.map((subfolder) => renderFolder(subfolder, depth + 1))}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choisir un dossier</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-1">
            {folders?.map((folder) => renderFolder(folder))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}