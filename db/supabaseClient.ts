import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace these with your actual Supabase Project URL and Anon Key
// You can find these in your Supabase Dashboard under Project Settings > API
export const SUPABASE_URL = 'https://sakzbxvbqjsbrwtbedde.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_jxJxTby9UXtwGPbvY7pbWA_F8WXtoxk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
