import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Copy, Download } from "lucide-react";

export function TranscriptionHistory() {
  const { toast } = useToast();

  const { data: historyItems, error: historyError } = useQuery({
    queryKey: ['transcription-history'],
    queryFn: async () => {
      console.log('🔍 Fetching transcription history...');
      const { data, error } = await supabase
        .from('history')
        .select('*')
        .eq('file_type', 'transcription')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('❌ Error fetching history:', error);
        throw error;
      }

      console.log('✅ History items fetched:', data);
      return data;
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
      console.error('❌ Error downloading file:', error);
      toast({
        variant: "destructive",
        description: "Impossible de télécharger le fichier audio",
      });
    }
  };

  if (historyError) {
    console.error('🚨 Error loading history:', historyError);
    return <div>Erreur de chargement des données. Veuillez rafraîchir la page.</div>;
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fichier</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {historyItems?.map(item => (
            <TableRow key={item.id}>
              <TableCell>{item.filename}</TableCell>
              <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleCopy(item.transcription!)}
                    size="sm"
                    variant="outline"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copier
                  </Button>
                  <Button
                    onClick={() => handleDownload(item.file_path, item.filename)}
                    size="sm"
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}