# Vly Integrations

`@vly-ai/integrations` is used in this project via the `vlyPlugin()` vite plugin
(see `vite.config.ts`). The plugin injects the platform's runtime scripts into
the built app.

If a future feature needs AI/email/payments through the Vly gateway, add it
as a Supabase Edge Function or a small server route, reading
`VLY_INTEGRATION_KEY` server-side only — never in the client bundle.
