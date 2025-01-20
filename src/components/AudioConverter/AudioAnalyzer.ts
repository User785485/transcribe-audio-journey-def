import { AudioMetadata } from './types';
import { SUPPORTED_FORMATS } from '../AudioSplitter';

export class AudioAnalyzer {
  private audioContext: AudioContext;

  constructor() {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass();
  }

  async analyzeFile(file: File): Promise<AudioMetadata> {
    console.log('Analyzing file:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    const format = this.detectFormat(file);

    let duration = 0;
    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      duration = audioBuffer.duration;
      console.log(`Audio duration = ${duration.toFixed(2)}s`);
    } catch (err) {
      console.warn("Impossible d'extraire la durée", err);
    }

    console.log('Analysis results:', {
      format,
      size: file.size,
      duration
    });

    return {
      format,
      size: file.size,
      duration
    };
  }

  private detectFormat(file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeType = Object.entries(SUPPORTED_FORMATS).find(([, exts]) => 
      exts.includes(`.${extension}`)
    )?.[0];

    if (!extension || !mimeType) {
      throw new Error(`Format non supporté: ${extension}`);
    }
    return mimeType;
  }
}