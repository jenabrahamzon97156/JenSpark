// lib/supabaseClient.ts
//
// One shared client for the whole app. Credentials come from env vars so
// they're never hardcoded into source — see .env.local.example.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!supabaseConfigured) {
  // Surfaces a clear message in the console instead of a cryptic failure
  // deep inside a fetch call. A placeholder URL keeps createClient from
  // throwing during build/dev before .env.local is set up — real calls
  // will fail with a network error until real credentials are added.
  console.warn(
    "Supabase env vars are missing. Copy .env.local.example to .env.local and fill in your project's URL and anon key."
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);
