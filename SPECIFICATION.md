# Productivity App Specification

## Product Summary

**Opexlo** is a calm, browser based productivity app designed to lower the mental operating expense of planning, focusing, and finishing work. The app helps users capture tasks quickly, plan their day realistically, protect focus through structured work sessions, and review progress through simple analytics. The MVP will prioritize a clean daily execution loop over complex workspace features, giving busy users one elegant place to manage their day without unnecessary setup or distraction.

## 1. Product Vision

The productivity app will focus on daily planning and execution, not becoming a large all purpose workspace or Notion clone.

The goal is to create one calm place where users can capture tasks, plan realistically, focus deeply, track progress, and understand where their time is going.

The first version should prove the core planning and execution loop before expanding into advanced features.

The app should draw inspiration from:

- Todoist style fast task capture
- Akiflow style task consolidation
- Routine style focused Today view
- Sunsama style mindful planning
- Toggl style productivity analytics
- Focus Traveller style focus sessions and light gamification
- Capacities style structured notes

The MVP will be a browser based web app. Mobile, desktop, and app store distribution may be revisited after the web app is functional and validated.

AI will not be included in the initial version. It may be revisited later if it directly improves the core workflow.

## 2. Core Product Philosophy

The app should help users execute their day, not endlessly organize their life.

The product should prioritize:

- Ease of use
- Simplicity
- Calm design
- Fast capture
- Clear daily focus
- Realistic planning
- Reduced context switching
- Optional analytics
- Lightweight motivation
- Minimal setup before value is delivered

The app should support both light and detailed planning. A user should be able to plan only a few tasks and still get value, while a power user should be able to plan more deeply without the app becoming overwhelming.

The app should avoid:

- Becoming a complex workspace clone
- Requiring long setup flows
- Requiring complex calendar configuration before use
- Overwhelming users with too many views
- Excessive notifications
- AI features that do not clearly improve the workflow
- Analytics that feel judgmental or intimidating
- Features that make the app feel like work to maintain

## 3. Visual Design and Color Palette

The visual design should feel sleek, elegant, calm, and premium. The interface should support focus without feeling overly corporate, playful, or visually noisy.

The selected palette is a soft executive minimalism theme inspired by sage green, mist blue, muted steel blue, warm off white, and deep slate navy.

### 3.1 Color Palette

Use the following colors as the starting design system:

- Background: `#F7F7F5`
- Surface: `#FFFFFF`
- Muted surface: `#DDEBEE`
- Primary: `#4A506B`
- Primary hover: `#3D435B`
- Accent: `#B8C6DA`
- Success: `#B6D6C2`
- Primary text: `#1F2937`
- Secondary text: `#6B7280`
- Border: `#D8DEE8`

### 3.2 Color Usage

Use the colors intentionally and sparingly:

- Use `#F7F7F5` as the main app background.
- Use `#FFFFFF` for cards, panels, forms, and modal surfaces.
- Use `#DDEBEE` for soft secondary sections, empty states, and subtle background panels.
- Use `#4A506B` for primary buttons, navigation highlights, important headers, and active states.
- Use `#3D435B` for primary button hover states.
- Use `#B8C6DA` for secondary highlights, analytics accents, and non critical visual emphasis.
- Use `#B6D6C2` for completed tasks, progress states, positive feedback, and success indicators.
- Use `#1F2937` for primary readable text.
- Use `#6B7280` for labels, helper text, metadata, and muted descriptions.
- Use `#D8DEE8` for borders, dividers, input outlines, and subtle separation.

### 3.3 Design Guidelines

The UI should use generous spacing, rounded cards, soft borders, restrained color, and clear hierarchy. Most screens should rely on neutral colors, with accent colors reserved for progress, completion, primary actions, and important states.

The app should avoid loud gradients, excessive shadows, dense layouts, and too many competing accent colors.

## 4. Target Users

The initial target users are busy, productivity focused people who need help managing their days and staying aligned with longer term goals.

Examples include:

- Corporate workers
- Founders
- Influencers and creators
- Freelancers
- Executives
- Students with demanding schedules
- Knowledge workers
- Anyone trying to stay organized and productive

Target users may struggle with:

- Knowing what to work on day to day
- Overplanning
- Losing focus during work sessions
- Forgetting what they accomplished
- Managing very busy schedules
- Staying consistent with long term goals
- Switching between too many tools

## 5. Initial Product Scope

The first version should focus on this execution loop:

1. Capture tasks quickly.
2. Organize tasks into projects, areas, or goals.
3. Plan the current day.
4. Let users manually set estimated task durations.
5. Time block work when useful.
6. Start focus sessions.
7. Complete tasks.
8. Review progress and time usage.

