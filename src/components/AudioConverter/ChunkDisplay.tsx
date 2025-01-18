import { Button } from "@/components/ui/button";
import { ChunkProgress } from "./types";
import { Loader2 } from "lucide-react";

interface ChunkDisplayProps {
  item: ChunkProgress;
  onDownloadChunk: (chunk: Blob, originalName: string, chunkNumber: number, totalChunks: number) => void;
  onTranscribeChunk: (chunk: Blob, originalName: string, chunkNumber: number, totalChunks: number) => void;
}

export function ChunkDisplay({ item, onDownloadChunk, onTranscribeChunk }: ChunkDisplayProps) {
  return (
    <div className="space-y-4 border rounded-lg p-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">{item.originalName}</h3>
        <span className="text-sm text-muted-foreground">
          {item.status === 'splitting' && 'Conversion et découpage en cours...'}
          {item.status === 'completed' && 'Terminé'}
          {item.status === 'error' && 'Erreur'}
        </span>
      </div>
      
      {item.status === 'splitting' && (
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <p>Conversion et découpage en cours...</p>
        </div>
      )}

      {item.status === 'completed' && (
        <div className="space-y-4">
          <p>Fichier découpé en {item.chunks.length} parties</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {item.chunks.map((chunk) => (
              <div key={chunk.number} className="flex gap-2">
                <Button
                  onClick={() => onDownloadChunk(chunk.blob, item.originalName, chunk.number, item.chunks.length)}
                  variant="outline"
                  className="flex-1"
                >
                  Partie {chunk.number} ({Math.round(chunk.size / 1024 / 1024)}MB)
                </Button>
                <Button
                  onClick={() => onTranscribeChunk(chunk.blob, item.originalName, chunk.number, item.chunks.length)}
                  variant="secondary"
                >
                  Transcrire
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {item.status === 'error' && (
        <p className="text-destructive">{item.error}</p>
      )}
    </div>
  );
}