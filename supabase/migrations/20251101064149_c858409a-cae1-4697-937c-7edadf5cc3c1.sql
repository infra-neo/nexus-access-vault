-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('global_admin', 'org_admin', 'support', 'user');

-- Create enum for resource types
CREATE TYPE public.resource_type AS ENUM ('windows_vm', 'linux_vm', 'rdp', 'ssh', 'guacamole_session', 'tsplus_html5', 'tailscale_node', 'custom');

-- Create enum for access status
CREATE TYPE public.access_status AS ENUM ('pending', 'active', 'revoked');

-- Organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Profiles table (extends auth.users with org info)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role public.user_role DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Resources table
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  resource_type public.resource_type NOT NULL,
  ip_address TEXT,
  connection_method TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on resources
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- User resource access table
CREATE TABLE public.user_resource_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  status public.access_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activated_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, resource_id)
);

-- Enable RLS on user_resource_access
ALTER TABLE public.user_resource_access ENABLE ROW LEVEL SECURITY;

-- Audit logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user')
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for organizations
CREATE POLICY "Global admins can view all organizations"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'global_admin'
    )
  );

CREATE POLICY "Users can view their own organization"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.organization_id = organizations.id
    )
  );

CREATE POLICY "Global admins can insert organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'global_admin'
    )
  );

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their organization"
  ON public.profiles FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'global_admin'
    )
  );

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Org admins can update profiles in their org"
  ON public.profiles FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('org_admin', 'global_admin')
    )
  );

-- RLS Policies for resources
CREATE POLICY "Users can view resources in their organization"
  ON public.resources FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'global_admin'
    )
  );

CREATE POLICY "Org admins can manage resources in their org"
  ON public.resources FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('org_admin', 'global_admin')
    )
  );

-- RLS Policies for user_resource_access
CREATE POLICY "Users can view their own access"
  ON public.user_resource_access FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all access in their org"
  ON public.user_resource_access FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
      WHERE p1.id = auth.uid()
      AND p2.id = user_resource_access.user_id
      AND p1.role IN ('org_admin', 'support', 'global_admin')
    )
  );

CREATE POLICY "Admins can manage access in their org"
  ON public.user_resource_access FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
      WHERE p1.id = auth.uid()
      AND p2.id = user_resource_access.user_id
      AND p1.role IN ('org_admin', 'global_admin')
    )
  );

-- RLS Policies for audit_logs
CREATE POLICY "Admins can view audit logs in their org"
  ON public.audit_logs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('org_admin', 'support', 'global_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'global_admin'
    )
  );

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_resources_organization_id ON public.resources(organization_id);
CREATE INDEX idx_user_resource_access_user_id ON public.user_resource_access(user_id);
CREATE INDEX idx_user_resource_access_resource_id ON public.user_resource_access(resource_id);
CREATE INDEX idx_audit_logs_organization_id ON public.audit_logs(organization_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);