The app will not estimate task duration automatically in the first version. Users will manually set estimated durations, and the app will use those estimates to support realistic planning.

## 6. Core Features

### 6.1 Quick Capture

Users should be able to add tasks with minimal friction.

Requirements:

- Add a task from anywhere inside the app.
- Support task title, due date, project, priority, estimated duration, and notes.
- Support optional task start reminders, stop reminders, and deadline reminders.
- Provide an inbox for unorganized tasks.
- Allow users to organize captured tasks later.

Natural language entry may be considered later, but full natural language processing is not required for the MVP.

### 6.2 Focused Today View

The Today view should be the primary screen of the app.

Requirements:

- Show tasks planned for today.
- Show scheduled time blocks.
- Show the current focus session when active.
- Show top priorities.
- Show lightweight progress indicators.
- Hide backlog complexity unless the user intentionally opens it.
- Allow users to work from a simple list without requiring time blocking.

### 6.3 Mindful Daily Planning

The app should guide users toward realistic daily plans.

Requirements:

- Provide a morning planning flow.
- Let users select tasks for today.
- Let users manually set estimated durations.
- Warn users when planned work exceeds available time.
- Encourage users to choose a small number of top priorities.
- Allow optional reminders for planned tasks.
- Allow users to skip detailed planning and simply choose a few tasks for the day.

The daily planning workflow should live at `/app/planner` to keep planning separate from the Today view and reduce complexity.

### 6.4 Time Blocking

Users should be able to schedule tasks into time blocks when they want more structure.

Requirements:

- Create time blocks for tasks.
- Move blocks across the day.
- Resize blocks to adjust planned duration.
- Compare estimated time with actual tracked time.
- Support unscheduled tasks that remain in the Today list.
- Avoid requiring external calendar setup for the MVP.

### 6.5 Focus Sessions

The app should help users work through planned tasks with focus.

Requirements:

- Start a focus timer for a selected task.
- Support Pomodoro style custom time length sessions.
- Pomodoro supports a max duration of 55 minutes followed by a 5 minute break.
- Support Deep Work style custom time length sessions.
- Deep Work supports a max of 12 hours followed by no break.
- Track completed focus time.
- Provide subtle visual progress.
- Allow users to pause, resume, or stop a focus session.
- Allow the focus timer to continue running while the user uses other app features.
- Add lightweight gamification later, such as streaks, badges, or a progress avatar.

Focus mode should appear as an overlay that can be launched from relevant app pages, especially the Today view and task detail views.

### 6.6 Productivity Analytics

The app should include a simplified analytics view for users who want to understand their productivity patterns.

Requirements:

- Show completed tasks by day and week.
- Show planned time compared with actual tracked time.
- Show focus time by project or area.
- Show planning accuracy.
- Show simple weekly review summaries.
- Keep analytics optional and easy to ignore.
- Avoid making analytics feel punitive or overwhelming.

Analytics should be a paid feature. Users must have an active Tier 1 or Tier 2 subscription to access `/app/analytics` and view productivity analytics.

### 6.7 Structured Notes

Notes should support productivity and execution rather than becoming the entire product.

Requirements:

- Attach notes to tasks.
- Attach notes to projects.
- Create simple structured entities such as Project, Area, Person, Meeting, Goal, or Resource.
- Link notes to tasks, projects, areas, and goals.
- Keep notes lightweight in the MVP.

Notes should be included in the MVP routes and supported as part of the core structured productivity system.

### 6.8 Long Term Goals

The app should support basic long term goal setting without becoming a full goal management platform.

Requirements:

- Allow users to create long term goals.
- Link projects and tasks to goals.
- Show whether today’s tasks support larger goals.
- Include goals in weekly review.
- Avoid complex OKR style workflows in the MVP.

### 6.9 Notifications and Reminders

Notifications should be useful, optional, and controlled by the user.

Requirements:

- Let users set a specific date and time to be reminded about a task.
- Let users set start reminders for scheduled tasks.
- Let users set stop reminders for scheduled tasks or focus sessions.
- Let users set daily planning reminders.
- Let users set shutdown review reminders.
- Allow users to disable notifications entirely.
- Avoid excessive default notifications.

For the beta version, reminders will be delivered through email instead of native push notifications.

## 7. Out of Scope for Initial Version

The following features are intentionally excluded from the MVP:

