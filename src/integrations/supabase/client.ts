// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://izmgzstdgoswlozinmyk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6bWd6c3RkZ29zd2xvemlubXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNTk3NzksImV4cCI6MjA2NTczNTc3OX0.5BEISZmOjbbnBCPlqVyvuHiEDf9NOhaHh33U07UNzVU";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);