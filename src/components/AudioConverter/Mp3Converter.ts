import lamejs from 'lamejs';

// Add MPEGMode constants that lamejs needs
const MPEGMode = {
  STEREO: 0,
  JOINT_STEREO: 1,
  DUAL_CHANNEL: 2,
  MONO: 3
};

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export class Mp3Converter {
  private audioContext: AudioContext;

  constructor() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  async convertToMp3(audioFile: File): Promise<File> {
    if (audioFile.type === 'audio/mpeg') {
      console.log('File is already MP3, skipping conversion:', {
        name: audioFile.name,
        type: audioFile.type,
        size: audioFile.size
      });
      return audioFile;
    }

    console.log('Starting audio conversion to MP3:', {
      originalName: audioFile.name,
      originalType: audioFile.type,
      originalSize: audioFile.size
    });

    try {
      console.log('Reading file as ArrayBuffer...');
      const arrayBuffer = await audioFile.arrayBuffer();
      
      console.log('Decoding audio data...');
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      console.log('Audio data decoded successfully:', {
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        length: audioBuffer.length,
        duration: audioBuffer.duration
      });

      const channels = audioBuffer.numberOfChannels;
      const sampleRate = audioBuffer.sampleRate;
      const samples = audioBuffer.length;

      console.log('Converting to PCM format:', { channels, sampleRate, samples });

      const pcmData = new Int16Array(samples * channels);
      for (let channel = 0; channel < channels; channel++) {
        console.log(`Processing channel ${channel + 1}/${channels}`);
        const channelData = audioBuffer.getChannelData(channel);
        for (let i = 0; i < samples; i++) {
          const index = i * channels + channel;
          pcmData[index] = channelData[i] < 0 
            ? channelData[i] * 0x8000 
            : channelData[i] * 0x7FFF;
        }
      }

      console.log('Initializing MP3 encoder with config:', {
        channels,
        sampleRate,
        mode: channels === 1 ? MPEGMode.MONO : MPEGMode.JOINT_STEREO,
        bitRate: 128
      });

      const mp3encoder = new lamejs.Mp3Encoder(
        channels,
        sampleRate,
        128,
        channels === 1 ? MPEGMode.MONO : MPEGMode.JOINT_STEREO
      );

      const mp3Data: Int8Array[] = [];
      const chunkSize = 1152; // Must be multiple of 576
      const totalChunks = Math.ceil(pcmData.length / chunkSize);

      console.log('Starting MP3 encoding:', {
        chunkSize,
        totalChunks,
        totalSamples: pcmData.length
      });

      for (let i = 0; i < pcmData.length; i += chunkSize) {
        const chunk = pcmData.subarray(i, i + chunkSize);
        const mp3buf = mp3encoder.encodeBuffer(chunk);
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }

        if (i % (chunkSize * 100) === 0) {
          const progress = Math.round((i / pcmData.length) * 100);
          console.log(`Encoding progress: ${progress}%`, {
            currentChunk: Math.floor(i / chunkSize),
            totalChunks,
            bufferSize: mp3buf.length
          });
        }
      }

      console.log('Finalizing MP3 encoding...');
      const final = mp3encoder.flush();
      if (final.length > 0) {
        mp3Data.push(final);
      }

      const totalSize = mp3Data.reduce((size, chunk) => size + chunk.length, 0);
      console.log('Total MP3 size:', {
        sizeBytes: totalSize,
        sizeMB: (totalSize / (1024 * 1024)).toFixed(2)
      });

      const blob = new Blob(mp3Data, { type: 'audio/mpeg' });
      const convertedFile = new File([blob], audioFile.name.replace(/\.[^/.]+$/, '.mp3'), {
        type: 'audio/mpeg'
      });

      console.log('Conversion completed successfully:', {
        newName: convertedFile.name,
        newType: convertedFile.type,
        newSize: convertedFile.size,
        compressionRatio: (convertedFile.size / audioFile.size).toFixed(2)
      });

      return convertedFile;
    } catch (error) {
      console.error('Error during audio conversion:', error);
      throw new Error(`Erreur lors de la conversion audio: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }
}