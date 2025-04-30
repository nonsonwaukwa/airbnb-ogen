// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// REMOVED: import { Buffer } from "https://deno.land/std@0.168.0/io/buffer.ts";
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts"; // Use Deno's Base64 encode
import { v2 as cloudinary } from "npm:cloudinary@^1.40.0";

// Helper to set CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Configure Cloudinary using environment variables
try {
    cloudinary.config({
      cloud_name: Deno.env.get("CLOUDINARY_CLOUD_NAME")!,
      api_key: Deno.env.get("CLOUDINARY_API_KEY")!,
      api_secret: Deno.env.get("CLOUDINARY_API_SECRET")!,
      secure: true,
    });
    console.log(`Cloudinary config loaded for cloud: ${Deno.env.get("CLOUDINARY_CLOUD_NAME")}`);
} catch (configError) {
    console.error("FATAL: Failed to configure Cloudinary. Check environment variables.", configError);
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow POST requests for uploads
  if (req.method !== "POST") {
     console.log(`Method not allowed: ${req.method}`);
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("Handling POST request...");
  let targetFolder = 'ogen_app/other'; // Default folder

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = formData.get("folder") as string | null; // Get optional folder name

    if (!file) {
      console.log("No file found in form data.");
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Construct folder path safely
    // Example: Allow 'properties', 'issues', 'receipts', 'logos'
    const allowedFolders = ['properties', 'issues', 'bookings', 'logos'];
    if (folder && allowedFolders.includes(folder)) {
        targetFolder = `ogen_app/${folder}`;
    } else if (folder) {
        console.warn(`Invalid or disallowed folder specified: ${folder}. Using default.`);
        // Keep default 'ogen_app/other'
    }

    console.log(`Received file: ${file.name}, size: ${file.size}, type: ${file.type}. Uploading to folder: ${targetFolder}`);

    // --- CORRECTED FILE CONVERSION using std/encoding/base64 ---
    // 1. Get ArrayBuffer from the File/Blob
    const fileBuffer = await file.arrayBuffer();

    // 2. Encode the ArrayBuffer directly to a Base64 string
    const base64String = encode(fileBuffer); // Use Deno's encode()

    // 3. Create the Data URI
    const dataUri = `data:${file.type};base64,${base64String}`;
    // --- END OF CORRECTION ---

    console.log(`Generated Data URI (length: ${dataUri.length}). Uploading to Cloudinary...`);

    // Upload to Cloudinary using the Data URI and target folder
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
       folder: targetFolder, // Use the determined folder path
       resource_type: "auto"
    });

    console.log("Cloudinary upload successful:", uploadResult.secure_url);

    // Return the secure URL and public ID from Cloudinary
    return new Response(JSON.stringify({
        secure_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        original_filename: file.name
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error(`Error processing upload (target folder: ${targetFolder}):`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let errorDetails = errorMessage;
    if (error && typeof error === 'object' && 'http_code' in error) {
        errorDetails = JSON.stringify(error);
    }

    return new Response(JSON.stringify({ error: "Failed to process upload", details: errorDetails }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
