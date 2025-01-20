import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileAudio, Copy, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type HistoryItem = {
  id: string;
  filename: string;
  file_path: string;
  transcription: string | null;
  file_type: string;
  folder_name: string | null;
  created_at: string;
};

export function TranscriptionHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: historyItems, isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: async () => {
      console.log('Fetching history items...');
      const { data, error } = await supabase
        .from('history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching history:', error);
        throw error;
      }

      console.log('History items fetched:', data);
      return data as HistoryItem[];
    },
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      description: "Texte copié dans le presse-papier",
    });
  };

  const handleDownload = async (filePath: string, filename: string) => {
    try {
      console.log('Downloading file:', { filePath, filename });
      const { data, error } = await supabase.storage
        .from('audio')
        .download(filePath);

      if (error) {
        console.error('Error downloading file:', error);
        throw error;
      }

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log('File downloaded successfully');
    } catch (error) {
      console.error('Error in handleDownload:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de télécharger le fichier audio",
      });
    }
  };

  const filteredItems = historyItems?.filter(item =>
    item.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.transcription?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-lg text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold">Historique</CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher dans l'historique..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fichier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Transcription</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!filteredItems?.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Aucun fichier trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="flex items-center gap-2">
                        <FileAudio className="w-4 h-4" />
                        {item.filename}
                      </TableCell>
                      <TableCell>
                        {format(new Date(item.created_at), 'PPP', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        {item.file_type === 'to_convert' ? 'À convertir' :
                         item.file_type === 'converted' ? 'Converti' : 'Transcription'}
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {item.transcription}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {item.transcription && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleCopy(item.transcription!)}
                              title="Copier la transcription"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDownload(item.file_path, item.filename)}
                            title="Télécharger l'audio"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}