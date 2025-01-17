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
    // Créer un client Supabase avec la clé de service
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const formData = await req.formData()
    const audioFile = formData.get('file')
    const language = formData.get('language') || 'fr'

    if (!audioFile || !(audioFile instanceof File)) {
      return new Response(
        JSON.stringify({ error: 'Aucun fichier audio fourni ou format invalide' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Audio file received:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size
    })

    // Préparer le fichier pour l'API Whisper
    const whisperFormData = new FormData()
    
    // S'assurer que le fichier a une extension valide
    let fileName = audioFile.name
    if (!fileName.match(/\.(flac|m4a|mp3|mp4|mpeg|mpga|oga|ogg|wav|webm)$/i)) {
      fileName += '.wav'
    }
    
    const whisperFile = new File([await audioFile.arrayBuffer()], fileName, {
      type: audioFile.type || 'audio/wav'
    })
    
    whisperFormData.append('file', whisperFile)
    whisperFormData.append('model', 'whisper-1')
    whisperFormData.append('language', language)

    console.log('Calling Whisper API with file:', {
      name: whisperFile.name,
      type: whisperFile.type,
      size: whisperFile.size
    })

    // Appeler l'API Whisper
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: whisperFormData,
    })

    if (!whisperResponse.ok) {
      const error = await whisperResponse.text()
      console.error('Whisper API error:', error)
      throw new Error(`Erreur Whisper API: ${error}`)
    }

    const { text: transcription } = await whisperResponse.json()
    console.log('Transcription received:', transcription.substring(0, 100) + '...')

    // Stocker le fichier audio dans Supabase Storage
    const fileExt = audioFile.name.split('.').pop()
    const filePath = `public/${crypto.randomUUID()}.${fileExt}`

    console.log('Uploading file to Storage...')
    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from('audio')
      .upload(filePath, audioFile, {
        contentType: audioFile.type,
        upsert: false
      })

    if (storageError) {
      console.error('Storage error:', storageError)
      throw storageError
    }

    // Créer l'entrée dans audio_files sans user_id
    console.log('Creating audio_files entry...')
    const { data: audioFileData, error: audioFileError } = await supabaseAdmin
      .from('audio_files')
      .insert({
        filename: audioFile.name,
        file_path: filePath
      })
      .select()
      .single()

    if (audioFileError) {
      console.error('Audio files error:', audioFileError)
      throw audioFileError
    }

    // Créer l'entrée dans transcriptions
    console.log('Creating transcription entry...')
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
      console.error('Transcription error:', transcriptionError)
      throw transcriptionError
    }

    console.log('All operations completed successfully')
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
    console.error('Error:', error)
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