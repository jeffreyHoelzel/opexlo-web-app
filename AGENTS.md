# Repository Guidelines

## Product Source Of Truth

Read `SPECIFICATION.md` before product, route, database, billing, auth, or design decisions. Keep the MVP focused on the Opexlo loop: capture, plan today, time block when useful, focus, complete, and review. Do not add AI, native mobile/desktop, heavy calendar integrations, or complex workspace features unless the spec changes.

## Repo Structure

This is a Next.js App Router project with TypeScript, Tailwind CSS, Supabase, Stripe, Resend, Recharts, and Tiptap. Use `app/` for routes, `components/` for shared UI and feature components, `components/ui/` for shadcn-style primitives, and `lib/` for reusable logic and service utilities. Create `types/` or additional asset folders only when needed.

Expected route families are the public pages, `/app/*` protected app pages, billing result pages, and future `/api/*` server routes described in `SPECIFICATION.md`. The authenticated app uses top navigation, not a sidebar.

## Implementation Rules

Prefer Server Components by default and add `"use client"` only for interactivity. Keep UI calm, minimal, and aligned with the Opexlo palette in `app/globals.css`. Use Tailwind CSS, existing UI primitives, and `lucide-react` icons. Keep reusable business logic out of React components when practical. Avoid `any` unless there is a clear local reason.

With `cacheComponents: true`, isolate runtime cookie/header/session reads behind `Suspense`; do not move Supabase session reads into the root layout.

## Data And Security

Use Supabase Auth; do not create custom password or session tables. User-owned tables must include `user_id`, enable RLS, and prevent cross-user access. Never expose service role keys or secrets in client code. Stripe webhook routes must verify signatures, cron routes must require a secret, and billing/entitlement checks should be centralized. Use Tiptap only for notes, storing JSONB plus plain text.

## Commands And Verification

Use npm. Run the strongest relevant checks before finalizing code changes:

- `npm run format:check`
- `npm run lint`
- `npm run test:unit`
- `npm run build`

Use Playwright MCP to verify user-facing route and UI changes in a browser. Reuse an existing dev server when one is already running.
