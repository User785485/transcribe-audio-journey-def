import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  console.log('🚀 Function started:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request');
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
    console.log('📦 FormData received');
    
    const audioFile = formData.get('file');
    const language = 'fr';

    if (!audioFile || !(audioFile instanceof File)) {
      console.error('❌ Invalid file:', audioFile);
      throw new Error('Aucun fichier audio fourni ou format invalide');
    }

    console.log('🎵 Audio file details:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size
    });

    // Initialize Supabase client
    console.log('🔄 Initializing Supabase client...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      throw new Error('Configuration Supabase manquante');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Store file
    const filePath = `public/${crypto.randomUUID()}.${audioFile.name.split('.').pop()}`;
    console.log('📤 Uploading file to:', filePath);

    const { error: storageError } = await supabaseAdmin.storage
      .from('audio')
      .upload(filePath, audioFile, {
        contentType: audioFile.type,
        upsert: false
      });

    if (storageError) {
      console.error('❌ Storage upload failed:', storageError);
      throw new Error(`Erreur lors du stockage: ${storageError.message}`);
    }

    console.log('✅ File uploaded successfully');

    // Prepare Whisper API request
    console.log('🎙️ Preparing Whisper API request...');
    const whisperFormData = new FormData();
    whisperFormData.append('file', audioFile);
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', language);

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.error('❌ Missing OpenAI API key');
      throw new Error('Clé API OpenAI manquante');
    }

    // Call Whisper API
    console.log('🔄 Calling Whisper API...');
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: whisperFormData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('❌ Whisper API error:', errorText);
      throw new Error(`Erreur de transcription: ${errorText}`);
    }

    const { text: transcription } = await whisperResponse.json();
    console.log('✅ Transcription received, length:', transcription.length);

    // Store in history table
    console.log('💾 Storing in history...');
    const { error: historyError } = await supabaseAdmin
      .from('history')
      .insert({
        filename: audioFile.name,
        file_path: filePath,
        transcription: transcription,
        file_type: 'transcription'
      });

    if (historyError) {
      console.error('❌ Failed to store in history:', historyError);
      throw new Error('Erreur lors de l\'enregistrement des métadonnées');
    }

    console.log('✅ History entry created successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          filename: audioFile.name,
          filePath,
          transcription
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
    console.error('❌ Error in transcribe-simple function:', error);
    return new Response(
      JSON.stringify({
        error: 'Une erreur est survenue lors de la transcription',
        details: error.message,
        stack: error.stack
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