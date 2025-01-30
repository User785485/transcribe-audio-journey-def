import { MAX_CHUNK_SIZE } from './types';

export class AudioChunker {
  async splitFile(file: File, onProgress?: (progress: number) => void): Promise<Blob[]> {
    if (!file) {
      console.error('❌ No file provided to splitFile');
      throw new Error('Aucun fichier fourni');
    }

    console.log('🎯 Starting file splitting process:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    const chunks: Blob[] = [];
    const chunkSize = MAX_CHUNK_SIZE;
    const totalChunks = Math.ceil(file.size / chunkSize);

    if (totalChunks === 0) {
      console.error('❌ File is empty');
      throw new Error('Le fichier est vide');
    }

    if (file.size <= MAX_CHUNK_SIZE) {
      console.error('❌ File is too small to split');
      throw new Error('Le fichier est trop petit pour être découpé');
    }

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
        
        if (chunk.size === 0) {
          console.error(`❌ Chunk ${i + 1} is empty`);
          continue;
        }

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

      if (chunks.length === 0) {
        throw new Error('Aucun chunk n\'a été créé');
      }

      const totalSize = chunks.reduce((acc, chunk) => acc + chunk.size, 0);
      if (totalSize !== file.size) {
        console.error('❌ Total size mismatch:', {
          expected: file.size,
          actual: totalSize
        });
        throw new Error('Erreur lors du découpage : taille totale incorrecte');
      }

      console.log('🎉 File splitting completed:', {
        totalChunks: chunks.length,
        totalSize
      });

      return chunks;
    } catch (error) {
      console.error('❌ Error during file splitting:', error);
      throw new Error(`Erreur lors du découpage du fichier: ${error instanceof Error ? error.message : 'Une erreur est survenue'}`);
    }
  }
}