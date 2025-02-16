import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface AudioFile {
  id: string;
  filename: string;
  file_path: string;
  file_type: string;
  folder_id: string | null;
  created_at: string;
}

export function Database() {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [selectedFolderFiles, setSelectedFolderFiles] = useState<AudioFile[]>([]);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from("audio_files")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setFiles(data);
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      await fetchFiles();
      return;
    }

    try {
      const { data, error } = await supabase
        .from("audio_files")
        .select("*")
        .ilike("filename", `%${searchTerm}%`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setFiles(data);
    } catch (error) {
      console.error("Error searching files:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("audio_files")
        .delete()
        .match({ id });

      if (error) throw error;
      await fetchFiles();
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  const handleFolderSelect = async (folderId: string) => {
    setSelectedFolder(folderId);
    try {
      const { data, error } = await supabase
        .from("audio_files")
        .select("*")
        .eq("folder_id", folderId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setSelectedFolderFiles(data);
    } catch (error) {
      console.error("Error fetching folder files:", error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex gap-2">
        <Input
          type="text"
          placeholder="Search files..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleSearch}>Search</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {files.map((file) => (
          <Card key={file.id} className="p-4">
            <h3 className="font-semibold mb-2">{file.filename}</h3>
            <p className="text-sm text-gray-500 mb-2">
              Type: {file.file_type}
            </p>
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => handleFolderSelect(file.folder_id || "")}
                disabled={!file.folder_id}
              >
                View Folder
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(file.id)}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {selectedFolder && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Folder Contents</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {selectedFolderFiles.map((file) => (
              <Card key={file.id} className="p-4">
                <h3 className="font-semibold mb-2">{file.filename}</h3>
                <p className="text-sm text-gray-500">
                  Type: {file.file_type}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}