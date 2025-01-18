export class Mp3Converter {
  async convertToMp3(file: File): Promise<File> {
    console.log('Starting MP3 conversion process...', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('originalFormat', file.name.split('.').pop() || '');

      console.log('Sending file to conversion service...');
      
      const response = await fetch('https://vmqvlnkqpncanqfktnle.supabase.co/functions/v1/convert-audio', {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtcXZsbmtxcG5jYW5xZmt0bmxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwOTkwMDgsImV4cCI6MjA1MjY3NTAwOH0.SWio32U3svOm8GWqm384GhAm9aFpR2mYhtGKgDzE_64`
        }
      });

      if (!response.ok) {
        // Get the error response as text first
        const errorText = await response.text();
        console.error('Conversion service error response:', errorText);
        
        // Try to parse it as JSON if possible
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(`Erreur lors de la conversion: ${errorData.error || errorData.message || 'Erreur inconnue'}`);
        } catch (parseError) {
          // If we can't parse as JSON, use the raw text
          throw new Error(`Erreur lors de la conversion: ${errorText}`);
        }
      }

      // Read the response JSON
      const data = await response.json();
      console.log('Conversion service response:', data);

      if (!data.mp3Url) {
        throw new Error('URL MP3 manquante dans la réponse');
      }

      console.log('Downloading converted MP3...');
      const mp3Response = await fetch(data.mp3Url);
      
      if (!mp3Response.ok) {
        throw new Error('Échec du téléchargement du fichier MP3 converti');
      }

      // Read the MP3 data once and store it
      const mp3Data = await mp3Response.arrayBuffer();
      console.log('MP3 download complete', {
        size: mp3Data.byteLength
      });

      // Create a new File from the ArrayBuffer
      const fileName = file.name.split('.')[0] + '.mp3';
      return new File([mp3Data], fileName, { type: 'audio/mpeg' });

    } catch (error) {
      console.error('Conversion error:', error);
      throw error;
    }
  }
}