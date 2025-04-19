import { createClient } from '@supabase/supabase-js'

// Ensure you have a .env file in the root with these variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("VITE_SUPABASE_URL is not defined in your .env file");
}

if (!supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_ANON_KEY is not defined in your .env file");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 