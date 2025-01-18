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
        await this.audioContext.resume().catch(e => {
          console.error('Error resuming AudioContext:', e);
          throw e;
        });
      }

      const arrayBuffer = await audioFile.arrayBuffer();
      console.log('File loaded into ArrayBuffer, size:', arrayBuffer.byteLength);

      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      console.log('Audio decoded successfully:', {
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        length: audioBuffer.length,
        duration: audioBuffer.duration
      });

      const mp3Data = await this.encodeToMp3(audioBuffer);
      console.log('MP3 encoding completed, chunks:', mp3Data.length);

      const mp3Blob = new Blob(mp3Data, { type: 'audio/mpeg' });
      console.log('MP3 Blob created, size:', mp3Blob.size);

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
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
      }
      throw new Error(`Erreur lors de la conversion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  private async encodeToMp3(audioBuffer: AudioBuffer): Promise<Int8Array[]> {
    const channels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const samples = audioBuffer.length;

    // Define MPEGMode explicitly
    const MPEGMode = {
      STEREO: 0,
      JOINT_STEREO: 1,
      DUAL_CHANNEL: 2,
      MONO: 3
    };

    console.log('Initializing MP3 encoder:', {
      channels,
      sampleRate,
      samples,
      mode: channels === 1 ? 'MONO' : 'JOINT_STEREO',
      modeValue: channels === 1 ? MPEGMode.MONO : MPEGMode.JOINT_STEREO
    });

    try {
      const mp3encoder = new lamejs.Mp3Encoder(
        channels,
        sampleRate,
        128,
        channels === 1 ? MPEGMode.MONO : MPEGMode.JOINT_STEREO // Using explicit MPEGMode values
      );

      console.log('MP3 encoder created successfully');

      const mp3Data: Int8Array[] = [];
      const chunkSize = 1152; // Must be a multiple of 576 for lamejs
      const totalChunks = Math.ceil(samples / chunkSize);

      console.log('Starting MP3 encoding:', {
        chunkSize,
        totalChunks,
        estimatedFinalSize: (samples * channels * 16) / 8 // Rough estimate
      });

      // Convert Float32Array to Int16Array for lamejs
      const pcmData = new Int16Array(samples * channels);
      for (let channel = 0; channel < channels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        for (let i = 0; i < samples; i++) {
          const index = i * channels + channel;
          // Convert Float32 to Int16
          const sample = channelData[i];
          pcmData[index] = sample < 0 ? Math.max(sample * 0x8000, -0x8000) : Math.min(sample * 0x7FFF, 0x7FFF);
        }
      }

      console.log('PCM data prepared, starting chunk processing');

      for (let i = 0; i < samples; i += chunkSize) {
        const chunk = pcmData.subarray(i, i + chunkSize);
        const mp3buf = mp3encoder.encodeBuffer(chunk);
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }

        if (i % (chunkSize * 100) === 0) {
          const progress = Math.round((i / samples) * 100);
          console.log(`Encoding progress: ${progress}%, current chunk: ${i / chunkSize}`);
        }
      }

      console.log('Main encoding completed, flushing final data');

      const final = mp3encoder.flush();
      if (final.length > 0) {
        mp3Data.push(final);
        console.log('Final MP3 data chunk added, size:', final.length);
      }

      console.log('MP3 encoding completed successfully');
      return mp3Data;
    } catch (error) {
      console.error('Error in MP3 encoding:', error);
      if (error instanceof Error) {
        console.error('Encoding error stack:', error.stack);
      }
      throw error;
    }
  }
}