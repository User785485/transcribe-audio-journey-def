import { useEffect, useRef } from "react";

export function WhatsApp() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Try to force iframe display
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      iframe.style.width = "100%";
      iframe.style.height = "calc(100vh - 2rem)";
      
      // Try to bypass security headers
      iframe.setAttribute("sandbox", "allow-same-origin allow-scripts allow-popups allow-forms");
      iframe.setAttribute("loading", "eager");
      iframe.setAttribute("importance", "high");
    }
  }, []);

  return (
    <div className="h-full w-full flex flex-col">
      <h1 className="text-2xl font-bold mb-4">WhatsApp Web</h1>
      
      {/* Primary iframe attempt */}
      <iframe
        ref={iframeRef}
        src="https://web.whatsapp.com"
        className="w-full flex-1 border-2 border-gray-200 rounded-lg"
        allow="camera; microphone; display-capture"
      />

      {/* Fallback message */}
      <div className="mt-4 text-sm text-muted-foreground">
        Si l'iframe ne s'affiche pas, vous pouvez toujours{" "}
        <button
          onClick={() => window.open("https://web.whatsapp.com", "_blank")}
          className="text-primary hover:underline"
        >
          ouvrir WhatsApp Web dans un nouvel onglet
        </button>
      </div>
    </div>
  );
}