import { useState } from "react";
import { Folder as FolderIcon, ChevronRight, ChevronDown, MoreVertical, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderContents } from "./FolderContents";
import { Folder } from "@/types/folder";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Props {
  folder: Folder;
  level?: number;
  openFolders: Set<string>;
  onToggleFolder: (folderId: string) => void;
  onRename: (folderId: string, newName: string) => void;
  onDelete: (folderId: string) => void;
  onDeleteFile: (fileId: string) => void;
}

export function FolderTree({
  folder,
  level = 0,
  openFolders,
  onToggleFolder,
  onRename,
  onDelete,
  onDeleteFile
}: Props) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  const isOpen = openFolders.has(folder.id);

  const handleRename = () => {
    if (newName.trim() && newName !== folder.name) {
      onRename(folder.id, newName);
    }
    setIsRenaming(false);
  };

  return (
    <div style={{ paddingLeft: `${level * 16}px` }}>
      <Collapsible
        open={isOpen}
        onOpenChange={() => onToggleFolder(folder.id)}
      >
        <div className="flex items-center py-1">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          <FolderIcon className="h-4 w-4 text-muted-foreground mx-2" />
          
          {isRenaming ? (
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") setIsRenaming(false);
                }}
                autoFocus
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRename}
              >
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRenaming(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <span className="text-sm font-medium">{folder.name}</span>
              <div className="ml-auto flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsRenaming(true)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          className="text-red-600"
                          onSelect={(e) => e.preventDefault()}
                        >
                          Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Folder</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this folder and all its contents?
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(folder.id)}
                            className="bg-red-600"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
        </div>

        <CollapsibleContent>
          {folder.subfolders?.length > 0 && (
            <>
              {folder.subfolders.map((subfolder) => (
                <FolderTree
                  key={subfolder.id}
                  folder={subfolder}
                  level={level + 1}
                  openFolders={openFolders}
                  onToggleFolder={onToggleFolder}
                  onRename={onRename}
                  onDelete={onDelete}
                  onDeleteFile={onDeleteFile}
                />
              ))}
              <Separator className="my-2" />
            </>
          )}
          
          {folder.transcriptions?.length > 0 && (
            <div className="mt-2">
              <FolderContents
                files={folder.transcriptions}
                onDelete={onDeleteFile}
              />
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}