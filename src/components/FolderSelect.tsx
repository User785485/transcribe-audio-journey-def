import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Folder, ChevronRight } from "lucide-react";

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
}

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
        className="w-full justify-start gap-2"
        style={{ paddingLeft: `${depth * 16 + 16}px` }}
        onClick={() => onSelect(folder.id)}
      >
        <Folder className="h-4 w-4" />
        <span className="truncate">{folder.name}</span>
        <ChevronRight className="h-4 w-4 ml-auto" />
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choisir un dossier</DialogTitle>
          <DialogDescription>
            Sélectionnez un dossier de destination pour votre fichier
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-1">
            {folders.map((folder) => renderFolder(folder))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}