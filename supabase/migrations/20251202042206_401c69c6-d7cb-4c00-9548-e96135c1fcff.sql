-- Fix 1: Remove privilege escalation in handle_new_user trigger
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    'user'::user_role  -- Always 'user', never from metadata
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fix 2: Create security definer functions to break RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM profiles WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = _user_id
$$;

-- Fix 3: Update profiles RLS policies to use security definer functions
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Org admins can update profiles in their org" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view profiles in their organization"
ON public.profiles FOR SELECT
USING (
  organization_id = public.get_user_org_id(auth.uid())
  OR public.get_user_role(auth.uid()) = 'global_admin'
);

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Org admins can update profiles in their org"
ON public.profiles FOR UPDATE
USING (
  public.get_user_role(auth.uid()) IN ('org_admin', 'global_admin')
  AND organization_id = public.get_user_org_id(auth.uid())
);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid());

-- Fix 4: Restrict credential tables to admins only
DROP POLICY IF EXISTS "Users can view cloud providers in their org" ON public.cloud_providers;
DROP POLICY IF EXISTS "Users can view hypervisors in their org" ON public.hypervisors;
DROP POLICY IF EXISTS "Users can view LDAP configurations in their org" ON public.ldap_configurations;
DROP POLICY IF EXISTS "Users can view headscale instances in their org" ON public.headscale_instances;
DROP POLICY IF EXISTS "Users can view authentik configurations in their org" ON public.authentik_configurations;

CREATE POLICY "Only admins can view cloud providers"
ON public.cloud_providers FOR SELECT
USING (
  organization_id = public.get_user_org_id(auth.uid())
  AND public.get_user_role(auth.uid()) IN ('org_admin', 'global_admin')
);

CREATE POLICY "Only admins can view hypervisors"
ON public.hypervisors FOR SELECT
USING (
  organization_id = public.get_user_org_id(auth.uid())
  AND public.get_user_role(auth.uid()) IN ('org_admin', 'global_admin')
);

CREATE POLICY "Only admins can view LDAP configurations"
ON public.ldap_configurations FOR SELECT
USING (
  organization_id = public.get_user_org_id(auth.uid())
  AND public.get_user_role(auth.uid()) IN ('org_admin', 'global_admin')
);

CREATE POLICY "Only admins can view headscale instances"
ON public.headscale_instances FOR SELECT
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