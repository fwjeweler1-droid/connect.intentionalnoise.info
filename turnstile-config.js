// Public Cloudflare Turnstile site key ONLY. This is intentionally empty until the
// owner configures Turnstile in Cloudflare and the corresponding secret in
// Supabase Auth > Bot and Abuse Protection. NEVER store the secret in GitHub.
// Public site key enables the visible challenge; Supabase server-side enforcement\n// requires the matching private Cloudflare secret in Auth > Bot and Abuse Protection.
export const TURNSTILE_SITE_KEY = '0x4AAAAAAF-8yh_o4RTF97C1';
