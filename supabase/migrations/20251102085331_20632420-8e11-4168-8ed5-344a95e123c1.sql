-- Create user_roles table (separate from profiles for security)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  ldap_dn TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create cloud_providers table
CREATE TABLE IF NOT EXISTS public.cloud_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL,
  api_endpoint TEXT,
  credentials JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create hypervisors table
CREATE TABLE IF NOT EXISTS public.hypervisors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hypervisor_type TEXT NOT NULL,
  api_endpoint TEXT NOT NULL,
  credentials JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create headscale_instances table
CREATE TABLE IF NOT EXISTS public.headscale_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  api_endpoint TEXT NOT NULL,
  api_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create headscale_nodes table
CREATE TABLE IF NOT EXISTS public.headscale_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headscale_instance_id UUID NOT NULL REFERENCES public.headscale_instances(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  name TEXT NOT NULL,
  user_email TEXT,
  ip_address TEXT,
  status TEXT DEFAULT 'active',
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create ldap_configurations table
CREATE TABLE IF NOT EXISTS public.ldap_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  server_url TEXT NOT NULL,
  bind_dn TEXT,
  base_dn TEXT NOT NULL,
  credentials JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create authentik_configurations table
CREATE TABLE IF NOT EXISTS public.authentik_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  api_endpoint TEXT NOT NULL,
  api_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create resource_permissions table (for drag-drop access control)
CREATE TABLE IF NOT EXISTS public.resource_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL, -- 'user', 'role', 'group'
  subject_id UUID NOT NULL,
  permission_level TEXT NOT NULL, -- 'read', 'write', 'admin'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(resource_id, subject_type, subject_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hypervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.headscale_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.headscale_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ldap_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authentik_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles in their org" ON public.user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
      WHERE p1.id = auth.uid() 
      AND p2.id = user_roles.user_id
      AND p1.role IN ('org_admin', 'global_admin')
    )
  );

-- RLS Policies for groups
CREATE POLICY "Users can view groups in their org" ON public.groups
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage groups in their org" ON public.groups
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('org_admin', 'global_admin')
    )
  );

-- RLS Policies for cloud_providers
CREATE POLICY "Users can view cloud providers in their org" ON public.cloud_providers
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage cloud providers" ON public.cloud_providers
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('org_admin', 'global_admin')
    )
  );

-- RLS Policies for hypervisors
CREATE POLICY "Users can view hypervisors in their org" ON public.hypervisors
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage hypervisors" ON public.hypervisors
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('org_admin', 'global_admin')
    )
  );

-- RLS Policies for headscale_instances
CREATE POLICY "Users can view headscale instances in their org" ON public.headscale_instances
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage headscale instances" ON public.headscale_instances
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('org_admin', 'global_admin')
    )
  );

-- RLS Policies for headscale_nodes
CREATE POLICY "Users can view headscale nodes in their org" ON public.headscale_nodes
  FOR SELECT USING (
    headscale_instance_id IN (
      SELECT id FROM public.headscale_instances 
      WHERE organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage headscale nodes" ON public.headscale_nodes
  FOR ALL USING (
    headscale_instance_id IN (
      SELECT id FROM public.headscale_instances 
      WHERE organization_id IN (
        SELECT organization_id FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('org_admin', 'global_admin')
      )
    )
  );

-- RLS Policies for ldap_configurations
CREATE POLICY "Users can view LDAP configs in their org" ON public.ldap_configurations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage LDAP configs" ON public.ldap_configurations
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('org_admin', 'global_admin')
    )
  );

-- RLS Policies for authentik_configurations
CREATE POLICY "Users can view Authentik configs in their org" ON public.authentik_configurations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage Authentik configs" ON public.authentik_configurations
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('org_admin', 'global_admin')
    )
  );

-- RLS Policies for resource_permissions
CREATE POLICY "Users can view resource permissions in their org" ON public.resource_permissions
  FOR SELECT USING (
    resource_id IN (
      SELECT id FROM public.resources 
      WHERE organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage resource permissions" ON public.resource_permissions
  FOR ALL USING (
    resource_id IN (
      SELECT id FROM public.resources 
      WHERE organization_id IN (
        SELECT organization_id FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('org_admin', 'global_admin')
      )
    )
  );

-- Global permissions viewable by all authenticated users
CREATE POLICY "All users can view permissions" ON public.permissions
  FOR SELECT TO authenticated USING (true);