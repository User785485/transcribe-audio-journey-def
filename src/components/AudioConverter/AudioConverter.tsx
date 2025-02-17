import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileAudio, Activity } from "lucide-react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { useStore } from "@/store/useStore";
import { useToast } from "@/hooks/use-toast";
import { AudioFile, AudioFileStatus } from "@/types/audio";

const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const SUPPORTED_FORMATS = ["mp3", "wav", "ogg", "m4a"] as const;

export function AudioConverter() {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [outputFormat, setOutputFormat] = useState<typeof SUPPORTED_FORMATS[number]>("mp3");
  const { isFFmpegLoaded, setFFmpegLoaded, setProcessing } = useStore();
  const { toast } = useToast();
  const ffmpeg = new FFmpeg();

  useEffect(() => {
    if (!isFFmpegLoaded) {
      loadFFmpeg();
    }
    return () => {
      // Cleanup URLs on unmount
      files.forEach(file => {
        if (file.outputUrl) {
          URL.revokeObjectURL(file.outputUrl);
        }
      });
    };
  }, []);

  const loadFFmpeg = async () => {
    try {
      setProcessing(true);
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      setFFmpegLoaded(true);
    } catch (error) {
      console.error("Failed to load FFmpeg:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load audio processing library"
      });
    } finally {
      setProcessing(false);
    }
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`;
    }
    if (!file.type.startsWith('audio/')) {
      return 'File must be an audio file';
    }
    return null;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles: AudioFile[] = Array.from(event.target.files).map(file => {
        const error = validateFile(file);
        return {
          id: Math.random().toString(36).substring(7),
          name: file.name,
          file,
          progress: 0,
          status: error ? "error" : "pending",
          error: error || undefined,
          size: file.size,
          createdAt: new Date()
        };
      });
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const processInChunks = async (file: File): Promise<Uint8Array> => {
    const chunks: Uint8Array[] = [];
    let offset = 0;
    
    while (offset < file.size) {
      const chunk = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
      chunks.push(new Uint8Array(chunk));
      offset += CHUNK_SIZE;
    }
    
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let position = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, position);
      position += chunk.length;
    }
    
    return result;
  };

  const convertFile = async (file: AudioFile) => {
    try {
      const inputFileName = file.name;
      const outputFileName = `${file.name.split(".")[0]}.${outputFormat}`;

      setFiles(prev =>
        prev.map(f =>
          f.id === file.id
            ? { ...f, status: "converting" as AudioFileStatus, progress: 0 }
            : f
        )
      );

      const fileData = await processInChunks(file.file);
      await ffmpeg.writeFile(inputFileName, fileData);

      await ffmpeg.exec([
        "-i", inputFileName,
        "-c:a", "aac",
        "-b:a", "192k",
        outputFileName
      ]);

      const data = await ffmpeg.readFile(outputFileName);
      const url = URL.createObjectURL(
        new Blob([data], { type: `audio/${outputFormat}` })
      );

      setFiles(prev =>
        prev.map(f =>
          f.id === file.id
            ? { ...f, status: "done" as AudioFileStatus, progress: 100, outputUrl: url }
            : f
        )
      );

      await ffmpeg.deleteFile(inputFileName);
      await ffmpeg.deleteFile(outputFileName);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error converting file:", errorMessage);
      setFiles(prev =>
        prev.map(f =>
          f.id === file.id
            ? { ...f, status: "error" as AudioFileStatus, progress: 0, error: errorMessage }
            : f
        )
      );
      toast({
        variant: "destructive",
        title: "Conversion Error",
        description: `Failed to convert ${file.name}: ${errorMessage}`
      });
    }
  };

  const convertAll = async () => {
    if (!isFFmpegLoaded) {
      await loadFFmpeg();
    }
    
    const pendingFiles = files.filter(f => f.status === "pending");
    for (const file of pendingFiles) {
      await convertFile(file);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.outputUrl) {
        URL.revokeObjectURL(file.outputUrl);
      }
      return prev.filter(f => f.id !== id);
    });
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
    <Card>
      <CardHeader>
        <CardTitle>Audio Converter</CardTitle>
        <CardDescription>
          Convert audio files to different formats. Supported formats: {SUPPORTED_FORMATS.join(", ")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="audio-files">Audio Files (Max {MAX_FILE_SIZE / 1024 / 1024}MB)</Label>
            <Input
              id="audio-files"
              type="file"
              multiple
              accept="audio/*"
              onChange={handleFileChange}
              disabled={!isFFmpegLoaded}
            />
          </div>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="output-format">Output Format</Label>
            <Select value={outputFormat} onValueChange={setOutputFormat}>
              <SelectTrigger id="output-format">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_FORMATS.map(format => (
                  <SelectItem key={format} value={format}>
                    {format.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center space-x-4 p-4 border rounded-lg"
            >
              {file.status === "converting" ? (
                <Activity className="h-6 w-6 text-muted-foreground animate-pulse" />
              ) : (
                <FileAudio className="h-6 w-6 text-muted-foreground" />
              )}
              <div className="flex-1 space-y-1">
                <div className="text-sm font-medium">{file.name}</div>
                {file.error ? (
                  <div className="text-sm text-red-500">{file.error}</div>
                ) : (
                  <Progress value={file.progress} className="h-2" />
                )}
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
                  onClick={() => removeFile(file.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={convertAll} 
          disabled={!isFFmpegLoaded || files.length === 0 || !files.some(f => f.status === "pending")}
        >
          Convert All
        </Button>
      </CardFooter>
    </Card>
  );
}
