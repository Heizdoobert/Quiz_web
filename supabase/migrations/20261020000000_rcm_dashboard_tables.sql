-- Migration: 20261020000000_rcm_dashboard_tables.sql
-- This migration creates the tables needed for the RCM dashboard and defines basic Row‑Level Security (RLS) policies.

-- ------------------------------------------------------------
-- Roles table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

-- ------------------------------------------------------------
-- User‑Roles junction table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- ------------------------------------------------------------
-- Systems table (the resources displayed on the RCM page)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,               -- e.g. 'web_server', 'ci_pipeline', 'seo_crawler', 'marketing_campaign'
  status jsonb DEFAULT '{}'::jsonb,
  last_updated timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Actions table (records of control actions performed by users)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid REFERENCES public.systems(id) ON DELETE CASCADE,
  action_type text NOT NULL,        -- e.g. 'restart', 'stop', 'start'
  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Audit logs table (general audit trail)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Enable Row‑Level Security (RLS) on all tables
-- ------------------------------------------------------------
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- RLS Policies
-- ------------------------------------------------------------
-- Roles: only admins (or a role named 'admin') can read/write roles.
CREATE POLICY "admin_select_roles" ON public.roles FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_insert_roles" ON public.roles FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_update_roles" ON public.roles FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin') WITH CHECK (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_delete_roles" ON public.roles FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- User_Roles: admins can manage all; users can read their own rows.
CREATE POLICY "admin_user_roles" ON public.user_roles FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "self_user_roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "self_insert_user_roles" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Systems: all authenticated users can read; admins can insert/update/delete.
CREATE POLICY "auth_read_systems" ON public.systems FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_modify_systems" ON public.systems FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Actions: users can insert their own actions; admins can read all.
CREATE POLICY "self_insert_actions" ON public.actions FOR INSERT WITH CHECK (auth.uid() = performed_by);
CREATE POLICY "admin_select_actions" ON public.actions FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Audit Logs: users can insert their own logs; admins can read all.
CREATE POLICY "self_insert_audit" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin_select_audit" ON public.audit_logs FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- ------------------------------------------------------------
-- Grant usage to the anon and service_role roles (required for Supabase to execute policies)
-- ------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, service_role;
