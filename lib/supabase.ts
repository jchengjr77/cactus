import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://clutisavqqhkfgknfixo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdXRpc2F2cXFoa2Zna25maXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MDE3NDksImV4cCI6MjA3NTA3Nzc0OX0.S_wc98IqxLwxMTxjABIKzeimljI8PgERuQovJ1SGJm4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
