# Intent: web speed and username sign-in

Confirmed with the owner on 2026-10-09 through an interview. This file is dev-only: it lives in `preview` and local checkouts, not in `main`.

## Statement of intent

- **Outcome:** (1) The list of quizzes created by other users shows 5 random quizzes and appears fast. (2) The login popup opens almost instantly. (3) Users register with email, a username and a password, and afterwards can sign in with the username or the email.
- **User:** web players, both new registrations and people using the old flow.
- **Why now:** after the web2-only update the page opens slowly and the list appears only after a long wait, all at once. The login popup is slow to open too.
- **Success:** the list renders quickly when the page opens, and each page load shows a different set of 5. The login popup appears almost immediately. A newly registered user can sign in again with the username.
- **Constraint:** web2 only (ADR-013). Changes go through `preview`, then a promote PR to `main` once every check is green. A unique username needs a new column and constraint, which is a migration: the migration file is written here, the owner reviews it and applies it on Supabase. No deploys and no migrations are run by the agent.
- **Out of scope:** pagination or "show more", a shuffle button, changing a username after registration, forgotten username, Google sign-in on web, the Flutter app, forcing existing accounts to pick a username.

## Decisions made in the interview

1. Random per page load. No refresh button yet.
2. Exactly 5 items; no system quizzes added on top.
3. Accounts that exist today keep signing in with their email as before.
4. Sign-in accepts the username or the email.
5. Username rule: 3 to 20 characters, lowercase letters, digits and underscore, unique ignoring case.

## Open question

Which screen is "the list of quizzes created by other users"? The home page loads one random question plus the global leaderboard of 50. The topic pages (`/topics/[topic]`) and search page list questions with pagination. The spec lists the candidates and asks the owner to confirm one before the work starts.
