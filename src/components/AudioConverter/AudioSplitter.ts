import { MAX_CHUNK_SIZE } from './types';

export class AudioChunker {
  async splitFile(file: File, onProgress?: (progress: number) => void): Promise<Blob[]> {
    console.log('🎯 Starting file splitting process:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });

    const chunks: Blob[] = [];
    const chunkSize = MAX_CHUNK_SIZE;
    const totalChunks = Math.ceil(file.size / chunkSize);

    console.log('📊 Splitting configuration:', {
      chunkSize,
      totalChunks,
      expectedTotalSize: file.size
    });

    try {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        
        console.log(`✂️ Creating chunk ${i + 1}/${totalChunks}:`, { start, end });
        
        const chunk = file.slice(start, end, file.type);
        chunks.push(chunk);

        console.log(`✅ Chunk ${i + 1} created:`, {
          size: chunk.size,
          type: chunk.type
        });

        if (onProgress) {
          const progress = ((i + 1) / totalChunks) * 100;
          console.log(`📈 Split progress: ${progress.toFixed(2)}%`);
          onProgress(progress);
        }
      }

      console.log('🎉 File splitting completed:', {
        totalChunks: chunks.length,
        totalSize: chunks.reduce((acc, chunk) => acc + chunk.size, 0)
      });

      return chunks;
    } catch (error) {
      console.error('❌ Error during file splitting:', error);
      throw new Error(`Erreur lors du découpage du fichier: ${error.message}`);
    }
  }
}