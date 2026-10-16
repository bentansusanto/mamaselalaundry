import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qlcrjmycgfcswwqphgyv.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_gaKaJj_CuxNb2HZ3PdzN3Q_Ezw_L9Lf";

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey,
  );
