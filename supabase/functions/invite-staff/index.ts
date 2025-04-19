import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts'; // Assuming a shared CORS setup

interface InvitePayload {
  email: string;
  full_name: string;
  phone: string | null;
  role_id: string;
  employment_date: string | null; // Assuming YYYY-MM-DD format
}

// Helper function to check permission using the database function
// Note: This uses the Supabase client initialized with the *invoking user's* JWT
async function checkInvokerPermission(userClient: SupabaseClient, permission: string): Promise<boolean> {
  const { data, error } = await userClient.rpc('check_user_permission', {
    permission_id_to_check: permission
  });
  if (error) {
    console.error('Permission check error:', error);
    return false;
  }
  return data === true;
}


serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Validate input payload
    const payload: InvitePayload = await req.json();
    if (!payload.email || !payload.full_name || !payload.role_id) {
      throw new Error('Missing required fields: email, full_name, role_id.');
    }

    // 2. Create a Supabase client with the invoking user's auth context
    // This is crucial for the permission check
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 3. Check if the invoking user has 'add_staff' permission
    const hasPermission = await checkInvokerPermission(userSupabaseClient, 'add_staff');
    if (!hasPermission) {
      return new Response(JSON.stringify({ error: 'Forbidden: User does not have permission to add staff.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Initialize Supabase Admin Client (requires SUPABASE_SERVICE_ROLE_KEY env var)
    // This client bypasses RLS and is needed for admin actions like invite and profile update
    const adminSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Use Service Role Key
    );

    // 5. Invite the user using the Admin Client
    console.log(`Inviting user: ${payload.email}`);
    const { data: inviteData, error: inviteError } = await adminSupabaseClient.auth.admin.inviteUserByEmail(
      payload.email,
      {
        data: { // Pass data to be potentially used by the signup trigger
          full_name: payload.full_name,
          // We'll set other profile fields directly after invite
        },
        // redirectTo: 'your-app-url/set-password' // Optional: specify where user lands after invite click
      }
    );

    if (inviteError) {
      console.error("Invite Error:", inviteError);
      throw new Error(inviteError.message || 'Failed to invite user.');
    }

    // 6. Invite successful - the trigger 'handle_new_user_profile' should have run.
    // Now, update the profile created by the trigger with the correct role_id and other details.
    const invitedUserId = inviteData?.user?.id;
    if (!invitedUserId) {
        console.error("Invite succeeded but no user ID returned.", inviteData);
        throw new Error('Invite succeeded but user ID was not returned.');
    }

    console.log(`Updating profile for new user: ${invitedUserId}`);
    const { error: updateProfileError } = await adminSupabaseClient
        .from('profiles')
        .update({
            role_id: payload.role_id,
            phone: payload.phone,
            employment_date: payload.employment_date,
            full_name: payload.full_name // Also ensure full_name is updated here
            // Status should already be 'active' from the trigger
        })
        .eq('id', invitedUserId); // Match the profile created by the trigger

    if (updateProfileError) {
        console.error("Profile Update Error after invite:", updateProfileError);
        // Log the error, but might not want to fail the whole process if invite worked
        // Consider compensating actions or logging for manual review
         return new Response(JSON.stringify({
             warning: 'User invited, but failed to update profile details.',
             invite_details: inviteData,
             profile_update_error: updateProfileError.message
            }), {
            status: 207, // Multi-Status or just log and return 200
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`Invite and profile update successful for ${payload.email}`);
    // 7. Return success response
    return new Response(JSON.stringify({ success: true, user: inviteData.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // Use 400 for client-side errors, 500 for server-side
    });
  }
}); 