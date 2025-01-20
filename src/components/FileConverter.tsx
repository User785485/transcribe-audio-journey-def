import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export const FileConverter = () => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-8">Convertisseur de Fichiers</h1>
      <div className="text-center">
        <p className="text-muted-foreground mb-6">
          Utilisez FreeConvert.com pour convertir vos fichiers audio facilement
        </p>
        <Button 
          onClick={() => window.open("https://www.freeconvert.com/", "_blank")}
          size="lg"
          className="gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Ouvrir FreeConvert
        </Button>
      </div>
    </div>
  );
};

export default FileConverter;