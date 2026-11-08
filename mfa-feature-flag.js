/**
 * Connect TOTP MFA release gate — MUST REMAIN FALSE in staging.
 * Enabling requires written approval and completion of MFA_RELEASE_GATE.md.
 * This is a front-end staging switch, NOT a backend security control.
 * Real enforcement must occur in Supabase Auth/RLS before public launch.
 */
export const MFA_RELEASE_ENABLED = false;
