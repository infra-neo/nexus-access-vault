-- Fix remaining RLS policies that still query profiles directly (causing recursion)

-- Cloud Providers
DROP POLICY IF EXISTS "Admins can manage cloud providers" ON public.cloud_providers;
CREATE POLICY "Admins can manage cloud providers"
ON public.cloud_providers FOR ALL
USING (
  organization_id = public.get_user_org_id(auth.uid())
  AND public.get_user_role(auth.uid()) IN ('org_admin', 'global_admin')
);

-- Hypervisors
DROP POLICY IF EXISTS "Admins can manage hypervisors" ON public.hypervisors;
CREATE POLICY "Admins can manage hypervisors"
ON public.hypervisors FOR ALL
USING (
  organization_id = public.get_user_org_id(auth.uid())
  AND public.get_user_role(auth.uid()) IN ('org_admin', 'global_admin')
);

-- LDAP Configurations
DROP POLICY IF EXISTS "Admins can manage LDAP configs" ON public.ldap_configurations;
CREATE POLICY "Admins can manage LDAP configs"
ON public.ldap_configurations FOR ALL
USING (
  organization_id = public.get_user_org_id(auth.uid())
  AND public.get_user_role(auth.uid()) IN ('org_admin', 'global_admin')
);

-- Headscale Instances
DROP POLICY IF EXISTS "Admins can manage headscale instances" ON public.headscale_instances;
CREATE POLICY "Admins can manage headscale instances"
ON public.headscale_instances FOR ALL
USING (
  organization_id = public.get_user_org_id(auth.uid())
  AND public.get_user_role(auth.uid()) IN ('org_admin', 'global_admin')
);

-- Authentik Configurations
DROP POLICY IF EXISTS "Admins can manage Authentik configs" ON public.authentik_configurations;
DROP POLICY IF EXISTS "Users can view Authentik configs in their org" ON public.authentik_configurations;
DROP POLICY IF EXISTS "Only admins can view authentik configurations" ON public.authentik_configurations;

CREATE POLICY "Admins can manage Authentik configs"
ON public.authentik_configurations FOR ALL
USING (
  organization_id = public.get_user_org_id(auth.uid())
  AND public.get_user_role(auth.uid()) IN ('org_admin', 'global_admin')
);

CREATE POLICY "Only admins can view authentik configurations"
ON public.authentik_configurations FOR SELECT
USING (
  organization_id = public.get_user_org_id(auth.uid())
  AND public.get_user_role(auth.uid()) IN ('org_admin', 'global_admin')
);

-- Groups
DROP POLICY IF EXISTS "Admins can manage groups in their org" ON public.groups;
DROP POLICY IF EXISTS "Users can view groups in their org" ON public.groups;

CREATE POLICY "Admins can manage groups in their org"
ON public.groups FOR ALL
USING (
  organization_id = public.get_user_org_id(auth.uid())
  AND public.get_user_role(auth.uid()) IN ('org_admin', 'global_admin')
);

CREATE POLICY "Users can view groups in their org"
ON public.groups FOR SELECT
USING (organization_id = public.get_user_org_id(auth.uid()));

-- Resources
DROP POLICY IF EXISTS "Org admins can manage resources in their org" ON public.resources;
DROP POLICY IF EXISTS "Users can view resources in their organization" ON public.resources;

CREATE POLICY "Org admins can manage resources in their org"
ON public.resources FOR ALL
USING (
  organization_id = public.get_user_org_id(auth.uid())
  AND public.get_user_role(auth.uid()) IN ('org_admin', 'global_admin')
);

CREATE POLICY "Users can view resources in their organization"
ON public.resources FOR SELECT
USING (
  organization_id = public.get_user_org_id(auth.uid())
  OR public.get_user_role(auth.uid()) = 'global_admin'
);

-- Audit Logs
DROP POLICY IF EXISTS "Admins can view audit logs in their org" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs in their org"
ON public.audit_logs FOR SELECT
USING (
  organization_id = public.get_user_org_id(auth.uid())
  AND public.get_user_role(auth.uid()) IN ('org_admin', 'support', 'global_admin')
  OR public.get_user_role(auth.uid()) = 'global_admin'
);

-- Organizations
DROP POLICY IF EXISTS "Global admins can view all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Global admins can insert organizations" ON public.organizations;

CREATE POLICY "Global admins can view all organizations"
ON public.organizations FOR SELECT
USING (public.get_user_role(auth.uid()) = 'global_admin');

CREATE POLICY "Users can view their own organization"
ON public.organizations FOR SELECT
USING (id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Global admins can insert organizations"
ON public.organizations FOR INSERT
WITH CHECK (public.get_user_role(auth.uid()) = 'global_admin');