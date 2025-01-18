import { MAX_CHUNK_SIZE } from './types';

export class AudioChunker {
  async splitFile(file: File): Promise<Blob[]> {
    console.log('Starting file splitting:', {
      filename: file.name,
      size: file.size,
      type: file.type
    });

    const totalChunks = Math.ceil(file.size / MAX_CHUNK_SIZE);
    const chunks: Blob[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const start = i * MAX_CHUNK_SIZE;
      const end = Math.min(start + MAX_CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end, file.type);
      
      chunks.push(chunk);

      console.log(`Created chunk ${i + 1}/${totalChunks}:`, {
        size: chunk.size,
        type: chunk.type
      });
    }

    return chunks;
  }
}