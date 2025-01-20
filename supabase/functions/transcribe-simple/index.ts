import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  console.log('Received request:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const formData = await req.formData();
    console.log('FormData received');
    
    const audioFile = formData.get('file');
    const language = 'fr';

    if (!audioFile || !(audioFile instanceof File)) {
      console.error('Invalid file:', audioFile);
      throw new Error('Aucun fichier audio fourni ou format invalide');
    }

    console.log('Audio file received:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size
    });

    // Initialize Supabase client with explicit error handling
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify bucket exists and is accessible
    console.log('Verifying audio bucket...');
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Failed to list buckets:', bucketsError);
      throw new Error('Erreur d\'accès au stockage');
    }

    const audioBucket = buckets?.find(b => b.name === 'audio');
    if (!audioBucket) {
      console.error('Audio bucket not found in:', buckets?.map(b => b.name));
      throw new Error('Configuration de stockage invalide');
    }

    // Store file in Supabase Storage with explicit path handling
    const fileExtension = audioFile.name.split('.').pop()?.toLowerCase();
    if (!fileExtension) {
      throw new Error('Extension de fichier invalide');
    }

    const filePath = `public/${crypto.randomUUID()}.${fileExtension}`;
    console.log('Attempting file upload to path:', filePath);

    const { error: storageError } = await supabaseAdmin.storage
      .from('audio')
      .upload(filePath, audioFile, {
        contentType: audioFile.type,
        upsert: false
      });

    if (storageError) {
      console.error('Storage upload failed:', storageError);
      throw new Error(`Erreur lors du stockage: ${storageError.message}`);
    }

    console.log('File uploaded successfully to:', filePath);

    // Prepare Whisper API request
    const whisperFormData = new FormData();
    whisperFormData.append('file', audioFile);
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', language);

    console.log('Calling Whisper API...');

    // Call Whisper API with proper error handling
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: whisperFormData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Whisper API error:', errorText);
      throw new Error(`Erreur de transcription: ${errorText}`);
    }

    const { text: transcription } = await whisperResponse.json();
    console.log('Transcription received, length:', transcription.length);

    // Store audio file reference in database
    console.log('Storing audio file reference...');
    const { data: audioFileData, error: audioFileError } = await supabaseAdmin
      .from('audio_files')
      .insert({
        filename: audioFile.name,
        file_path: filePath
      })
      .select()
      .single();

    if (audioFileError) {
      console.error('Failed to store audio file reference:', audioFileError);
      throw new Error('Erreur lors de l\'enregistrement des métadonnées');
    }

    // Store transcription with proper error handling
    console.log('Storing transcription...');
    const { data: transcriptionData, error: transcriptionError } = await supabaseAdmin
      .from('transcriptions')
      .insert({
        audio_file_id: audioFileData.id,
        transcription: transcription,
        language: language,
        status: 'completed'
      })
      .select()
      .single();

    if (transcriptionError) {
      console.error('Failed to store transcription:', transcriptionError);
      throw new Error('Erreur lors de l\'enregistrement de la transcription');
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

  } catch (error) {
    console.error('Error in transcribe-simple function:', error);
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