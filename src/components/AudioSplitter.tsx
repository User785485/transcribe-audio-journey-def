import { useState, useCallback } from "react";
import { DropZone } from "./DropZone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const SUPPORTED_FORMATS = {
  'audio/opus': ['.opus'],
  'audio/ogg': ['.ogg'],
  'audio/mpeg': ['.mp3']
};

const MAX_CHUNK_SIZE = 20 * 1024 * 1024; // 20MB in bytes

interface ChunkProgress {
  id: string;
  originalName: string;
  chunks: {
    number: number;
    size: number;
    blob: Blob;
  }[];
  status: 'splitting' | 'completed' | 'error';
  error?: string;
}

export function AudioSplitter() {
  const [progress, setProgress] = useState<ChunkProgress[]>([]);
  const { toast } = useToast();

  const splitFile = async (file: File) => {
    const id = crypto.randomUUID();
    const chunks: { number: number; size: number; blob: Blob }[] = [];
    
    setProgress(prev => [...prev, {
      id,
      originalName: file.name,
      chunks: [],
      status: 'splitting'
    }]);

    try {
      const totalChunks = Math.ceil(file.size / MAX_CHUNK_SIZE);
      
      for (let i = 0; i < totalChunks; i++) {
        const start = i * MAX_CHUNK_SIZE;
        const end = Math.min(start + MAX_CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        
        const chunkBlob = new Blob([chunk], { type: file.type });
        chunks.push({
          number: i + 1,
          size: chunkBlob.size,
          blob: chunkBlob
        });
      }

      setProgress(prev => prev.map(p => 
        p.id === id ? {
          ...p,
          chunks,
          status: 'completed'
        } : p
      ));

      toast({
        title: "Découpage terminé",
        description: `Le fichier ${file.name} a été découpé en ${chunks.length} parties.`,
      });
    } catch (error) {
      console.error('Erreur lors du découpage:', error);
      setProgress(prev => prev.map(p => 
        p.id === id ? {
          ...p,
          status: 'error',
          error: error instanceof Error ? error.message : "Une erreur est survenue"
        } : p
      ));

      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors du découpage de ${file.name}`,
      });
    }
  };

  const handleDrop = useCallback((files: File[]) => {
    files.forEach(splitFile);
  }, []);

  const downloadChunk = (chunk: Blob, originalName: string, chunkNumber: number, totalChunks: number) => {
    const extension = originalName.split('.').pop();
    const nameWithoutExt = originalName.replace(`.${extension}`, '');
    const newFileName = `${nameWithoutExt}_partie${chunkNumber}de${totalChunks}.${extension}`;
    
    const url = URL.createObjectURL(chunk);
    const a = document.createElement('a');
    a.href = url;
    a.download = newFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <DropZone
          onDrop={handleDrop}
          supportedFormats={SUPPORTED_FORMATS}
          index={0}
        />
      </div>

      {progress.map((item) => (
        <div key={item.id} className="space-y-4 border rounded-lg p-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">{item.originalName}</h3>
            <span className="text-sm text-muted-foreground">
              {item.status === 'splitting' && 'Découpage en cours...'}
              {item.status === 'completed' && 'Terminé'}
              {item.status === 'error' && 'Erreur'}
            </span>
          </div>
          
          {item.status === 'splitting' && (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <p>Découpage en cours...</p>
            </div>
          )}

          {item.status === 'completed' && (
            <div className="space-y-4">
              <p>Fichier découpé en {item.chunks.length} parties</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {item.chunks.map((chunk) => (
                  <Button
                    key={chunk.number}
                    onClick={() => downloadChunk(chunk.blob, item.originalName, chunk.number, item.chunks.length)}
                    variant="outline"
                    className="w-full"
                  >
                    Partie {chunk.number} ({Math.round(chunk.size / 1024 / 1024)}MB)
                  </Button>
                ))}
              </div>
            </div>
          )}

          {item.status === 'error' && (
            <p className="text-destructive">{item.error}</p>
          )}
        </div>
      ))}
    </div>
  );
}