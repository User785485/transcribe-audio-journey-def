import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Folder, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface UploadJob {
  id: string;
  file: File;
  progress: number;
  status: 'waiting' | 'uploading' | 'transcribing' | 'done' | 'error';
  transcription?: string;
}

export function FileUpload() {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [folders, setFolders] = useState<Array<{ id: string; name: string }>>([]);

  // Fetch folders on component mount
  useState(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    const { data, error } = await supabase
      .from('folders')
      .select('id, name');

    if (error) {
      toast.error('Failed to fetch folders');
      return;
    }

    setFolders(data || []);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!selectedFolder) {
      toast.error('Please select a folder first');
      return;
    }

    const newJobs = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      progress: 0,
      status: 'waiting' as const
    }));

    setJobs(prev => [...prev, ...newJobs]);

    // Process files in parallel with a limit of 3 concurrent uploads
    const batchSize = 3;
    for (let i = 0; i < newJobs.length; i += batchSize) {
      const batch = newJobs.slice(i, i + batchSize);
      await Promise.all(batch.map(job => processFile(job, selectedFolder)));
    }
  }, [selectedFolder]);

  const processFile = async (job: UploadJob, folderId: string) => {
    try {
      // Update status to uploading
      setJobs(prev => prev.map(j => 
        j.id === job.id ? { ...j, status: 'uploading' } : j
      ));

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('audio')
        .upload(`${folderId}/${job.file.name}`, job.file, {
          onUploadProgress: (progress) => {
            const percent = (progress.loaded / progress.total!) * 100;
            setJobs(prev => prev.map(j => 
              j.id === job.id ? { ...j, progress: percent } : j
            ));
          }
        });

      if (uploadError) throw uploadError;

      // Update status to transcribing
      setJobs(prev => prev.map(j => 
        j.id === job.id ? { ...j, status: 'transcribing', progress: 100 } : j
      ));

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('audio')
        .getPublicUrl(`${folderId}/${job.file.name}`);

      // Call your transcription API here
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: publicUrl })
      });

      if (!response.ok) throw new Error('Transcription failed');

      const { transcription } = await response.json();

      // Save transcription to database
      const { error: dbError } = await supabase
        .from('transcriptions')
        .insert({
          filename: job.file.name,
          content: transcription,
          folder_id: folderId
        });

      if (dbError) throw dbError;

      // Update job status to done
      setJobs(prev => prev.map(j => 
        j.id === job.id ? { ...j, status: 'done', transcription } : j
      ));

      toast.success(`${job.file.name} transcribed successfully`);

    } catch (error) {
      console.error('Processing error:', error);
      setJobs(prev => prev.map(j => 
        j.id === job.id ? { ...j, status: 'error' } : j
      ));
      toast.error(`Failed to process ${job.file.name}`);
    }
  };

  const removeJob = (jobId: string) => {
    setJobs(prev => prev.filter(j => j.id !== jobId));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.ogg', '.opus']
    }
  });

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex gap-4 mb-6">
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={selectedFolder || ''}
            onChange={(e) => setSelectedFolder(e.target.value)}
          >
            <option value="">Select a folder</option>
            {folders.map(folder => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            onClick={fetchFolders}
          >
            <Folder className="w-4 h-4 mr-2" />
            Refresh Folders
          </Button>
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary'}
            ${!selectedFolder ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-primary" />
          <h3 className="text-lg font-semibold mb-2">
            Drop audio files here
          </h3>
          <p className="text-sm text-gray-500">
            Supports MP3, WAV, M4A, OGG, and OPUS files
          </p>
        </div>
      </Card>

      {jobs.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Upload Queue</h3>
          <div className="space-y-4">
            {jobs.map(job => (
              <div key={job.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{job.file.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeJob(job.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <Progress value={job.progress} className="h-2" />
                  <div className="flex items-center gap-2 mt-1">
                    {job.status === 'uploading' && (
                      <span className="text-sm text-gray-500">Uploading...</span>
                    )}
                    {job.status === 'transcribing' && (
                      <span className="text-sm text-gray-500">Transcribing...</span>
                    )}
                    {job.status === 'done' && (
                      <span className="text-sm text-green-500 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Complete
                      </span>
                    )}
                    {job.status === 'error' && (
                      <span className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Failed
                      </span>
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
