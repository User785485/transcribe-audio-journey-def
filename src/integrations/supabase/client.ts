import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://vmqvlnkqpncanqfktnle.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtcXZsbmtxcG5jYW5xZmt0bmxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwOTkwMDgsImV4cCI6MjA1MjY3NTAwOH0.SWio32U3svOm8GWqm384GhAm9aFpR2mYhtGKgDzE_64";

export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true
    },
    headers: {
      'apikey': SUPABASE_PUBLISHABLE_KEY
    }
  }
);