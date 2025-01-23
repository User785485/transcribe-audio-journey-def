import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  console.log('🎯 Nouvelle requête reçue');
  console.log('📨 Méthode:', req.method);
  console.log('🔑 Headers:', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Requête OPTIONS - Réponse CORS envoyée');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Démarrage du traitement de la requête');

    // Vérification du Content-Type
    const contentType = req.headers.get('content-type');
    console.log('📝 Content-Type reçu:', contentType);
    
    if (!contentType?.includes('multipart/form-data')) {
      console.error('❌ Content-Type invalide:', contentType);
      throw new Error(`Content-Type invalide. Reçu: ${contentType}, Attendu: multipart/form-data`);
    }

    console.log('📦 Tentative de lecture du FormData...');
    const formData = await req.formData();
    console.log('✅ FormData lu avec succès');

    const audioFile = formData.get('file');
    console.log('🎵 Détails du fichier audio:', {
      name: audioFile?.name,
      type: audioFile?.type,
      size: audioFile instanceof File ? audioFile.size : 'N/A'
    });

    if (!audioFile || !(audioFile instanceof File)) {
      console.error('❌ Fichier audio invalide:', audioFile);
      throw new Error('Aucun fichier audio fourni ou format invalide');
    }

    // Préparer le FormData pour Whisper
    console.log('🔄 Préparation du FormData pour Whisper...');
    const whisperFormData = new FormData();
    whisperFormData.append('file', audioFile);
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', 'fr');
    console.log('✅ FormData préparé pour Whisper');

    console.log('🌐 Envoi de la requête à l\'API Whisper...');
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: whisperFormData,
    });

    console.log('📊 Statut de la réponse Whisper:', whisperResponse.status);
    console.log('📝 Headers de la réponse:', Object.fromEntries(whisperResponse.headers.entries()));

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('❌ Erreur API Whisper:', {
        status: whisperResponse.status,
        statusText: whisperResponse.statusText,
        error: errorText
      });
      throw new Error(`Erreur Whisper API: ${errorText}`);
    }

    const result = await whisperResponse.json();
    console.log('✅ Transcription reçue, longueur:', result.text.length);

    // Stocker le fichier
    const filePath = `public/${crypto.randomUUID()}.${audioFile.name.split('.').pop()}`;
    console.log('📤 Upload du fichier vers:', filePath);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('💾 Tentative d\'upload du fichier dans le storage...');
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

    console.log('📝 Création de l\'entrée dans l\'historique...');
    const { error: historyError } = await supabaseAdmin
      .from('history')
      .insert({
        filename: audioFile.name,
        file_path: filePath,
        transcription: result.text,
        file_type: 'transcription'
      });

    if (historyError) {
      console.error('❌ Erreur d\'historique:', historyError);
      throw historyError;
    }
    console.log('✅ Entrée d\'historique créée avec succès');

    console.log('🎉 Traitement terminé avec succès');
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          transcription: {
            filename: audioFile.name,
            filePath,
            transcription: result.text
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
    console.error('❌ Erreur dans la fonction transcribe-simple:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
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