- AI planning assistant
- AI note summarization
- AI document search
- Command palette
- Complex Notion style databases
- Full team collaboration
- Public page publishing
- Advanced project management features
- Enterprise administration
- Complex automations
- Heavy calendar integrations
- Slack, Gmail, Notion, Todoist, or Asana task consolidation
- Dedicated mobile app strategy for iOS and Android
- Dedicated desktop app strategy
- Native push notifications
- Deep calendar integration strategy
- Advanced background job strategy beyond beta email reminders
- Advanced analytics storage model
- Offline support

## 8. Technology Stack

The initial product will be developed as a standalone browser based web app. Mobile and desktop development are out of scope for the MVP.

### 8.1 React

React will be used to build the interactive user interface.

Use React for:

- Reusable UI components
- Task, project, goal, and note components
- Today view interactions
- Planning workflows
- Focus timer interface
- Analytics dashboard components
- Form driven interactions

Business logic should not be tightly coupled to React components. Planning, timing, analytics, and validation logic should live in reusable modules where possible.

### 8.2 Next.js

Next.js will be used as the main web application framework.

Use Next.js for:

- App routing
- Page layouts
- Server side rendering where useful
- Server actions or route handlers
- Supabase Auth session handling
- Protected application routes
- API style endpoints when client side code should not directly perform an operation

A separate backend service is not required for the MVP. Next.js server functionality will handle the initial backend needs.

The authenticated app should use a simple top navigation layout rather than a sidebar layout to keep the web app lightweight and reduce interface complexity.

### 8.3 TypeScript

TypeScript will be used across the project to improve reliability and maintainability.

Use TypeScript for:

- Application types
- Database entity types
- API request and response types
- Form values
- Validation schemas
- Shared business logic
- Analytics calculation inputs and outputs

Avoid using `any` unless there is a specific and justified reason.

### 8.4 Tailwind CSS

Tailwind CSS will be used for styling.

Use Tailwind CSS for:

- Layout
- Spacing
- Typography
- Responsive design
- Color system
- Component styling
- Calm and minimal visual design

The interface should feel polished, simple, and calm. Avoid unnecessary visual noise, crowded layouts, and overly complex configuration screens.

### 8.5 Supabase PostgreSQL

Supabase PostgreSQL will be used as the primary database.

Store the following data in Supabase PostgreSQL:

- User profiles
- Tasks
- Projects
- Areas
- Goals
- Notes
- Time blocks
- Focus sessions
- Reminder records
- Completion history
- Analytics source data

Database design should prioritize clear relationships, user data isolation, and future extensibility. Raw source records should be preserved where needed so analytics can be recalculated later.

### 8.6 Supabase Auth

Supabase Auth will be used as the authentication provider.

Use Supabase Auth for:

- User registration
- User login
- User logout
- Session management
- Protected routes
- Connecting authenticated users to their database records

Supabase Auth is selected because it integrates directly with Supabase PostgreSQL, Row Level Security, user sessions, and hosted authentication flows.

### 8.7 Supabase Row Level Security

Supabase Row Level Security should be enabled from the beginning.

Use RLS to ensure:

- Users can only access their own tasks.
- Users can only access their own projects, goals, notes, and time blocks.
- Users can only modify records that belong to them.
- Future collaboration features can be added without redesigning the security model.

RLS policies should be treated as a core part of the architecture, not as an optional layer added later.

### 8.8 Vercel

Vercel will be used to host and deploy the web app.

Use Vercel for:

- Hosting the Next.js application
- Preview deployments
- Production deployments
- Environment variable management
- Serverless Next.js route handlers and server actions

The deployment process should remain simple for the MVP. Avoid complex cloud infrastructure unless product requirements clearly demand it.

### 8.9 Resend

Resend will be used for beta reminder emails and transactional product emails.

Use Resend for:

- Task reminder emails
- Daily planning reminder emails
- Shutdown review reminder emails
- Basic transactional product emails if needed

Resend is selected because it has a free tier, works well with Next.js, and provides a simple developer experience for sending transactional emails.

Native push notifications are out of scope for the MVP.

### 8.10 Vercel Cron Jobs

Vercel Cron Jobs will be used for beta email reminders and recurring task processing.

Use Vercel Cron Jobs for:

- Checking for due reminders
- Sending scheduled email reminders through Resend
- Creating recurring task instances
- Running lightweight scheduled maintenance

For the beta version, the cron job should run once per minute using a standard cron schedule. This should be frequent enough for email reminders while keeping infrastructure simple.

The reminder system should use a tolerance window instead of assuming exact second level precision. The cron route should check for reminders where the scheduled time is less than or equal to the current time and the reminder has not already been sent. This prevents reminders from being missed if a run is delayed.

Reminder sending flow:

