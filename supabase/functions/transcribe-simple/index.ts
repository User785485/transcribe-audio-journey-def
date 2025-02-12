import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  console.log('🎯 Received transcription request');
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request');
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    const { filePath } = await req.json();
    console.log('📁 Processing file:', filePath);

    if (!filePath) {
      console.error('❌ No file path provided');
      return new Response(
        JSON.stringify({ error: 'Aucun chemin de fichier fourni' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      return new Response(
        JSON.stringify({ error: 'Configuration Supabase manquante' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!openaiKey) {
      console.error('❌ Missing OpenAI API key');
      return new Response(
        JSON.stringify({ error: 'Clé API OpenAI manquante' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    console.log('⬇️ Downloading file from storage');
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('audio')
      .download(filePath);

    if (downloadError) {
      console.error('❌ File download error:', downloadError);
      return new Response(
        JSON.stringify({ error: `Erreur lors du téléchargement: ${downloadError.message}` }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ File downloaded successfully');

    console.log('🔄 Preparing file for Whisper API');
    const formData = new FormData();
    
    const fileExtension = filePath.split('.').pop()?.toLowerCase();
    let mimeType;
    switch (fileExtension) {
      case 'mp3':
        mimeType = 'audio/mpeg';
        break;
      case 'wav':
        mimeType = 'audio/wav';
        break;
      case 'mp4':
        mimeType = 'video/mp4';
        break;
      case 'm4a':
        mimeType = 'audio/mp4';
        break;
      case 'ogg':
      case 'oga':
        mimeType = 'audio/ogg';
        break;
      case 'webm':
        mimeType = 'audio/webm';
        break;
      case 'flac':
        mimeType = 'audio/flac';
        break;
      default:
        mimeType = 'audio/mpeg';
    }

    const file = new File([fileData], `audio.${fileExtension}`, { type: mimeType });
    formData.append('file', file);
    formData.append('model', 'whisper-1');
    formData.append('language', 'fr');

    console.log('🎙️ Calling Whisper API');
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const error = await whisperResponse.text();
      console.error('❌ Whisper API error:', error);
      
      // Parse the error to check if it's a quota error
      try {
        const parsedError = JSON.parse(error);
        if (parsedError.error?.code === 'insufficient_quota') {
          return new Response(
            JSON.stringify({ 
              error: 'Quota OpenAI dépassé. Veuillez vérifier votre abonnement OpenAI ou contacter le support.',
              details: parsedError.error.message
            }),
            { 
              status: 429,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      } catch (e) {
        // If error parsing fails, return generic error
      }
      
      return new Response(
        JSON.stringify({ error: `Erreur Whisper API: ${error}` }),
        { 
          status: whisperResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const result = await whisperResponse.json();
    console.log('✅ Transcription completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        transcription: result.text
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('❌ Error in transcribe-simple function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
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