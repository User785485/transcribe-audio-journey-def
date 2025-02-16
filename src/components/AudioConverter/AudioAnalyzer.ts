import { AudioMetadata } from './types';
import { SUPPORTED_FORMATS } from '../AudioSplitter';

export class AudioAnalyzer {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;
  private bufferLength: number;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
  }

  async analyzeFile(file: File): Promise<{ duration: number; sampleRate: number }> {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    
    return {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
    };
  }

  // Méthode pour nettoyer les ressources
  dispose() {
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}