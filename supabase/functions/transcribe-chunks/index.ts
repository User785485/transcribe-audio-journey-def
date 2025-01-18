import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const WHISPER_SUPPORTED_FORMATS = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    console.log('Received request:', req.method);
    
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const formData = await req.formData();
    console.log('FormData received');
    
    const audioFile = formData.get('file');
    const language = formData.get('language') || 'fr';
    const chunkIndex = formData.get('chunkIndex');
    const totalChunks = formData.get('totalChunks');

    if (!audioFile || !(audioFile instanceof File)) {
      console.error('Invalid file:', audioFile);
      throw new Error('Aucun fichier audio fourni ou format invalide');
    }

    console.log('Audio chunk received:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
      chunkIndex,
      totalChunks
    });

    // Get file extension from name
    const fileExtension = audioFile.name.split('.').pop()?.toLowerCase();
    console.log('File extension:', fileExtension);

    if (!fileExtension || !WHISPER_SUPPORTED_FORMATS.includes(fileExtension)) {
      console.error('Unsupported file format:', fileExtension);
      throw new Error(`Format de fichier non supporté. Formats supportés: ${WHISPER_SUPPORTED_FORMATS.join(', ')}`);
    }

    // Prepare file for Whisper API
    const whisperFormData = new FormData();
    whisperFormData.append('file', audioFile);
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', language);

    console.log('Calling Whisper API...');

    // Call Whisper API
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: whisperFormData,
    });

    if (!whisperResponse.ok) {
      const error = await whisperResponse.text();
      console.error('Whisper API error:', error);
      throw new Error(`Erreur Whisper API: ${error}`);
    }

    const { text: transcription } = await whisperResponse.json();
    console.log('Transcription received:', transcription.substring(0, 100) + '...');

    // If it's the last chunk, store the file and transcription
    if (Number(chunkIndex) === Number(totalChunks) - 1) {
      const filePath = `public/${crypto.randomUUID()}.${fileExtension}`;

      console.log('Uploading file to Storage...');
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: storageData, error: storageError } = await supabaseAdmin.storage
        .from('audio')
        .upload(filePath, audioFile, {
          contentType: audioFile.type,
          upsert: false
        });

      if (storageError) {
        console.error('Storage error:', storageError);
        throw storageError;
      }

      console.log('Creating audio_files entry...');
      const { data: audioFileData, error: audioFileError } = await supabaseAdmin
        .from('audio_files')
        .insert({
          filename: audioFile.name,
          file_path: filePath
        })
        .select()
        .single();

      if (audioFileError) {
        console.error('Audio files error:', audioFileError);
        throw audioFileError;
      }

      console.log('Creating transcription entry...');
      const { data: transcriptionData, error: transcriptionError } = await supabaseAdmin
        .from('transcriptions')
        .insert({
          audio_file_id: audioFileData.id,
          transcription,
          language,
          status: 'completed'
        })
        .select()
        .single();

      if (transcriptionError) {
        console.error('Transcription error:', transcriptionError);
        throw transcriptionError;
      }

      console.log('All operations completed successfully');
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            audioFile: audioFileData,
            transcription: transcriptionData
          }
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    } else {
      // Return partial transcription
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            transcription: {
              transcription,
              isPartial: true
            }
          }
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Une erreur est survenue lors de la transcription',
        details: error.message
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    );
  }
});