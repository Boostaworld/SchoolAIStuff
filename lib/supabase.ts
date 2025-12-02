
import { createClient } from '@supabase/supabase-js';

const readEnv = (key: string) => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const value = (import.meta as any).env[key];
    if (value) return value;
  }
  if (typeof process !== 'undefined' && (process as any).env) {
    const value = (process as any).env[key];
    if (value) return value;
  }
  return undefined;
};

// Prefer Vite env, but also support Node/Test environments
const SUPABASE_URL =
  readEnv('VITE_SUPABASE_URL') ||
  readEnv('SUPABASE_URL');

const SUPABASE_ANON_KEY =
  readEnv('VITE_SUPABASE_ANON_KEY') ||
  readEnv('SUPABASE_ANON_KEY');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase configuration missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
