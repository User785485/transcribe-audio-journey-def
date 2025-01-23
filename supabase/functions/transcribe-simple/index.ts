import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    console.log('🚀 Fonction démarrée');
    
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    console.log('📦 Lecture du FormData...');
    const formData = await req.formData();
    console.log('✅ FormData reçu');
    
    const audioFile = formData.get('file');
    if (!audioFile || !(audioFile instanceof File)) {
      console.error('❌ Fichier invalide:', audioFile);
      throw new Error('Aucun fichier audio fourni ou format invalide');
    }

    console.log('🎵 Détails du fichier audio:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size
    });

    // Préparer le FormData pour Whisper
    const whisperFormData = new FormData();
    whisperFormData.append('file', audioFile);
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', 'fr');

    console.log('🔄 Appel de l\'API Whisper...');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: whisperFormData,
    });

    if (!whisperResponse.ok) {
      const error = await whisperResponse.text();
      console.error('❌ Erreur API Whisper:', error);
      throw new Error(`Erreur Whisper API: ${error}`);
    }

    const { text: transcription } = await whisperResponse.json();
    console.log('✅ Transcription reçue, longueur:', transcription.length);

    // Stocker le fichier
    const filePath = `public/${crypto.randomUUID()}.${audioFile.name.split('.').pop()}`;
    console.log('📤 Upload du fichier vers:', filePath);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: storageError } = await supabaseAdmin.storage
      .from('audio')
      .upload(filePath, audioFile, {
        contentType: audioFile.type,
        upsert: false
      });

    if (storageError) {
      console.error('❌ Erreur de stockage:', storageError);
      throw storageError;
    }

    console.log('✅ Fichier uploadé avec succès');

    // Créer l'entrée dans l'historique
    const { error: historyError } = await supabaseAdmin
      .from('history')
      .insert({
        filename: audioFile.name,
        file_path: filePath,
        transcription: transcription,
        file_type: 'transcription'
      });

    if (historyError) {
      console.error('❌ Erreur d\'historique:', historyError);
      throw historyError;
    }

    console.log('✅ Entrée d\'historique créée avec succès');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          transcription: {
            filename: audioFile.name,
            filePath,
            transcription
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

  } catch (error) {
    console.error('❌ Erreur dans la fonction transcribe-simple:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Une erreur est survenue lors de la transcription'
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      }
    );
  }
});