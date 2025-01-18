import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TranscriptionProgress } from "./types";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TranscriptionDisplayProps {
  item: TranscriptionProgress;
}

export function TranscriptionDisplay({ item }: TranscriptionDisplayProps) {
  const { toast } = useToast();

  return (
    <div className="space-y-4 border rounded-lg p-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">{item.filename}</h3>
        <span className="text-sm text-muted-foreground">
          {item.status === 'pending' && 'En attente...'}
          {item.status === 'transcribing' && 'Transcription en cours...'}
          {item.status === 'completed' && 'Terminé'}
          {item.status === 'error' && 'Erreur'}
        </span>
      </div>
      
      <Progress value={item.progress} className="w-full" />
      
      {item.status === 'transcribing' && (
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <p>Transcription en cours...</p>
        </div>
      )}

      {item.status === 'completed' && item.transcription && (
        <div className="rounded-lg bg-card p-4">
          <p className="whitespace-pre-wrap mb-4">{item.transcription}</p>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(item.transcription!);
              toast({
                description: "Transcription copiée dans le presse-papier",
              });
            }}
            size="sm"
          >
            Copier le texte
          </Button>
        </div>
      )}

      {item.status === 'error' && (
        <p className="text-destructive">{item.error}</p>
      )}
    </div>
  );
}