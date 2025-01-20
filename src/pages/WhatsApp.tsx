import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function WhatsApp() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleIframeError = () => {
      setError("Impossible de charger WhatsApp Web. Veuillez vérifier votre connexion internet ou essayer à nouveau plus tard.");
      console.error("WhatsApp iframe failed to load");
    };

    const iframe = document.querySelector('iframe');
    if (iframe) {
      iframe.addEventListener('error', handleIframeError);
      return () => iframe.removeEventListener('error', handleIframeError);
    }
  }, []);

  return (
    <div className="h-full w-full p-4">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="relative h-[calc(100vh-8rem)] w-full rounded-lg border overflow-hidden">
        <iframe 
          src="https://web.whatsapp.com/"
          className="absolute inset-0 w-full h-full"
          title="WhatsApp Web"
          allow="camera; microphone"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
        />
      </div>
    </div>
  );
}