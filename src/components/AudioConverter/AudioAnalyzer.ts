import { AudioMetadata, SUPPORTED_FORMATS } from './types';

export class AudioAnalyzer {
  async analyzeFile(file: File): Promise<AudioMetadata> {
    console.log('Analyzing file:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    const format = this.detectFormat(file);
    const needsConversion = !file.type.includes('audio/mpeg');

    console.log('Analysis results:', {
      format,
      needsConversion,
      size: file.size
    });

    return {
      format,
      size: file.size,
      needsConversion
    };
  }

  private detectFormat(file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeType = Object.entries(SUPPORTED_FORMATS).find(([, exts]) => 
      exts.some(ext => ext.endsWith(extension || ''))
    )?.[0];

    if (!extension || !mimeType) {
      throw new Error(`Format non supporté: ${extension}`);
    }

    return mimeType;
  }
}