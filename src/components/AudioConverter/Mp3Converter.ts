import lamejs from 'lamejs';

export class Mp3Converter {
  private audioContext: AudioContext;

  constructor(audioContext?: AudioContext) {
    if (audioContext) {
      this.audioContext = audioContext;
    } else {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
  }

  async convertToMp3(audioFile: File): Promise<File> {
    console.log('Starting conversion to MP3:', {
      originalName: audioFile.name,
      originalType: audioFile.type,
      originalSize: audioFile.size
    });

    if (audioFile.type === 'audio/mpeg') {
      console.log('File is already MP3, skipping conversion');
      return audioFile;
    }

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume().catch(e => console.warn(e));
      }

      const arrayBuffer = await audioFile.arrayBuffer();
      console.log('File loaded into ArrayBuffer');

      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      console.log('Audio decoded successfully:', {
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        length: audioBuffer.length
      });

      const mp3Data = await this.encodeToMp3(audioBuffer);
      console.log('MP3 encoding completed');

      const mp3Blob = new Blob(mp3Data, { type: 'audio/mpeg' });
      const mp3File = new File([mp3Blob], audioFile.name.replace(/\.[^/.]+$/, '.mp3'), {
        type: 'audio/mpeg'
      });

      console.log('Conversion completed:', {
        newSize: mp3File.size,
        compressionRatio: (mp3File.size / audioFile.size).toFixed(2)
      });

      return mp3File;
    } catch (error) {
      console.error('Error during conversion:', error);
      throw new Error(`Erreur lors de la conversion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  private async encodeToMp3(audioBuffer: AudioBuffer): Promise<Int8Array[]> {
    const channels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const samples = audioBuffer.length;

    console.log('Initializing MP3 encoder:', {
      channels,
      sampleRate,
      samples,
      mode: channels === 1 ? 'MONO' : 'JOINT_STEREO'
    });

    const mp3encoder = new lamejs.Mp3Encoder(
      channels,
      sampleRate,
      128,
      channels === 1 ? 3 : 1 // 3 = MONO, 1 = JOINT_STEREO
    );

    const mp3Data: Int8Array[] = [];
    const chunkSize = 1152;
    const totalChunks = Math.ceil(samples / chunkSize);

    console.log('Starting MP3 encoding:', {
      chunkSize,
      totalChunks
    });

    const pcmData = new Int16Array(samples * channels);
    for (let channel = 0; channel < channels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < samples; i++) {
        const index = i * channels + channel;
        pcmData[index] = channelData[i] < 0 ? channelData[i] * 0x8000 : channelData[i] * 0x7FFF;
      }
    }

    for (let i = 0; i < samples; i += chunkSize) {
      const chunk = pcmData.subarray(i, i + chunkSize);
      const mp3buf = mp3encoder.encodeBuffer(chunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }

      if (i % (chunkSize * 100) === 0) {
        const progress = Math.round((i / samples) * 100);
        console.log(`Encoding progress: ${progress}%`);
      }
    }

    const final = mp3encoder.flush();
    if (final.length > 0) {
      mp3Data.push(final);
    }

    return mp3Data;
  }
}