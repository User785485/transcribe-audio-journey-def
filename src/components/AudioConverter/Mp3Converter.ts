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
          // Add the authorization header with the anon key
          Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtcXZsbmtxcG5jYW5xZmt0bmxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwOTkwMDgsImV4cCI6MjA1MjY3NTAwOH0.SWio32U3svOm8GWqm384GhAm9aFpR2mYhtGKgDzE_64`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Conversion service error:', errorData);
        throw new Error(`Erreur lors de la conversion: ${errorData.error || 'Erreur inconnue'}`);
      }

      const data = await response.json();
      console.log('Conversion service response:', data);

      if (!data.mp3Url) {
        throw new Error('URL MP3 manquante dans la réponse');
      }

      console.log('Downloading converted MP3...');
      const mp3Response = await fetch(data.mp3Url);
      const mp3Blob = await mp3Response.blob();

      console.log('MP3 download complete', {
        size: mp3Blob.size,
        type: mp3Blob.type
      });

      const fileName = file.name.split('.')[0] + '.mp3';
      return new File([mp3Blob], fileName, { type: 'audio/mpeg' });

    } catch (error) {
      console.error('Conversion error:', error);
      throw error;
    }
  }
}