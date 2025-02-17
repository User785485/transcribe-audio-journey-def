import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderTree } from "./FolderTree";

export function TranscriptionList() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transcriptions</CardTitle>
        <CardDescription>
          View and manage your transcribed files
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FolderTree />
      </CardContent>
    </Card>
  );
}