1. User creates a reminder.
2. Reminder is saved in Supabase PostgreSQL.
3. Vercel Cron triggers a protected Next.js route once per minute.
4. The route queries Supabase for due unsent reminders.
5. The route sends reminder emails through Resend.
6. Successfully sent reminders are marked as sent.
7. Failed reminder attempts are logged for retry or debugging.

The app should not promise exact second level reminder delivery in the MVP. Faster than once per minute scheduling and advanced job queues are out of scope.

### 8.11 Tiptap

Tiptap will be used for rich text editing in notes.

Use Tiptap for:

- Note body editing
- Headings
- Bold text
- Italic text
- Inline code
- Code blocks
- Bulleted lists
- Numbered lists
- Blockquotes
- Links
- Undo and redo

Tiptap should be used only for notes in the MVP. Tasks should remain simple and fast, with plain text fields for titles and descriptions.

The notes editor should use a minimal toolbar that matches the app’s calm visual style. The editor should avoid becoming a full document editor or Notion style workspace.

Rich text note content should be stored as structured JSON in Supabase PostgreSQL using a `JSONB` column. A separate plain text field should also be stored for search, previews, and note cards.

### 8.12 Recharts

Recharts will be used for MVP analytics visualization.

Use Recharts for:

- Completed tasks by day or week
- Focus time by project or area
- Planned time compared with actual time
- Weekly productivity summaries
- Simple bar, line, area, and pie charts

Recharts is selected because it integrates cleanly with React, supports common chart types, and is faster to implement for simple dashboards.

D3.js is out of scope for MVP analytics visualization. It may be revisited later only if the app requires custom visualizations that Recharts cannot support cleanly.

The analytics experience should prioritize clarity, simplicity, and usefulness over complex visual design.

### 8.13 Stripe Billing

Stripe Billing will be used for MVP subscription payments.

The app will launch with three subscription tiers:

- Free tier
- Tier 1
- Tier 2

Exact pricing, feature limits, and tier names will be defined later.

Use Stripe for:

- Subscription checkout
- Monthly and yearly plans
- Free trials if needed
- Customer billing management
- Subscription status tracking
- Payment failure handling
- Upgrade, downgrade, and cancellation flows
- Support for common payment methods such as major credit and debit cards

The MVP implementation should use:

- Stripe Checkout for hosted subscription checkout
- Stripe Customer Portal for customer managed billing, invoices, plan changes, and cancellations
- Stripe webhooks to sync subscription events into Supabase PostgreSQL
- Supabase PostgreSQL to store user subscription status and app specific plan entitlements
- Row Level Security and application logic to enforce plan based access

Potential billing tables may include:

- `billing_customers`
- `subscriptions`
- `plans`
- `plan_entitlements`

The app should avoid hard coding paid feature access directly in UI components. Plan checks should be centralized so paid tiers can be adjusted without rewriting large parts of the app.

Users should be able to access the Free tier without entering payment information. Tier 1 and Tier 2 should require an active Stripe subscription.

Subscription management should live under `/app/settings/billing`. A separate `/app/billing` route is not needed for the MVP.

## 9. MVP Routes

The app should use a clear route structure that separates public marketing pages, authentication pages, protected application pages, billing pages, and server side API routes.

The route structure should be simple enough for the MVP while leaving room for future features.

### 9.1 Root Route and Redirect Behavior

The root route should behave differently depending on authentication state:

- If the user is not logged in, navigating to `/` should show the public landing page.
- If the user is logged in, navigating to `/` should automatically redirect to `/app/today`.
- If the user is logged in and navigates to `/login` or `/register`, they should be redirected to `/app/today`.
- If the user is not logged in and tries to access a protected `/app/*` route, they should be redirected to `/login`.
- After successful login or registration, users should be redirected to `/app/today` by default.

### 9.2 Public Routes

Public routes are available without authentication unless redirect behavior states otherwise.

| Route              | Purpose                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `/`                | Public landing page for unauthenticated users. Redirects authenticated users to `/app/today`. |
| `/pricing`         | Public pricing page showing Free, Tier 1, and Tier 2 plans.                                   |
| `/login`           | User login page. Redirects authenticated users to `/app/today`.                               |
| `/register`        | User registration page. Redirects authenticated users to `/app/today`.                        |
| `/forgot-password` | Password reset request page.                                                                  |
| `/reset-password`  | Password reset completion page after email link redirect.                                     |
| `/terms`           | Terms of service page.                                                                        |
| `/privacy`         | Privacy policy page.                                                                          |
| `/*`               | Global 404 Not Found page for invalid or unmatched routes.                                    |

### 9.3 Protected App Routes

Protected routes require an authenticated user session.

