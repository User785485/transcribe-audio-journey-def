import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Transcription } from "@/types/folder";

interface Props {
  files: Transcription[];
  onDelete: (id: string) => void;
}

export function FolderContents(props: Props) {
  const { files, onDelete } = props;
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {files.map((file) => (
        <Card key={file.id} className="p-4">
          <h3 className="font-semibold mb-2">{file.filename}</h3>
          <p className="text-sm text-gray-500 mb-4">
            Created: {format(new Date(file.created_at), "PPP")}
          </p>
          <div className="flex justify-end">
            <Button
              variant="destructive"
              onClick={() => onDelete(file.id)}
            >
              Delete
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
