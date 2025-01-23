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

  if (req.method === 'OPTIONS') {
    console.log('✅ Requête OPTIONS - Réponse CORS envoyée');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Démarrage du traitement de la requête');

    // Vérification du Content-Type
    const contentType = req.headers.get('content-type');
    console.log('📝 Content-Type reçu:', contentType);
    
    if (!contentType || !contentType.includes('multipart/form-data')) {
      console.error('❌ Content-Type invalide:', contentType);
      throw new Error(`Content-Type invalide. Reçu: ${contentType}, Attendu: multipart/form-data`);
    }

    console.log('📦 Lecture du FormData...');
    const formData = await req.formData();
    console.log('✅ FormData lu avec succès');

    const file = formData.get('file');
    console.log('🎵 Détails du fichier:', {
      name: file?.name,
      type: file?.type,
      size: file instanceof File ? file.size : 'N/A'
    });

    if (!file || !(file instanceof File)) {
      console.error('❌ Fichier invalide:', file);
      throw new Error('Fichier invalide ou manquant');
    }

    // Préparation pour Whisper
    console.log('🔄 Préparation pour Whisper...');
    const whisperFormData = new FormData();
    whisperFormData.append('file', file);
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', 'fr');
    console.log('✅ FormData préparé pour Whisper');

    console.log('🌐 Appel API Whisper...');
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: whisperFormData,
    });

    console.log('📊 Statut réponse Whisper:', whisperResponse.status);
    console.log('📝 Headers réponse:', Object.fromEntries(whisperResponse.headers.entries()));

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

    // Stockage du fichier
    const filePath = `public/${crypto.randomUUID()}.${file.name.split('.').pop()}`;
    console.log('📤 Upload vers:', filePath);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('💾 Upload du fichier...');
    const { error: storageError } = await supabaseAdmin.storage
      .from('audio')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (storageError) {
      console.error('❌ Erreur stockage:', storageError);
      throw storageError;
    }
    console.log('✅ Fichier uploadé');

    console.log('📝 Création entrée historique...');
    const { error: historyError } = await supabaseAdmin
      .from('history')
      .insert({
        filename: file.name,
        file_path: filePath,
        transcription: result.text,
        file_type: 'transcription'
      });

    if (historyError) {
      console.error('❌ Erreur historique:', historyError);
      throw historyError;
    }
    console.log('✅ Historique créé');

    console.log('🎉 Traitement terminé avec succès');
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          transcription: {
            filename: file.name,
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
    console.error('❌ Erreur fonction transcribe-simple:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erreur de transcription'
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