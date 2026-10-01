# docs/specs/profile-dashboard.md
lines:43 exports:
---
# Spec: Profile Dashboard & Export

## Objective
Provide a protected `/profile` page where authenticated quiz creators can view their quizzes and export them as a backup. Secure the data via Supabase Row Level Security (RLS) and server-side checks.

## Tech Stack
Next.js App Router, Supabase (Auth + PostgreSQL), Tailwind CSS v4.

## Commands
Build: `npm run build`
Lint: `npm run lint`
Dev: `npm run dev`

## Project Structure
- `app/profile/page.tsx` → The protected server component for the dashboard.
- `app/profile/layout.tsx` → (If needed) specific layout for the dashboard.
- `components/profile/QuizList.tsx` → Client or server component to render the quizzes.
- `components/profile/ExportButton.tsx` → Client component to trigger the JSON download.
- `supabase/migrations/...` → Migration file to enforce RLS (if not already strictly applied).

## Code Style
- Default to React Server Components.
- Use `@supabase/server` to create an authenticated Supabase client for data fetching.
- Use Tailwind CSS for UI, matching existing project components.

## Testing Strategy
- Manually verify the `/profile` route redirects unauthenticated users.
- Verify the JSON export contains only the logged-in user's quizzes.
- Test RLS policies by attempting to fetch another user's quiz ID directly.

## Boundaries
- **Always:** Use the authenticated Supabase client (`createClient` from `@supabase/server`) for database queries in Server Components/Actions.
- **Ask first:** If altering the database schema beyond adding RLS policies.
- **Never:** Perform data fetching on the client-side for this protected data without RLS fully active.

## Success Criteria
1. An unauthenticated user visiting `/profile` is redirected.
2. An authenticated user sees their own quizzes on `/profile`.
3. Clicking "Export" downloads a `quizzes_backup.json` file with their data.
4. RLS policies explicitly restrict `SELECT` access on the quizzes table to `user_id = auth.uid()`.
