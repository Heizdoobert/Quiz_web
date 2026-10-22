# RCM Page – Specification

## Overview
The **RCM page** is a single‑page web dashboard built with Next.js (React) that provides real‑time visibility and control over the following systems:
- Web servers
- CI/CD pipelines
- SEO crawlers
- Marketing campaign tools

All data is stored in Supabase (PostgreSQL) and synchronized in real time via Supabase's Realtime feature. Authentication and role‑based access control (RBAC) are also handled by Supabase Auth.

## Functional Requirements
| ID | Requirement | Description |
|----|-------------|-------------|
| FR‑1 | Real‑time status view | Display current status (health, metrics, last run) for each system, updating instantly via Supabase Realtime. |
| FR‑2 | Control actions | Allow authorized users to start/stop/restart services, trigger CI builds, refresh SEO crawls, and launch/stop marketing campaigns. |
| FR‑3 | Role‑based UI | Show/hide controls and data based on user role (Dev, DevOps, SEO, QA, Marketing, Admin). |
| FR‑4 | Auditing | Log every action (who, what, when) to a Supabase `audit_logs` table. |
| FR‑5 | Performance | Initial page load ≤ 2 seconds; subsequent UI updates ≤ 200 ms latency. |
| FR‑6 | Accessibility | WCAG 2.1 AA compliance (keyboard navigation, ARIA labels, color contrast). |

## Non‑Functional Requirements
- **Tech Stack**: Next.js 14 (app router), TypeScript, Tailwind CSS, Supabase JS client.
- **Security**: Use Supabase RLS policies for data protection; HTTPS only.
- **Scalability**: Design UI to handle up to 200 simultaneous connections.
- **Maintainability**: Component‑based architecture with clear separation of concerns.

## Data Model (Supabase)
```sql
-- users (provided by Supabase Auth)
create table roles (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null
);

create table user_roles (
  user_id uuid references auth.users(id),
  role_id uuid references roles(id),
  primary key (user_id, role_id)
);

create table systems (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null,   -- e.g., "web_server", "ci_pipeline", "seo_crawler", "marketing_campaign"
  status jsonb,        -- arbitrary status payload
  last_updated timestamptz default now()
);

create table actions (
  id uuid primary key default uuid_generate_v4(),
  system_id uuid references systems(id),
  action_type text not null,   -- e.g., "restart", "trigger_build"
  performed_by uuid references auth.users(id),
  performed_at timestamptz default now(),
  result jsonb
);

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  action text not null,
  details jsonb,
  created_at timestamptz default now()
);
```

## API Endpoints (Next.js Server Actions)
- `GET /api/systems` – returns list of systems with current status (protected, RLS filters based on role).
- `POST /api/systems/:id/action` – executes a control action; validates role permissions.
- `GET /api/roles` – fetches role definitions (admin only).
- `POST /api/auth/logout` – sign‑out.

## UI Component Sketch
- **Header** – shows app name, user avatar, logout.
- **Sidebar** – navigation (Dashboard, Settings, Audit Log).
- **SystemCard** – displays status, action buttons (conditional per role).
- **AuditLogPanel** – tabular view of recent actions (admin only).

## Security & RBAC
- Supabase Row‑Level Security (RLS) policies enforce per‑role visibility.
- Admin (super‑admin) role bypasses RLS and can see all rows.
- Front‑end checks hide UI elements for unauthorized actions.

## Deployment
- Deploy via Vercel (or Netlify) with environment variables for Supabase URL and anon/key.
- CI pipeline (GitHub Actions) runs `npm test` and lint on pull requests.

---
*This spec is ready for review before moving to implementation.*