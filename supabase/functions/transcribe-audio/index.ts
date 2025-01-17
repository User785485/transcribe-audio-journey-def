import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPPORTED_FORMATS = {
  'audio/flac': '.flac',
  'audio/m4a': '.m4a',
  'audio/mpeg': ['.mp3', '.mpeg', '.mpga'],
  'audio/ogg': ['.oga', '.ogg'],
  'audio/wav': '.wav',
  'audio/webm': '.webm',
  'video/mp4': '.mp4',
  'audio/opus': '.opus'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get('file');
    const language = formData.get('language') || 'fr';
    const chunkIndex = formData.get('chunkIndex');
    const totalChunks = formData.get('totalChunks');

    if (!audioFile || !(audioFile instanceof File)) {
      console.error('Invalid file:', audioFile);
      return new Response(
        JSON.stringify({ error: 'Aucun fichier audio fourni ou format invalide' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Audio chunk received:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
      chunkIndex,
      totalChunks
    });

    // Convert opus to mp3 if needed
    let processedFile = audioFile;
    let mimeType = audioFile.type;

    // Determine correct MIME type based on file extension if type is missing
    if (!mimeType || mimeType === 'application/octet-stream') {
      const extension = audioFile.name.split('.').pop()?.toLowerCase();
      const foundMimeType = Object.entries(SUPPORTED_FORMATS).find(([, exts]) => {
        const extensions = Array.isArray(exts) ? exts : [exts];
        return extensions.some(ext => ext.substring(1) === extension);
      })?.[0];
      
      if (foundMimeType) {
        mimeType = foundMimeType;
        processedFile = new File([audioFile], audioFile.name, { type: foundMimeType });
      }
    }

    // Validate file format
    const isSupported = Object.keys(SUPPORTED_FORMATS).includes(mimeType);
    if (!isSupported) {
      console.error('Unsupported file format:', mimeType);
      return new Response(
        JSON.stringify({ 
          error: 'Format de fichier non supporté', 
          details: `Le format ${mimeType || 'inconnu'} n'est pas supporté. Formats supportés: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Prepare file for Whisper API
    const whisperFormData = new FormData();
    whisperFormData.append('file', processedFile);
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', language);

    console.log('Calling Whisper API with file:', {
      name: processedFile.name,
      type: processedFile.type,
      size: processedFile.size
    });

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
      const filePath = `public/${crypto.randomUUID()}${SUPPORTED_FORMATS[mimeType]}`;

      console.log('Uploading file to Storage...');
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: storageData, error: storageError } = await supabaseAdmin.storage
        .from('audio')
        .upload(filePath, processedFile, {
          contentType: processedFile.type,
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
          filename: processedFile.name,
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
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});