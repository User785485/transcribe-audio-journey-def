import { AudioMetadata } from './types';
import { SUPPORTED_FORMATS } from '../AudioSplitter';

export interface AudioMetadata {
  duration: number;
  sampleRate: number;
  channels: number;
  format: string;
}

export const SUPPORTED_FORMATS = [".mp3", ".wav", ".m4a", ".ogg"];

export class AudioAnalyzer {
  private context: AudioContext;
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;

  constructor() {
    this.context = new AudioContext();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
  }

  async analyzeFile(file: File): Promise<AudioMetadata> {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.context.decodeAudioData(arrayBuffer);

    return {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      format: file.type,
    };
  }

  dispose() {
    if (this.context.state !== "closed") {
      this.context.close();
    }
  }
}