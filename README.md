# Opexlo

Opexlo is a calm browser-based productivity app for lowering the mental operating expense of planning, focusing, and finishing work. The MVP centers on a simple daily execution loop: capture tasks, plan today, focus, complete work, and review progress.

Read [SPECIFICATION.md](./SPECIFICATION.md) before making product, route, database, billing, or design decisions.

## Stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS with shadcn-style UI primitives
- Supabase Auth and PostgreSQL
- Stripe Billing
- Resend
- Vercel Cron Jobs
- Tiptap for notes
- Recharts for analytics
- Vitest and Playwright for testing

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` from `.env.example` and fill in the relevant service keys.

3. Start the development server:

   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev`: start local development.
- `npm run build`: create a production build.
- `npm run start`: start the production server.
- `npm run lint`: run ESLint.
- `npm run format`: format files with Prettier.
- `npm run format:check`: check formatting.
- `npm run test:unit`: run Vitest unit tests.
- `npm run test:e2e`: run Playwright tests.

## Supabase Migrations

```bash
# Start local Supabase
npx supabase start

# Create a new migration
npx supabase migration new <migration_name>

# Rebuild the local database and replay all migrations
npx supabase db reset

# Generate database types from local Supabase
npx supabase gen types typescript --local > types/database.ts

# Check the app after local migration changes
npm run lint
npm run test:unit
npm run build

# Link this repo to the existing cloud Supabase project once per machine
npx supabase login
npx supabase link --project-ref <project_ref>

# Push verified local migrations to the linked cloud project
npx supabase db push

# Stop local Supabase when finished
npx supabase stop
```

## Routes

- Public: `/`, `/pricing`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/terms`, `/privacy`
- Protected app: `/app/today`, `/app/inbox`, `/app/tasks`, `/app/projects`, `/app/areas`, `/app/goals`, `/app/notes`, `/app/planner`, `/app/focus`, `/app/analytics`, `/app/settings`
- Billing redirects: `/billing/success`, `/billing/cancel`
- Auth support: `/auth/confirm`, `/auth/error`, `/auth/sign-up-success`

## Notes

The current app includes route scaffolding and a local-state Today dashboard. Persistent CRUD, database migrations, Stripe checkout, reminder processing, and analytics entitlement checks should be implemented deliberately with Supabase RLS and the architecture described in `SPECIFICATION.md`.
