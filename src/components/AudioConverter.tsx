import { useState, useCallback } from "react";
import { FileAudio2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { DropZone } from "./DropZone";
import { Mp3Converter } from "./AudioConverter/Mp3Converter";
import { AudioAnalyzer } from "./AudioConverter/AudioAnalyzer";
import { SUPPORTED_FORMATS, CONVERSION_TYPES, ConversionType } from "./AudioConverter/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ConversionProgress {
  id: string;
  originalName: string;
  status: 'pending' | 'converting' | 'completed' | 'error';
  progress: number;
  convertedFile?: File;
  error?: string;
}

export function AudioConverter() {
  const [conversionProgress, setConversionProgress] = useState<ConversionProgress[]>([]);
  const { toast } = useToast();
  const mp3Converter = new Mp3Converter();
  const audioAnalyzer = new AudioAnalyzer();

  const processFile = async (file: File, conversionType: ConversionType) => {
    console.log('Processing file:', { name: file.name, type: file.type, conversionType });
    
    const id = crypto.randomUUID();
    setConversionProgress(prev => [...prev, {
      id,
      originalName: file.name,
      status: 'pending',
      progress: 0
    }]);

    try {
      // Analyze file
      const metadata = await audioAnalyzer.analyzeFile(file);
      console.log('File metadata:', metadata);

      if (!metadata.needsConversion) {
        setConversionProgress(prev => prev.map(p => 
          p.id === id ? {
            ...p,
            status: 'completed',
            progress: 100,
            convertedFile: file
          } : p
        ));
        toast({
          title: "Fichier déjà au format MP3",
          description: `Le fichier ${file.name} est déjà au format MP3.`,
        });
        return;
      }

      // Verify file format matches conversion type
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      const isValidFormat = CONVERSION_TYPES[conversionType].formats.includes(fileExtension);
      
      if (!isValidFormat) {
        throw new Error(`Format de fichier non supporté pour la conversion ${CONVERSION_TYPES[conversionType].label}`);
      }

      setConversionProgress(prev => prev.map(p => 
        p.id === id ? {
          ...p,
          status: 'converting',
          progress: 30
        } : p
      ));

      // Convert to MP3
      const mp3File = await mp3Converter.convertToMp3(file);
      
      setConversionProgress(prev => prev.map(p => 
        p.id === id ? {
          ...p,
          status: 'completed',
          progress: 100,
          convertedFile: mp3File
        } : p
      ));

      toast({
        title: "Conversion terminée",
        description: `Le fichier ${file.name} a été converti en MP3.`,
      });
    } catch (error) {
      console.error('Error processing file:', error);
      setConversionProgress(prev => prev.map(p => 
        p.id === id ? {
          ...p,
          status: 'error',
          progress: 100,
          error: error instanceof Error ? error.message : "Une erreur est survenue"
        } : p
      ));

      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de la conversion de ${file.name}: ${error instanceof Error ? error.message : "Une erreur est survenue"}`,
      });
    }
  };

  const handleDrop = useCallback((acceptedFiles: File[], conversionType: ConversionType) => {
    acceptedFiles.forEach(file => processFile(file, conversionType));
  }, []);

  const handleSaveFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      description: `Le fichier ${file.name} a été téléchargé.`,
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Convertir en MP3</h2>
        <p className="text-muted-foreground">
          Choisissez le type de conversion et déposez vos fichiers audio.
          Les fichiers convertis pourront ensuite être découpés ou transcrits.
        </p>
      </div>

      <Tabs defaultValue="ogg-to-mp3" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {Object.entries(CONVERSION_TYPES).map(([key, { label }]) => (
            <TabsTrigger key={key} value={key}>{label}</TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(CONVERSION_TYPES).map(([key, { label, formats }]) => (
          <TabsContent key={key} value={key}>
            <Card>
              <CardHeader>
                <CardTitle>{label}</CardTitle>
                <CardDescription>
                  Formats supportés : {formats.join(', ')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <DropZone
                      key={index}
                      onDrop={(files) => handleDrop(files, key as ConversionType)}
                      supportedFormats={formats}
                      index={index}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {conversionProgress.map((item) => (
        <div key={item.id} className="space-y-4 border rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FileAudio2 className="h-4 w-4" />
              <h3 className="font-medium">{item.originalName}</h3>
            </div>
            <span className="text-sm text-muted-foreground">
              {item.status === 'pending' && 'En attente...'}
              {item.status === 'converting' && 'Conversion en cours...'}
              {item.status === 'completed' && 'Terminé'}
              {item.status === 'error' && 'Erreur'}
            </span>
          </div>
          
          <Progress value={item.progress} className="w-full" />
          
          {item.status === 'completed' && item.convertedFile && (
            <Button
              onClick={() => handleSaveFile(item.convertedFile!)}
              size="sm"
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Télécharger le MP3
            </Button>
          )}

          {item.status === 'error' && (
            <p className="text-destructive">{item.error}</p>
          )}
        </div>
      ))}
    </div>
  );
}