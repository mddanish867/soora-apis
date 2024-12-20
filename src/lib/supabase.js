import { createClient } from "@supabase/supabase.js";

const supabase = createClient(
  process.env.DATABASE_URL,
  process.env.supabase.DIRECT_URL
);

export default supabase;
