import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://zbuvpbmpbczrdgerdrae.supabase.co';
const supabasePublishableKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'sb_publishable_2Dc81FDvNVmALCsYgbMqVg_Db8IE9aS';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
