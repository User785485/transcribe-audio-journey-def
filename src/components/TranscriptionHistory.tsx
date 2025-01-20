import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download, Copy, Search, FileAudio } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function TranscriptionHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const { data: transcriptions, isLoading } = useQuery({
    queryKey: ['transcriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transcriptions')
        .select(`
          *,
          audio_files (
            filename,
            created_at,
            file_path
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const filteredTranscriptions = transcriptions?.filter(t => 
    t.transcription.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.audio_files?.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      description: "Texte copié dans le presse-papier",
    });
  };

  const handleDownload = async (filePath: string, filename: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('audio')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de télécharger le fichier audio",
      });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Chargement...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center space-x-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher dans les transcriptions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fichier</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Transcription</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTranscriptions?.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="flex items-center gap-2">
                  <FileAudio className="w-4 h-4" />
                  {t.audio_files?.filename}
                </TableCell>
                <TableCell>
                  {format(new Date(t.created_at), 'PPP', { locale: fr })}
                </TableCell>
                <TableCell className="max-w-md truncate">
                  {t.transcription}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy(t.transcription)}
                      title="Copier la transcription"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => t.audio_files && handleDownload(t.audio_files.file_path, t.audio_files.filename)}
                      title="Télécharger l'audio"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}