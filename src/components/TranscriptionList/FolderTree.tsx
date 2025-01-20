import { useState } from 'react';
import { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Folder, ChevronRight, ChevronDown, Pencil } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FolderContents } from './FolderContents';

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
  openFolders: Set<string>;
  onToggleFolder: (folderId: string) => void;
}

export function FolderTree({ 
  folder, 
  searchTerm, 
  onMoveToFolder, 
  onRenameFolder,
  openFolders,
  onToggleFolder
}: FolderTreeProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  const isOpen = openFolders.has(folder.id);

  return (
    <div className="space-y-4">
      <Collapsible open={isOpen} onOpenChange={() => onToggleFolder(folder.id)}>
        <CollapsibleTrigger className="flex items-center gap-2 p-2 hover:bg-accent rounded-lg cursor-pointer w-full">
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <Folder className="w-4 h-4" />
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
                />
              </form>
            ) : (
              <span className="text-left flex-1">{folder.name}</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setIsRenaming(true);
              setNewName(folder.name);
            }}
          >
            <Pencil className="w-4 h-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {folder.subfolders?.length > 0 && (
            <div className="space-y-2 pl-4">
              {folder.subfolders.map((subfolder) => (
                <FolderTree
                  key={subfolder.id}
                  folder={subfolder}
                  searchTerm={searchTerm}
                  onMoveToFolder={onMoveToFolder}
                  onRenameFolder={onRenameFolder}
                  openFolders={openFolders}
                  onToggleFolder={onToggleFolder}
                />
              ))}
            </div>
          )}
          
          {folder.transcriptions?.length > 0 && (
            <div className="pl-4 mt-2">
              <FolderContents
                transcriptions={folder.transcriptions}
                onMoveToFolder={onMoveToFolder}
                searchTerm={searchTerm}
              />
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}