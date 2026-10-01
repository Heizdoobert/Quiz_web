# docs/intent/profile-dashboard.md
lines:8 exports:
---
# Intent: Profile Dashboard and Quiz Export

- **Outcome:**      A Profile dashboard where users can view, manage, and export their created quizzes as backup files.
- **User:**         Authenticated quiz creators.
- **Why now:**      The app currently lacks a protected area for users to manage their own content and export it.
- **Success:**      A user can log in, see a list of only their quizzes (matching the existing UI design), and download them as a backup file (like JSON or CSV).
- **Constraint:**   Strict security (Row Level Security and API protection) must be implemented so no one can access or export another user's data.
- **Out of scope:** Infrastructure-level database backups, public user profiles, or complex analytics dashboards.
