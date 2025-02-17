import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Activity, Volume2, FileAudio, Download } from "lucide-react";

const ffmpeg = createFFmpeg({ log: true });

interface ConversionJob {
  id: string;
  filename: string;
  status: 'waiting' | 'converting' | 'done' | 'error';
  progress: number;
  outputUrl?: string;
}

interface AudioFile {
  name: string;
  file: File;
  progress: number;
  status: "pending" | "converting" | "done" | "error";
  outputUrl?: string;
}

export function AudioConverter() {
  const [isReady, setIsReady] = useState(false);
  const [jobs, setJobs] = useState<ConversionJob[]>([]);
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [outputFormat, setOutputFormat] = useState("mp3");
  const { toast: toastNotification } = toast;

  useEffect(() => {
    loadFFmpeg();
  }, []);

  const loadFFmpeg = async () => {
    try {
      console.log('Loading FFmpeg...');
      await ffmpeg.load();
      console.log('FFmpeg loaded successfully');
      setIsReady(true);
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      toastNotification.error('Failed to initialize audio converter');
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
        const outputFileName = `${file.name.split('.')[0]}.${outputFormat}`;

        // Write the file to FFmpeg's file system
        const fileData = await fetchFile(file);
        await ffmpeg.FS("writeFile", inputFileName, fileData);

        console.log(`Converting ${inputFileName} to ${outputFileName}`);
        // Run the conversion
        await ffmpeg.run("-i", inputFileName, outputFileName);

        // Read the output file
        const data = await ffmpeg.FS("readFile", outputFileName);
        const blob = new Blob([data.buffer], { type: `audio/${outputFormat}` });
        const url = URL.createObjectURL(blob);

        console.log(`Conversion complete for ${file.name}`);
        setJobs(prev => prev.map(j => 
          j.id === job.id ? { ...j, status: 'done', outputUrl: url, progress: 100 } : j
        ));

        // Clean up FFmpeg's file system
        await ffmpeg.FS("unlink", inputFileName);
        await ffmpeg.FS("unlink", outputFileName);

      } catch (error) {
        console.error(`Conversion error for ${file.name}:`, error);
        setJobs(prev => prev.map(j => 
          j.id === job.id ? { ...j, status: 'error', progress: 0 } : j
        ));
        toastNotification.error(`Failed to convert ${file.name}`);
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files).map(file => ({
        name: file.name,
        file,
        progress: 0,
        status: "pending" as const
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const convertFile = async (file: AudioFile) => {
    try {
      const inputFileName = file.name;
      const outputFileName = `${file.name.split(".")[0]}.${outputFormat}`;

      setFiles(prev =>
        prev.map(f =>
          f.name === file.name
            ? { ...f, status: "converting", progress: 0 }
            : f
        )
      );

      ffmpeg.FS("writeFile", inputFileName, await fetchFile(file.file));

      await ffmpeg.run("-i", inputFileName, outputFileName);

      const data = ffmpeg.FS("readFile", outputFileName);
      const url = URL.createObjectURL(
        new Blob([data.buffer], { type: `audio/${outputFormat}` })
      );

      setFiles(prev =>
        prev.map(f =>
          f.name === file.name
            ? { ...f, status: "done", progress: 100, outputUrl: url }
            : f
        )
      );

      ffmpeg.FS("unlink", inputFileName);
      ffmpeg.FS("unlink", outputFileName);

    } catch (error) {
      console.error("Error converting file:", error);
      setFiles(prev =>
        prev.map(f =>
          f.name === file.name
            ? { ...f, status: "error", progress: 0 }
            : f
        )
      );
      toastNotification({
        variant: "destructive",
        title: "Error",
        description: `Failed to convert ${file.name}`
      });
    }
  };

  const convertAll = async () => {
    if (!isReady) {
      await loadFFmpeg();
    }
    
    const pendingFiles = files.filter(f => f.status === "pending");
    for (const file of pendingFiles) {
      await convertFile(file);
    }
  };

  const removeFile = (fileName: string) => {
    setFiles(prev => prev.filter(f => f.name !== fileName));
  };

  const downloadFile = (file: AudioFile) => {
    if (file.outputUrl) {
      const a = document.createElement("a");
      a.href = file.outputUrl;
      a.download = `${file.name.split(".")[0]}.${outputFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
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
                        onClick={() => downloadFile({ name: job.filename, outputUrl: job.outputUrl } as AudioFile)}
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

      <Card>
        <CardHeader>
          <CardTitle>Audio Converter</CardTitle>
          <CardDescription>
            Convert audio files to different formats
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="audio-files">Audio Files</Label>
              <Input
                id="audio-files"
                type="file"
                multiple
                accept="audio/*"
                onChange={handleFileChange}
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="output-format">Output Format</Label>
              <Select value={outputFormat} onValueChange={setOutputFormat}>
                <SelectTrigger id="output-format">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp3">MP3</SelectItem>
                  <SelectItem value="wav">WAV</SelectItem>
                  <SelectItem value="ogg">OGG</SelectItem>
                  <SelectItem value="m4a">M4A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.name}
                className="flex items-center space-x-4 p-4 border rounded-lg"
              >
                <FileAudio className="h-6 w-6 text-muted-foreground" />
                <div className="flex-1 space-y-1">
                  <div className="text-sm font-medium">{file.name}</div>
                  <Progress value={file.progress} className="h-2" />
                </div>
                <div className="flex items-center space-x-2">
                  {file.status === "done" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadFile(file)}
                    >
                      Download
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeFile(file.name)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={convertAll} disabled={files.length === 0}>
            Convert All
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
