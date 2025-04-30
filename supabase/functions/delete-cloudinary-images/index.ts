// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Follow Deno Edge Function format
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Hello from Functions!")

interface CloudinaryDeleteResponse {
  result: string;
  error?: {
    message: string;
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get request body
    const { imageUrls } = await req.json()

    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: 'imageUrls must be a non-empty array' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Extract public IDs from Cloudinary URLs
    const publicIds = imageUrls.map((url: string) => {
      // Example URL: https://res.cloudinary.com/your-cloud-name/image/upload/v1234567/folder/image.jpg
      const matches = url.match(/\/v\d+\/(.+)\.\w+$/)
      return matches ? matches[1] : null
    }).filter(Boolean)

    if (publicIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid Cloudinary public IDs found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Get Cloudinary credentials from environment variables
    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME')
    const apiKey = Deno.env.get('CLOUDINARY_API_KEY')
    const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET')

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Missing Cloudinary credentials')
    }

    // Prepare the deletion request
    const timestamp = Math.round(new Date().getTime() / 1000)
    const signature = await generateSignature(publicIds, timestamp, apiSecret)

    // Make the deletion request to Cloudinary's API
    const formData = new FormData()
    formData.append('public_ids[]', publicIds.join(','))
    formData.append('timestamp', timestamp.toString())
    formData.append('signature', signature)
    formData.append('api_key', apiKey)

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload`,
      {
        method: 'DELETE',
        body: formData,
      }
    )

    const result: CloudinaryDeleteResponse = await response.json()

    if (result.error) {
      throw new Error(result.error.message)
    }

    return new Response(
      JSON.stringify({ success: true, deleted: publicIds }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

// Helper function to generate Cloudinary API signature
async function generateSignature(
  publicIds: string[],
  timestamp: number,
  apiSecret: string
): Promise<string> {
  const str = `public_ids[]=${publicIds.join(',')}&timestamp=${timestamp}${apiSecret}`
  const msgUint8 = new TextEncoder().encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/delete-cloudinary-images' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
