import { useState, useEffect } from "react";
import { Folder as FolderIcon, ChevronRight, ChevronDown, MoreVertical, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderContents } from "./FolderContents";
import { Folder } from "@/types/folder";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function FolderTree() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      console.log("Fetching folders...");
      const { data: foldersData, error: foldersError } = await supabase
        .from("folders")
        .select("*");

      if (foldersError) {
        console.error("Error fetching folders:", foldersError);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch folders"
        });
        return;
      }

      console.log("Fetched folders:", foldersData);

      const { data: transcriptionsData, error: transcriptionsError } = await supabase
        .from("transcriptions")
        .select("*");

      if (transcriptionsError) {
        console.error("Error fetching transcriptions:", transcriptionsError);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch transcriptions"
        });
        return;
      }

      console.log("Fetched transcriptions:", transcriptionsData);

      // Organize data into a tree structure
      const organizedFolders = foldersData.map(folder => ({
        ...folder,
        transcriptions: transcriptionsData.filter(t => t.folder_id === folder.id) || [],
        subfolders: []
      }));

      console.log("Organized folders:", organizedFolders);
      setFolders(organizedFolders);
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (folderId: string, newName: string) => {
    try {
      console.log("Renaming folder:", folderId, "to:", newName);
      const { error } = await supabase
        .from("folders")
        .update({ name: newName })
        .eq("id", folderId);

      if (error) throw error;

      toast({
        description: "Folder renamed successfully"
      });
      
      fetchFolders();
    } catch (error) {
      console.error("Error renaming folder:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to rename folder"
      });
    }
  };

  const handleDelete = async (folderId: string) => {
    try {
      console.log("Deleting folder:", folderId);
      const { error } = await supabase
        .from("folders")
        .delete()
        .eq("id", folderId);

      if (error) throw error;

      toast({
        description: "Folder deleted successfully"
      });
      
      fetchFolders();
    } catch (error) {
      console.error("Error deleting folder:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete folder"
      });
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      console.log("Deleting file:", fileId);
      const { error } = await supabase
        .from("transcriptions")
        .delete()
        .eq("id", fileId);

      if (error) throw error;

      toast({
        description: "File deleted successfully"
      });
      
      fetchFolders();
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete file"
      });
    }
  };

  const toggleFolder = (folderId: string) => {
    setOpenFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  if (loading) {
    return <div className="p-4">Loading folders...</div>;
  }

  return (
    <div className="space-y-4">
      {folders.map(folder => (
        <div key={folder.id} className="rounded-lg border bg-card">
          <Collapsible
            open={openFolders.has(folder.id)}
            onOpenChange={() => toggleFolder(folder.id)}
          >
            <div className="flex items-center p-4">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  {openFolders.has(folder.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>

              <FolderIcon className="h-4 w-4 text-muted-foreground mx-2" />
              <span className="text-sm font-medium">{folder.name}</span>

              <div className="ml-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      const newName = prompt("Enter new name:", folder.name);
                      if (newName && newName !== folder.name) {
                        handleRename(folder.id, newName);
                      }
                    }}>
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
                            onClick={() => handleDelete(folder.id)}
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
            </div>

            <CollapsibleContent>
              {folder.transcriptions?.length > 0 && (
                <div className="p-4 pt-0">
                  <FolderContents
                    files={folder.transcriptions}
                    onDelete={handleDeleteFile}
                  />
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      ))}
    </div>
  );
}