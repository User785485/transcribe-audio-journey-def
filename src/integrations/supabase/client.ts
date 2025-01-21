import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://zoknyytimzihihvmhwzs.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpva255eXRpbXppaGlodm1od3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzczODQxNDMsImV4cCI6MjA1Mjk2MDE0M30.Jqq47KDNndEAqsTyZHtHC5rzWMkEPyLlJvO2Kjz12Xk";

// Ajout de logs pour débugger
console.log('🔄 Initializing Supabase client with:', {
  url: SUPABASE_URL,
  keyLength: SUPABASE_PUBLISHABLE_KEY.length
});

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  }
);

// Test de connexion
supabase
  .from('prompts')
  .select('*')
  .limit(1)
  .then(response => {
    if (response.error) {
      console.error('❌ Supabase connection test failed:', response.error);
    } else {
      console.log('✅ Supabase connection test successful');
    }
  })
  .catch(error => {
    console.error('❌ Supabase connection test error:', error);
  });