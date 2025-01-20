import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export function WhatsApp() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-8">WhatsApp Web</h1>
      <div className="text-center">
        <p className="text-muted-foreground mb-6">
          Ouvrez WhatsApp Web dans un nouvel onglet pour accéder à vos conversations
        </p>
        <Button 
          onClick={() => window.open("https://web.whatsapp.com/", "_blank")}
          size="lg"
          className="gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Ouvrir WhatsApp Web
        </Button>
      </div>
    </div>
  );
}