| Route                         | Purpose                                                                                                                    |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `/app`                        | Main authenticated app entry. Redirects to `/app/today`.                                                                   |
| `/app/today`                  | Primary Today view with planned tasks, time blocks, focus session, and progress.                                           |
| `/app/inbox`                  | Unorganized captured tasks.                                                                                                |
| `/app/tasks`                  | All tasks view with filtering and search.                                                                                  |
| `/app/tasks/new`              | Modal route for creating a task using the shared task form.                                                                |
| `/app/tasks/[taskId]`         | Task detail route for reading, editing, completing, deleting, and managing reminders. May open as a modal where practical. |
| `/app/projects`               | Project list view.                                                                                                         |
| `/app/projects/new`           | Modal route for creating a project using the shared project form.                                                          |
| `/app/projects/[projectId]`   | Project detail route with linked tasks, notes, goals, and analytics. May open as a modal where practical.                  |
| `/app/areas`                  | Area list view for broad life or work categories.                                                                          |
| `/app/areas/new`              | Modal route for creating an area using the shared area form.                                                               |
| `/app/areas/[areaId]`         | Area detail route with linked projects, tasks, and goals. May open as a modal where practical.                             |
| `/app/goals`                  | Goal list view.                                                                                                            |
| `/app/goals/new`              | Modal route for creating a goal using the shared goal form.                                                                |
| `/app/goals/[goalId]`         | Goal detail route with linked projects, tasks, notes, and progress. May open as a modal where practical.                   |
| `/app/notes`                  | Notes list view.                                                                                                           |
| `/app/notes/new`              | Modal route for creating a note using the shared note form.                                                                |
| `/app/notes/[noteId]`         | Note detail route for reading, editing, linking, and deleting. May open as a modal where practical.                        |
| `/app/planner`                | Dedicated daily planning workflow.                                                                                         |
| `/app/focus`                  | Focus session view. Focus mode should primarily appear as an overlay that can continue running across app pages.           |
| `/app/analytics`              | Simplified analytics dashboard. Requires a paid Tier 1 or Tier 2 subscription.                                             |
| `/app/settings`               | User settings page.                                                                                                        |
| `/app/settings/account`       | Account profile and authentication related settings.                                                                       |
| `/app/settings/notifications` | Reminder and email notification preferences.                                                                               |
| `/app/settings/billing`       | Billing status and subscription management entry point.                                                                    |

### 9.4 Billing Routes

Billing routes support subscription checkout and account management through Stripe.

| Route                   | Purpose                                                                       |
| ----------------------- | ----------------------------------------------------------------------------- |
| `/pricing`              | Public plan comparison and upgrade entry point.                               |
| `/app/settings/billing` | Authenticated billing management page and Stripe Customer Portal entry point. |
| `/billing/success`      | Stripe Checkout success redirect page.                                        |
| `/billing/cancel`       | Stripe Checkout cancellation redirect page.                                   |

Billing management should primarily rely on Stripe Checkout and Stripe Customer Portal instead of custom payment forms.

### 9.5 Server Routes

Server routes should be implemented with Next.js route handlers when a server side operation is required.

| Route                                 | Purpose                                                                          |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| `/api/stripe/create-checkout-session` | Creates a Stripe Checkout session for Tier 1 or Tier 2.                          |
| `/api/stripe/create-portal-session`   | Creates a Stripe Customer Portal session for billing management.                 |
| `/api/webhooks/stripe`                | Receives Stripe webhook events and syncs subscription status into Supabase.      |
| `/api/cron/reminders`                 | Vercel Cron route that checks for due reminders and sends emails through Resend. |
| `/api/cron/recurring-tasks`           | Optional Vercel Cron route that creates recurring task instances.                |

Most CRUD operations should use Supabase client/server utilities, server actions, or route handlers depending on security needs and implementation clarity. The app does not need a separate REST endpoint for every page if server actions provide a cleaner developer experience.

### 9.6 CRUD Coverage

The MVP should support create, read, update, and delete operations for the following core entities:

| Entity         | Primary Routes                                                                    |
| -------------- | --------------------------------------------------------------------------------- |
| Tasks          | `/app/inbox`, `/app/tasks`, `/app/tasks/new`, `/app/tasks/[taskId]`, `/app/today` |
| Projects       | `/app/projects`, `/app/projects/new`, `/app/projects/[projectId]`                 |
| Areas          | `/app/areas`, `/app/areas/new`, `/app/areas/[areaId]`                             |
| Goals          | `/app/goals`, `/app/goals/new`, `/app/goals/[goalId]`                             |
| Notes          | `/app/notes`, `/app/notes/new`, `/app/notes/[noteId]`                             |
| Time blocks    | `/app/today`, `/app/planner`, `/app/tasks/[taskId]`                               |
| Focus sessions | `/app/focus`, `/app/today`, `/app/tasks/[taskId]`                                 |
| Reminders      | `/app/tasks/[taskId]`, `/app/settings/notifications`                              |
| Subscriptions  | `/pricing`, `/app/settings/billing`, `/billing/success`, `/billing/cancel`        |

