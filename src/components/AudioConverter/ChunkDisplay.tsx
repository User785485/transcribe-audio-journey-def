import { Button } from "@/components/ui/button";
import { ChunkProgress } from "./types";
import { Loader2, Download, FileAudio, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ChunkDisplayProps {
  item: ChunkProgress;
  onDownloadChunk: (chunk: Blob, originalName: string, chunkNumber: number, totalChunks: number) => void;
}

export function ChunkDisplay({ item, onDownloadChunk }: ChunkDisplayProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileAudio className="h-5 w-5" />
            {item.originalName}
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {item.status === 'splitting' && 'Découpage en cours...'}
            {item.status === 'completed' && `${item.chunks.length} parties`}
            {item.status === 'error' && 'Erreur'}
          </span>
        </div>
      </CardHeader>
      
      <CardContent>
        {item.status === 'splitting' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <p className="text-sm text-muted-foreground">Découpage du fichier en cours...</p>
            </div>
            <Progress value={item.progress} className="h-2" />
          </div>
        )}

        {item.status === 'completed' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {item.chunks.map((chunk) => (
                <Button
                  key={chunk.number}
                  onClick={() => onDownloadChunk(chunk.blob, item.originalName, chunk.number, item.chunks.length)}
                  variant="outline"
                  className="flex items-center gap-2 h-auto py-4 px-4"
                >
                  <Download className="h-4 w-4" />
                  <div className="flex flex-col items-start">
                    <span>Partie {chunk.number}</span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(chunk.size / 1024 / 1024)}MB
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {item.status === 'error' && (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">{item.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}