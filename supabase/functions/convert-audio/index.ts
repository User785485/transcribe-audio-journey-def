import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting audio conversion process...')
    const formData = await req.formData()
    const file = formData.get('file')
    const originalFormat = formData.get('originalFormat')

    if (!file) {
      console.error('No file provided')
      return new Response(
        JSON.stringify({ error: 'No file uploaded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('File received:', {
      name: file.name,
      type: file.type,
      size: file.size,
      originalFormat
    })

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Generate safe filename
    const timestamp = new Date().toISOString()
    const safeOriginalName = file.name.replace(/[^\x00-\x7F]/g, '')
    const fileExt = safeOriginalName.split('.').pop()
    const filePath = `${crypto.randomUUID()}-${timestamp}.${fileExt}`
    const mp3Path = `${filePath.split('.')[0]}.mp3`

    console.log('Generated paths:', { filePath, mp3Path })

    // Upload original file to get a URL
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('audio')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Error uploading original file:', uploadError)
      throw new Error('Failed to upload original file')
    }

    console.log('Original file uploaded successfully')

    // Get the uploaded file URL
    const { data: { publicUrl: originalUrl } } = supabase.storage
      .from('audio')
      .getPublicUrl(filePath)

    console.log('Starting cloud conversion service request...')

    // Use cloud conversion service (example with CloudConvert - you'll need to set up an account)
    const cloudConvertApiKey = Deno.env.get('CLOUDCONVERT_API_KEY')
    if (!cloudConvertApiKey) {
      throw new Error('Cloud conversion service API key not configured')
    }

    // Create conversion job
    const conversionResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cloudConvertApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tasks: {
          'import-1': {
            operation: 'import/url',
            url: originalUrl
          },
          'convert-1': {
            operation: 'convert',
            input: 'import-1',
            output_format: 'mp3',
            audio_bitrate: '192k'
          },
          'export-1': {
            operation: 'export/url',
            input: 'convert-1',
            inline: false,
            archive_multiple_files: false
          }
        }
      })
    })

    if (!conversionResponse.ok) {
      console.error('Cloud conversion service error:', await conversionResponse.text())
      throw new Error('Failed to start conversion job')
    }

    const conversionJob = await conversionResponse.json()
    console.log('Conversion job created:', conversionJob)

    // Wait for job completion
    let mp3Url = null
    let attempts = 0
    const maxAttempts = 30
    while (attempts < maxAttempts && !mp3Url) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      const jobStatusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${conversionJob.data.id}`, {
        headers: {
          'Authorization': `Bearer ${cloudConvertApiKey}`
        }
      })
      
      if (!jobStatusResponse.ok) {
        console.error('Error checking job status:', await jobStatusResponse.text())
        continue
      }

      const jobStatus = await jobStatusResponse.json()
      console.log('Job status:', jobStatus)

      if (jobStatus.data.status === 'finished') {
        const exportTask = jobStatus.data.tasks.find(task => task.operation === 'export/url')
        if (exportTask && exportTask.result && exportTask.result.files) {
          mp3Url = exportTask.result.files[0].url
        }
      } else if (jobStatus.data.status === 'error') {
        throw new Error('Conversion job failed')
      }

      attempts++
    }

    if (!mp3Url) {
      throw new Error('Conversion timeout or failed to get MP3 URL')
    }

    console.log('Conversion completed, downloading MP3...')

    // Download the converted MP3
    const mp3Response = await fetch(mp3Url)
    if (!mp3Response.ok) {
      throw new Error('Failed to download converted MP3')
    }

    const mp3Data = await mp3Response.blob()

    // Upload the MP3 to storage
    const { error: mp3UploadError } = await supabase.storage
      .from('audio')
      .upload(mp3Path, mp3Data, {
        contentType: 'audio/mpeg'
      })

    if (mp3UploadError) {
      console.error('Error uploading MP3:', mp3UploadError)
      throw new Error('Failed to upload converted MP3')
    }

    console.log('MP3 file uploaded successfully')

    // Get the MP3 URL
    const { data: { publicUrl: finalMp3Url } } = supabase.storage
      .from('audio')
      .getPublicUrl(mp3Path)

    // Save conversion record
    const { error: dbError } = await supabase
      .from('conversions')
      .insert({
        original_filename: safeOriginalName,
        converted_filename: `${safeOriginalName.split('.')[0]}.mp3`,
        original_format: fileExt,
        converted_format: 'mp3',
        file_path: mp3Path
      })

    if (dbError) {
      console.error('Error saving conversion record:', dbError)
      throw new Error('Failed to save conversion record')
    }

    console.log('Conversion record saved successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        mp3Url: finalMp3Url,
        message: 'File converted successfully'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    )

  } catch (error) {
    console.error('Conversion error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Conversion failed', 
        details: error.message 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 500 
      }
    )
  }
})