Create and edit flows should use modal routes where practical. Since creating and editing tasks, projects, areas, goals, and notes share similar forms, they should reuse the same form components with mode specific behavior.

Full detail routes should still exist for deep linking, refresh behavior, and direct navigation, even when entities open in modals during normal app usage.

## 10. Database Tables

The database should be designed around Supabase PostgreSQL, Supabase Auth, Row Level Security, and subscription based access control.

Supabase Auth will manage the core authentication user record through Supabase’s built in auth system. The application should not create a separate password or session table. App specific user data should be stored in public tables linked to the authenticated user ID.

Unless otherwise noted, all primary keys should use `UUID PRIMARY KEY DEFAULT gen_random_uuid()`. All user owned tables should include a `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` column. Row Level Security should ensure users can only access their own records.

### 10.1 Auth and User Profile Tables

#### `profiles`

Stores app specific user profile data linked to Supabase Auth.

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE`
- `full_name TEXT NULL`
- `email TEXT NOT NULL`
- `avatar_url TEXT NULL`
- `timezone TEXT NOT NULL DEFAULT 'UTC'`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Notes:

- This table should store app profile data only, not passwords.
- Timezone should be stored because reminders, planning, and analytics depend on the user’s local day.

#### `user_preferences`

Stores user level app preferences.

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE`
- `default_planning_reminder_time TIME NULL`
- `default_shutdown_reminder_time TIME NULL`
- `email_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE`
- `daily_planning_reminders_enabled BOOLEAN NOT NULL DEFAULT FALSE`
- `shutdown_reminders_enabled BOOLEAN NOT NULL DEFAULT FALSE`
- `default_focus_minutes INTEGER NOT NULL DEFAULT 25`
- `default_break_minutes INTEGER NOT NULL DEFAULT 5`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

### 10.2 Subscription and Billing Tables

Stripe should remain the source of truth for payment processing. Supabase should store the subscription state needed by the app for access control and plan enforcement.

#### `plans`

Stores the app’s subscription plans.

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `name TEXT NOT NULL`
- `slug TEXT NOT NULL UNIQUE`
- `stripe_price_id_monthly TEXT NULL`
- `stripe_price_id_yearly TEXT NULL`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Initial plan slugs:

- `free`
- `tier_1`
- `tier_2`

#### `plan_entitlements`

Stores feature access rules for each plan.

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE`
- `feature_key TEXT NOT NULL`
- `feature_limit INTEGER NULL`
- `is_enabled BOOLEAN NOT NULL DEFAULT TRUE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Example feature keys:

- `analytics_access`
- `max_projects`
- `max_goals`
- `max_notes`
- `max_reminders`
- `advanced_reminders`

Notes:

- Analytics should require an active Tier 1 or Tier 2 subscription.
- Plan checks should be centralized in application logic instead of hard coded in UI components.

#### `billing_customers`

Links app users to Stripe customers.

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE`
- `stripe_customer_id TEXT NOT NULL UNIQUE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `subscriptions`

Stores the user’s current Stripe subscription state.

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `plan_id UUID NOT NULL REFERENCES plans(id)`
- `stripe_subscription_id TEXT NULL UNIQUE`
- `stripe_customer_id TEXT NOT NULL`
- `status TEXT NOT NULL`
- `current_period_start TIMESTAMPTZ NULL`
- `current_period_end TIMESTAMPTZ NULL`
- `cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE`
- `trial_start TIMESTAMPTZ NULL`
- `trial_end TIMESTAMPTZ NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Notes:

- This table should be updated through Stripe webhooks.
- The app should use this table to determine whether a user has active Tier 1 or Tier 2 access.

#### `billing_events`

Stores Stripe webhook events for auditing and debugging.

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `stripe_event_id TEXT NOT NULL UNIQUE`
- `event_type TEXT NOT NULL`
- `processed_at TIMESTAMPTZ NULL`
- `payload JSONB NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Notes:

- This helps prevent duplicate webhook processing and makes billing issues easier to debug.

### 10.3 Organization Tables

#### `areas`

