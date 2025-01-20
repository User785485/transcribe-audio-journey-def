import { useState } from 'react';
import { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Folder, ChevronRight, ChevronDown, Pencil, Trash } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FolderContents } from './FolderContents';
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type Transcription = Database['public']['Tables']['transcriptions']['Row'] & {
  audio_files: Database['public']['Tables']['audio_files']['Row'] | null;
};

type Folder = Database['public']['Tables']['folders']['Row'] & {
  transcriptions: Transcription[];
  subfolders: Folder[];
};

interface FolderTreeProps {
  folder: Folder;
  searchTerm: string;
  onMoveToFolder: (transcriptionId: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  openFolders: Set<string>;
  onToggleFolder: (folderId: string) => void;
}

export function FolderTree({ 
  folder, 
  searchTerm, 
  onMoveToFolder, 
  onRenameFolder,
  onDeleteFolder,
  openFolders,
  onToggleFolder
}: FolderTreeProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  const isOpen = openFolders.has(folder.id);

  const handleDelete = () => {
    onDeleteFolder(folder.id);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card">
        <Collapsible open={isOpen} onOpenChange={() => onToggleFolder(folder.id)}>
          <CollapsibleTrigger className="flex items-center gap-2 p-4 hover:bg-accent rounded-t-lg cursor-pointer w-full">
            <div className="flex items-center gap-2 flex-1">
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              <Folder className="w-4 h-4 text-primary" />
              {isRenaming ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newName.trim()) {
                      onRenameFolder(folder.id, newName);
                      setIsRenaming(false);
                    }
                  }}
                  className="flex-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                    onBlur={() => {
                      if (newName.trim()) {
                        onRenameFolder(folder.id, newName);
                        setIsRenaming(false);
                      }
                    }}
                    className="max-w-sm"
                  />
                </form>
              ) : (
                <span className="text-left flex-1 font-medium">{folder.name}</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRenaming(true);
                  setNewName(folder.name);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              {folder.name.toLowerCase() !== 'malo' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => e.stopPropagation()}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action ne peut pas être annulée. Le dossier et son contenu seront définitivement supprimés.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 pt-0">
            {folder.subfolders?.length > 0 && (
              <div className="space-y-4 mt-4">
                {folder.subfolders.map((subfolder) => (
                  <FolderTree
                    key={subfolder.id}
                    folder={subfolder}
                    searchTerm={searchTerm}
                    onMoveToFolder={onMoveToFolder}
                    onRenameFolder={onRenameFolder}
                    onDeleteFolder={onDeleteFolder}
                    openFolders={openFolders}
                    onToggleFolder={onToggleFolder}
                  />
                ))}
              </div>
            )}
            
            {folder.transcriptions?.length > 0 && (
              <div className="mt-4">
                <FolderContents
                  transcriptions={folder.transcriptions}
                  onMoveToFolder={onMoveToFolder}
                  searchTerm={searchTerm}
                  folderId={folder.id}
                />
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
      <Separator className="my-6" />
    </div>
  );
}