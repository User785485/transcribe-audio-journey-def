export function WhatsApp() {
  return (
    <div className="h-full w-full">
      <iframe 
        src="https://web.whatsapp.com/"
        className="w-full h-[calc(100vh-2rem)]"
        title="WhatsApp Web"
      />
    </div>
  );
}