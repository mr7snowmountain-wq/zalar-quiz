/* =============================================================================
   ZALAR FARMS CHALLENGE — Configuration Supabase
   -----------------------------------------------------------------------------
   👉 REMPLACE les 2 valeurs "PLACEHOLDER" par TES clés Supabase.
      Console Supabase → ton projet → ⚙️ Project Settings → API :
        - "Project URL"      → SUPABASE_URL
        - "anon public" key  → SUPABASE_ANON_KEY
      Ces deux clés sont PUBLIQUES (elles vont dans le navigateur), aucun risque.
   ============================================================================= */

const SUPABASE_URL = "https://yaouenhoqwlsaemktifi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlhb3VlbmhvcXdsc2FlbWt0aWZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NjUzNTcsImV4cCI6MjA5OTU0MTM1N30.Hh03-b4jIV4lyi9UFKi_fINK5myKdcL-tdwDRYHcm04";

window.__SB_CONFIGURED__ =
  !SUPABASE_URL.includes("PLACEHOLDER") && !SUPABASE_ANON_KEY.includes("PLACEHOLDER");

// `supabase` = librairie UMD (assets/vendor/supabase.js). On crée le client global.
window.__sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 5 } },
  auth: { persistSession: false },
});
