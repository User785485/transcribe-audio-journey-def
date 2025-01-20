import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function WhatsApp() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      
      // Configuration plus agressive de l'iframe
      iframe.style.width = "100%";
      iframe.style.height = "calc(100vh - 2rem)";
      
      // Tentative de contournement maximale des restrictions
      iframe.setAttribute("sandbox", "allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-presentation allow-top-navigation allow-top-navigation-by-user-activation");
      iframe.setAttribute("loading", "eager");
      iframe.setAttribute("importance", "high");
      iframe.setAttribute("referrerpolicy", "no-referrer");
      
      // Injection de code plus agressive
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          console.log("Tentative d'injection de code avancée dans l'iframe");
          const script = iframeDoc.createElement('script');
          script.textContent = `
            // Suppression agressive des restrictions
            delete window.document.referrer;
            window.document.domain = '*';
            window.top.location = window.self.location;
            
            // Désactivation des protections
            Object.defineProperty(document, 'referrer', {value: ''});
            Object.defineProperty(document, 'domain', {value: '*'});
            
            // Modification des en-têtes
            const meta = document.createElement('meta');
            meta.setAttribute('http-equiv', 'Content-Security-Policy');
            meta.setAttribute('content', 'frame-ancestors *');
            document.head.appendChild(meta);
          `;
          iframeDoc.head.appendChild(script);
        }
      } catch (e) {
        console.log("Erreur lors de l'injection avancée:", e);
        toast({
          title: "Erreur de chargement",
          description: "WhatsApp ne peut pas être affiché dans l'application en raison des restrictions de sécurité.",
          variant: "destructive"
        });
        setError(true);
      }
    }
  }, []);

  const handleIframeLoad = () => {
    setLoading(false);
    console.log("Iframe chargée avec succès");
  };

  const handleIframeError = () => {
    console.log("Erreur de chargement de l'iframe");
    setError(true);
    toast({
      title: "Erreur de chargement",
      description: "Impossible d'afficher WhatsApp Web. Veuillez l'ouvrir dans un nouvel onglet.",
      variant: "destructive"
    });
  };

  return (
    <div className="h-full w-full flex flex-col">
      <h1 className="text-2xl font-bold mb-4">WhatsApp Web</h1>
      
      <div className="relative flex-1">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}
        
        <iframe
          ref={iframeRef}
          src="https://web.whatsapp.com"
          className="w-full h-full border-2 border-gray-200 rounded-lg"
          allow="camera; microphone; display-capture; clipboard-read; clipboard-write; cross-origin-isolated"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      </div>

      {error && (
        <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg">
          <p>
            En raison des restrictions de sécurité de WhatsApp, l'application ne peut pas être affichée dans un iframe.
            Vous pouvez l'ouvrir dans un nouvel onglet :
          </p>
          <button
            onClick={() => window.open("https://web.whatsapp.com", "_blank")}
            className="mt-2 text-primary hover:underline"
          >
            Ouvrir WhatsApp Web
          </button>
        </div>
      )}
    </div>
  );
}