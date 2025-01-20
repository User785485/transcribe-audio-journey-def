import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

// Proxy URLs - on peut utiliser différents services de proxy CORS
const PROXY_URLS = [
  "https://api.allorigins.win/raw?url=",
  "https://cors-anywhere.herokuapp.com/",
  "https://api.codetabs.com/v1/proxy?quest="
];

export function WhatsApp() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [proxyIndex, setProxyIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const tryNextProxy = () => {
    if (proxyIndex < PROXY_URLS.length - 1) {
      setProxyIndex(prev => prev + 1);
      setError(false);
      setLoading(true);
    } else {
      setError(true);
    }
  };

  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      
      // Configuration avancée de l'iframe
      iframe.style.width = "100%";
      iframe.style.height = "calc(100vh - 2rem)";
      
      // Tentative de contournement des restrictions
      iframe.setAttribute("sandbox", "allow-same-origin allow-scripts allow-popups allow-forms allow-modals");
      iframe.setAttribute("loading", "eager");
      iframe.setAttribute("importance", "high");
      
      // Injection de code pour supprimer les en-têtes de sécurité
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          console.log("Tentative d'injection de code dans l'iframe");
          const script = iframeDoc.createElement('script');
          script.textContent = `
            // Suppression des en-têtes de sécurité
            delete window.document.referrer;
            window.document.domain = '${window.location.hostname}';
            // Désactivation de la protection contre le clickjacking
            if(window.top !== window.self) {
              window.top.location = window.self.location;
            }
          `;
          iframeDoc.head.appendChild(script);
        }
      } catch (e) {
        console.log("Erreur lors de l'injection:", e);
      }
    }
  }, [proxyIndex]);

  const handleIframeLoad = () => {
    setLoading(false);
    console.log("Iframe chargée avec succès");
  };

  const handleIframeError = () => {
    console.log("Erreur de chargement de l'iframe, tentative avec un autre proxy");
    tryNextProxy();
  };

  const proxyUrl = `${PROXY_URLS[proxyIndex]}https://web.whatsapp.com`;

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
          src={proxyUrl}
          className="w-full h-full border-2 border-gray-200 rounded-lg"
          allow="camera; microphone; display-capture; clipboard-read; clipboard-write"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      </div>

      {error && (
        <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg">
          <p>
            Impossible d'afficher WhatsApp Web dans l'application. 
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