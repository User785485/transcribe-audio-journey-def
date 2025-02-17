import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileAudio, Activity } from "lucide-react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

const ffmpeg = new FFmpeg();

interface AudioFile {
  id: string;
  name: string;
  file: File;
  progress: number;
  status: "pending" | "converting" | "done" | "error";
  outputUrl?: string;
}

export function AudioConverter() {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [outputFormat, setOutputFormat] = useState("mp3");
  const [isReady, setIsReady] = useState(false);

  const loadFFmpeg = async () => {
    try {
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      setIsReady(true);
    } catch (error) {
      console.error("Failed to load FFmpeg:", error);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files).map(file => ({
        id: Math.random().toString(36).substring(7),
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
          f.id === file.id
            ? { ...f, status: "converting", progress: 0 }
            : f
        )
      );

      const fileData = new Uint8Array(await file.file.arrayBuffer());
      await ffmpeg.writeFile(inputFileName, fileData);

      await ffmpeg.exec([
        "-i", inputFileName,
        outputFileName
      ]);

      const data = await ffmpeg.readFile(outputFileName);
      const url = URL.createObjectURL(
        new Blob([data], { type: `audio/${outputFormat}` })
      );

      setFiles(prev =>
        prev.map(f =>
          f.id === file.id
            ? { ...f, status: "done", progress: 100, outputUrl: url }
            : f
        )
      );

      await ffmpeg.deleteFile(inputFileName);
      await ffmpeg.deleteFile(outputFileName);

    } catch (error) {
      console.error("Error converting file:", error);
      setFiles(prev =>
        prev.map(f =>
          f.id === file.id
            ? { ...f, status: "error", progress: 0 }
            : f
        )
      );
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

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
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
        <Button onClick={convertAll} disabled={files.length === 0 || !isReady}>
          Convert All
        </Button>
      </CardFooter>
    </Card>
  );
}
