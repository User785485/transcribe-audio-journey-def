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

    // Upload original file
    const { error: uploadError } = await supabase.storage
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

    console.log('Starting ffmpeg conversion...')

    try {
      // Use ffmpeg to convert to MP3
      const ffmpegCmd = new Deno.Command('ffmpeg', {
        args: [
          '-i', originalUrl,
          '-codec:a', 'libmp3lame',
          '-qscale:a', '2',
          mp3Path
        ]
      })

      const ffmpegResult = await ffmpegCmd.output()
      
      if (!ffmpegResult.success) {
        console.error('FFmpeg conversion failed:', new TextDecoder().decode(ffmpegResult.stderr))
        throw new Error('FFmpeg conversion failed')
      }

      console.log('FFmpeg conversion completed')

      // Read the converted MP3 file
      const mp3File = await Deno.readFile(mp3Path)

      // Upload the MP3 to storage
      const { error: mp3UploadError } = await supabase.storage
        .from('audio')
        .upload(mp3Path, mp3File, {
          contentType: 'audio/mpeg'
        })

      if (mp3UploadError) {
        console.error('Error uploading MP3:', mp3UploadError)
        throw new Error('Failed to upload converted MP3')
      }

      console.log('MP3 file uploaded successfully')

      // Get the MP3 URL
      const { data: { publicUrl: mp3Url } } = supabase.storage
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

      // Clean up temporary files
      try {
        await Deno.remove(mp3Path)
      } catch (error) {
        console.error('Error cleaning up temp files:', error)
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          mp3Url,
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
      console.error('FFmpeg error:', error)
      throw new Error(`FFmpeg conversion failed: ${error.message}`)
    }

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