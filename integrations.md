# Vly Integrations

`@vly-ai/integrations` is used in this project via the `vlyPlugin()` vite plugin
(see `vite.config.ts`). The plugin injects the platform's runtime scripts into
the built app.

The former Convex-era `createVlyIntegrations` usage (which required
`VLY_INTEGRATION_KEY` and "use node" actions) was removed when the app migrated
from Convex to Supabase. If a future feature needs AI/email/payments through the
Vly gateway, add it as a Supabase Edge Function or a small server route, reading
`VLY_INTEGRATION_KEY` server-side only — never in the client bundle.
