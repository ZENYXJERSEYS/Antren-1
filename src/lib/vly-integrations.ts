// VLY Integrations — placeholder.
//
// The original Convex-era module (which used `createVlyIntegrations` with
// `process.env.VLY_INTEGRATION_KEY`) was removed when the app migrated from
// Convex to Supabase. Nothing imports this module; it exists only so imports
// of "@/lib/vly-integrations" never break. The app talks to Vly through
// `@vly-ai/integrations`' vite plugin (see vite.config.ts).

export {};
