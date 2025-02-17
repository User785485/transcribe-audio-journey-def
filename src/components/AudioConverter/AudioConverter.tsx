import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Activity, Volume2, FileAudio, Download } from "lucide-react";

const ffmpeg = new FFmpeg();

interface ConversionJob {
  id: string;
  filename: string;
  status: 'waiting' | 'converting' | 'done' | 'error';
  progress: number;
  outputUrl?: string;
}

export function AudioConverter() {
  const [isReady, setIsReady] = useState(false);
  const [jobs, setJobs] = useState<ConversionJob[]>([]);

  useEffect(() => {
    loadFFmpeg();
  }, []);

  const loadFFmpeg = async () => {
    try {
      console.log('Loading FFmpeg...');
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      console.log('FFmpeg loaded successfully');
      setIsReady(true);
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      toast.error('Failed to initialize audio converter');
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log('Files dropped:', acceptedFiles);
    const newJobs = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      filename: file.name,
      status: 'waiting' as const,
      progress: 0
    }));

    setJobs(prev => [...prev, ...newJobs]);

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const job = newJobs[i];

      try {
        console.log(`Processing file: ${file.name}`);
        setJobs(prev => prev.map(j => 
          j.id === job.id ? { ...j, status: 'converting' } : j
        ));

        const inputFileName = file.name;
        const outputFileName = `${file.name.split('.')[0]}.mp3`;

        // Write the file to FFmpeg's file system
        const fileData = await fetchFile(file);
        await ffmpeg.writeFile(inputFileName, fileData);

        console.log(`Converting ${inputFileName} to ${outputFileName}`);
        // Run the conversion
        await ffmpeg.exec([
          '-i', inputFileName,
          '-codec:a', 'libmp3lame',
          '-qscale:a', '2',
          outputFileName
        ]);

        // Read the output file
        const data = await ffmpeg.readFile(outputFileName);
        const blob = new Blob([data], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);

        console.log(`Conversion complete for ${file.name}`);
        setJobs(prev => prev.map(j => 
          j.id === job.id ? { ...j, status: 'done', outputUrl: url, progress: 100 } : j
        ));

        // Clean up FFmpeg's file system
        await ffmpeg.deleteFile(inputFileName);
        await ffmpeg.deleteFile(outputFileName);

      } catch (error) {
        console.error(`Conversion error for ${file.name}:`, error);
        setJobs(prev => prev.map(j => 
          j.id === job.id ? { ...j, status: 'error', progress: 0 } : j
        ));
        toast.error(`Failed to convert ${file.name}`);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.wav', '.mp3', '.ogg', '.m4a', '.aac', '.opus', '.dat']
    },
    disabled: !isReady
  });

  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace(/\.[^/.]+$/, '') + '.mp3';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      <Card className="p-8">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary'}
            ${!isReady ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <FileAudio className="w-12 h-12 mx-auto mb-4 text-primary" />
          <h3 className="text-lg font-semibold mb-2">
            {!isReady ? 'Initializing...' : 'Drop audio files here'}
          </h3>
          <p className="text-sm text-gray-500">
            Supports WAV, MP3, OGG, M4A, AAC, OPUS, and DAT files
          </p>
        </div>
      </Card>

      {jobs.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Conversion Queue</h3>
          <div className="space-y-4">
            {jobs.map(job => (
              <div key={job.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="font-medium">{job.filename}</span>
                  </div>
                  <Progress value={job.progress} className="h-2" />
                  <div className="flex items-center gap-2 mt-1">
                    {job.status === 'converting' && (
                      <span className="text-sm text-gray-500">Converting...</span>
                    )}
                    {job.status === 'done' && job.outputUrl && (
                      <Button
                        size="sm"
                        onClick={() => downloadFile(job.outputUrl!, job.filename)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download MP3
                      </Button>
                    )}
                    {job.status === 'error' && (
                      <span className="text-sm text-red-500">Conversion failed</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
