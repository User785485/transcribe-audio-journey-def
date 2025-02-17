import { useState, useEffect } from 'react';
import { FolderTree } from './FolderTree';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function TranscriptionList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    try {
      const { error } = await supabase
        .from('folders')
        .insert({ name: newFolderName.trim() });

      if (error) throw error;

      toast.success('Folder created successfully');
      setNewFolderName('');
      setIsCreatingFolder(false);
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              placeholder="Search files and folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setIsCreatingFolder(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Folder
          </Button>
        </div>

        {isCreatingFolder && (
          <div className="flex items-center gap-2 mb-4">
            <Input
              placeholder="Enter folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') createFolder();
                if (e.key === 'Escape') setIsCreatingFolder(false);
              }}
              autoFocus
            />
            <Button onClick={createFolder}>Create</Button>
            <Button
              variant="ghost"
              onClick={() => setIsCreatingFolder(false)}
            >
              Cancel
            </Button>
          </div>
        )}

        <FolderTree />
      </Card>
    </div>
  );
}
