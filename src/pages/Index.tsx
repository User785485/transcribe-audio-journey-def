import { TranscriptionUploader } from "@/components/TranscriptionUploader";

const Index = () => {
  return (
    <div className="min-h-screen py-8">
      <div className="container">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Transcription Audio</h1>
          <p className="text-lg text-muted-foreground">
            Convertissez vos fichiers audio en texte facilement
          </p>
        </div>
        <TranscriptionUploader />
      </div>
    </div>
  );
};

export default Index;