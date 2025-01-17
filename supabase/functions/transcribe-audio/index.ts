import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const audioFile = formData.get('file')
    const language = formData.get('language') || 'fr'

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: 'Aucun fichier audio fourni' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Créer un client Supabase avec la clé de service
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Préparer le fichier pour l'API Whisper
    const formDataForWhisper = new FormData()
    formDataForWhisper.append('file', audioFile)
    formDataForWhisper.append('model', 'whisper-1')
    formDataForWhisper.append('language', language)

    // Appeler l'API Whisper
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formDataForWhisper,
    })

    if (!whisperResponse.ok) {
      const error = await whisperResponse.text()
      throw new Error(`Erreur Whisper API: ${error}`)
    }

    const { text: transcription } = await whisperResponse.json()

    // Stocker le fichier audio dans Supabase Storage
    const fileExt = audioFile.name.split('.').pop()
    const filePath = `public/${crypto.randomUUID()}.${fileExt}`

    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from('audio')
      .upload(filePath, audioFile, {
        contentType: audioFile.type,
        upsert: false
      })

    if (storageError) {
      throw storageError
    }

    // Créer l'entrée dans audio_files
    const { data: audioFileData, error: audioFileError } = await supabaseAdmin
      .from('audio_files')
      .insert({
        filename: audioFile.name,
        file_path: filePath,
      })
      .select()
      .single()

    if (audioFileError) {
      throw audioFileError
    }

    // Créer l'entrée dans transcriptions
    const { data: transcriptionData, error: transcriptionError } = await supabaseAdmin
      .from('transcriptions')
      .insert({
        audio_file_id: audioFileData.id,
        transcription,
        language,
        status: 'completed'
      })
      .select()
      .single()

    if (transcriptionError) {
      throw transcriptionError
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          audioFile: audioFileData,
          transcription: transcriptionData
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erreur:', error)
    return new Response(
      JSON.stringify({
        error: 'Une erreur est survenue lors de la transcription',
        details: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})