Stores broad categories of work or life.

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `name TEXT NOT NULL`
- `description TEXT NULL`
- `color TEXT NULL`
- `archived_at TIMESTAMPTZ NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Examples:

- Work
- Personal
- Health
- Business
- Content Creation

#### `projects`

Stores projects that group related tasks, notes, and goals.

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `area_id UUID NULL REFERENCES areas(id) ON DELETE SET NULL`
- `name TEXT NOT NULL`
- `description TEXT NULL`
- `color TEXT NULL`
- `status TEXT NOT NULL DEFAULT 'active'`
- `archived_at TIMESTAMPTZ NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Example statuses:

- `active`
- `paused`
- `completed`
- `archived`

#### `goals`

Stores long term goals.

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `area_id UUID NULL REFERENCES areas(id) ON DELETE SET NULL`
- `title TEXT NOT NULL`
- `description TEXT NULL`
- `target_date DATE NULL`
- `status TEXT NOT NULL DEFAULT 'active'`
- `completed_at TIMESTAMPTZ NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Example statuses:

- `active`
- `completed`
- `paused`
- `archived`

#### `goal_projects`

Links goals to projects.

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE`
- `project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Notes:

- A goal may require multiple projects.
- A project may support multiple goals.

### 10.4 Task Tables

#### `tasks`

Stores core task records.

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `project_id UUID NULL REFERENCES projects(id) ON DELETE SET NULL`
- `area_id UUID NULL REFERENCES areas(id) ON DELETE SET NULL`
- `goal_id UUID NULL REFERENCES goals(id) ON DELETE SET NULL`
- `title TEXT NOT NULL`
- `description TEXT NULL`
- `status TEXT NOT NULL DEFAULT 'inbox'`
- `priority TEXT NOT NULL DEFAULT 'medium'`
- `due_date DATE NULL`
- `planned_date DATE NULL`
- `estimated_minutes INTEGER NULL`
- `completed_at TIMESTAMPTZ NULL`
- `archived_at TIMESTAMPTZ NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Example statuses:

- `inbox`
- `planned`
- `in_progress`
- `completed`
- `archived`

Example priorities:

- `low`
- `medium`
- `high`
- `urgent`

Notes:

- Tasks without a project, area, or goal should still be valid.
- `planned_date` determines whether a task appears in the Today view.
- `estimated_minutes` is manually set by the user.

#### `task_checklist_items`

Stores subtasks or checklist items for a task.

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE`
- `title TEXT NOT NULL`
- `is_completed BOOLEAN NOT NULL DEFAULT FALSE`
- `sort_order INTEGER NOT NULL DEFAULT 0`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `task_events`

Stores meaningful task activity for analytics and history.

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `task_id UUID NULL REFERENCES tasks(id) ON DELETE SET NULL`
- `event_type TEXT NOT NULL`
- `event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `metadata JSONB NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Example event types:

- `created`
- `planned`
- `started`
- `completed`
- `rescheduled`
- `archived`

Notes:

- This table can support analytics without relying only on the current task state.

### 10.5 Planner Tables

#### `daily_plans`

Stores one planning record per user per day.

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `plan_date DATE NOT NULL`
- `notes TEXT NULL`
- `planned_start_time TIME NULL`
- `planned_end_time TIME NULL`
- `shutdown_completed_at TIMESTAMPTZ NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Notes:

- This table supports the `/app/planner` workflow.
- The combination of `user_id` and `plan_date` should be unique.

#### `daily_plan_items`

Links tasks to a specific daily plan.

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `daily_plan_id UUID NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE`
- `task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE`
- `sort_order INTEGER NOT NULL DEFAULT 0`
- `is_top_priority BOOLEAN NOT NULL DEFAULT FALSE`
- `planned_minutes INTEGER NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Notes:

- This table allows the user to choose which tasks matter today without permanently changing the task itself beyond `planned_date` if needed.

#### `time_blocks`

Stores scheduled work blocks.

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `task_id UUID NULL REFERENCES tasks(id) ON DELETE SET NULL`
- `daily_plan_id UUID NULL REFERENCES daily_plans(id) ON DELETE SET NULL`
- `title TEXT NOT NULL`
- `start_at TIMESTAMPTZ NOT NULL`
- `end_at TIMESTAMPTZ NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Notes:

- Time blocks may be linked to a task or exist as standalone planning blocks.
- External calendar integration is out of scope for the MVP.

### 10.6 Focus Session Tables

#### `focus_sessions`

Stores focus timer sessions.

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `task_id UUID NULL REFERENCES tasks(id) ON DELETE SET NULL`
- `started_at TIMESTAMPTZ NOT NULL`
- `ended_at TIMESTAMPTZ NULL`
- `duration_minutes INTEGER NULL`
- `planned_minutes INTEGER NULL`
- `status TEXT NOT NULL DEFAULT 'active'`
- `session_type TEXT NOT NULL DEFAULT 'custom'`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Example statuses:

- `active`
- `paused`
- `completed`
- `cancelled`

Example session types:

- `pomodoro`
- `custom`
- `open_focus`

Notes:

- Focus sessions should support the focus overlay and continue running while the user navigates the app.
- Completed focus sessions should feed analytics.

### 10.7 Reminder and Email Tables

#### `reminders`

Stores user scheduled reminders.

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `task_id UUID NULL REFERENCES tasks(id) ON DELETE CASCADE`
- `reminder_type TEXT NOT NULL`
- `scheduled_at TIMESTAMPTZ NOT NULL`
- `sent_at TIMESTAMPTZ NULL`
- `status TEXT NOT NULL DEFAULT 'pending'`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Example reminder types:

- `task_start`
- `task_stop`
- `task_deadline`
- `daily_planning`
- `shutdown_review`

Example statuses:

- `pending`
- `sent`
- `failed`
- `cancelled`

#### `email_delivery_logs`

Stores reminder email delivery attempts.

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `reminder_id UUID NULL REFERENCES reminders(id) ON DELETE SET NULL`
- `resend_email_id TEXT NULL`
- `status TEXT NOT NULL`
- `error_message TEXT NULL`
- `sent_at TIMESTAMPTZ NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Notes:

- This table supports debugging and retry behavior for email reminders.

### 10.8 Recurring Task Tables

#### `recurring_task_rules`

Stores recurrence rules for repeating tasks.

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `template_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE`
- `frequency TEXT NOT NULL`
- `interval INTEGER NOT NULL DEFAULT 1`
- `days_of_week INTEGER[] NULL`
- `day_of_month INTEGER NULL`
- `next_run_at TIMESTAMPTZ NULL`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Example frequencies:

- `daily`
- `weekly`
- `monthly`

Notes:

- The MVP can keep recurrence simple.
- Vercel Cron can process due recurrence rules and create task instances.

### 10.9 Notes Tables

#### `notes`

Stores lightweight structured notes with Tiptap rich text content.

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `title TEXT NOT NULL`
- `content JSONB NULL`
- `plain_text TEXT NULL`
- `note_type TEXT NOT NULL DEFAULT 'general'`
- `archived_at TIMESTAMPTZ NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Example note types:

- `general`
- `meeting`
- `person`
- `resource`
- `project_note`

#### `note_links`

Links notes to other entities.

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE`
- `linked_entity_type TEXT NOT NULL`
- `linked_entity_id UUID NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Example linked entity types:

- `task`
- `project`
- `area`
- `goal`

Notes:

- This allows one note to be connected to multiple parts of the productivity system.

### 10.10 Analytics Tables

The MVP should calculate most analytics from source records instead of storing every metric as a separate table.

Primary analytics sources:

- `tasks`
- `task_events`
- `daily_plans`
- `daily_plan_items`
- `time_blocks`
- `focus_sessions`

Optional future table:

#### `analytics_snapshots`

Stores precomputed analytics summaries if on demand calculations become too slow.

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `period_type TEXT NOT NULL`
- `period_start DATE NOT NULL`
- `period_end DATE NOT NULL`
- `metrics JSONB NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Notes:

- This table is not required for the initial implementation.
- It may be useful later for weekly summaries or paid analytics performance.

### 10.11 Recommended MVP Table Set

The recommended MVP table set is:

- `profiles`
- `user_preferences`
- `plans`
- `plan_entitlements`
- `billing_customers`
- `subscriptions`
- `billing_events`
- `areas`
- `projects`
- `goals`
- `goal_projects`
- `tasks`
- `task_checklist_items`
- `task_events`
- `daily_plans`
- `daily_plan_items`
- `time_blocks`
- `focus_sessions`
- `reminders`
- `email_delivery_logs`
- `recurring_task_rules`
- `notes`
- `note_links`

The following table can be delayed until needed:

- `analytics_snapshots`

## 11. Guiding MVP Principle

The MVP should prove that users can reliably move through this loop:

**Capture → Plan Today → Time Block When Useful → Focus → Complete → Review**

Any feature that does not strengthen this loop should be delayed.

The app should remain useful even when a user only uses part of the loop. For example, a user should still benefit if they only capture tasks and choose three priorities for the day.

## 12. Future Ideas

Potential future features:

- Calendar integrations
- External task source integrations
- Browser extension
- Desktop global quick capture
- Native iOS app
- Native Android app
- Native desktop app
- AI assisted planning
- AI assisted note organization
- Shared lists
- Habit tracking
- Advanced gamification
- Public API
- Team workspaces
