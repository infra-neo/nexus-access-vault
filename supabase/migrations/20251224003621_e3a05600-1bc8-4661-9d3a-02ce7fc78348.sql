-- Create table for Zitadel OIDC configuration per organization
CREATE TABLE public.zitadel_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  issuer_url TEXT NOT NULL, -- e.g., https://gate.kappa4.com
  client_id TEXT NOT NULL,
  client_secret TEXT, -- Encrypted in backend
  redirect_uri TEXT NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['openid', 'profile', 'email', 'groups'],
  api_token TEXT, -- For Zitadel Management API (groups sync)
  sync_groups BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Enable RLS
ALTER TABLE public.zitadel_configurations ENABLE ROW LEVEL SECURITY;

-- Only admins can manage Zitadel configs
CREATE POLICY "Admins can manage Zitadel configs"
ON public.zitadel_configurations FOR ALL
USING (
  organization_id = get_user_org_id(auth.uid())
  AND get_user_role(auth.uid()) = ANY (ARRAY['org_admin'::user_role, 'global_admin'::user_role])
);

-- Table to map Zitadel groups to local groups
CREATE TABLE public.zitadel_group_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zitadel_config_id UUID NOT NULL REFERENCES public.zitadel_configurations(id) ON DELETE CASCADE,
  zitadel_group_id TEXT NOT NULL, -- ID from Zitadel
  zitadel_group_name TEXT NOT NULL,
  local_group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  auto_sync BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(zitadel_config_id, zitadel_group_id)
);

-- Enable RLS
ALTER TABLE public.zitadel_group_mappings ENABLE ROW LEVEL SECURITY;

-- Admins can manage group mappings
CREATE POLICY "Admins can manage group mappings"
ON public.zitadel_group_mappings FOR ALL
USING (
  zitadel_config_id IN (
    SELECT id FROM zitadel_configurations 
    WHERE organization_id = get_user_org_id(auth.uid())
    AND get_user_role(auth.uid()) = ANY (ARRAY['org_admin'::user_role, 'global_admin'::user_role])
  )
);

-- Table to store user's Zitadel identity link
CREATE TABLE public.user_zitadel_identities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  zitadel_config_id UUID NOT NULL REFERENCES public.zitadel_configurations(id) ON DELETE CASCADE,
  zitadel_user_id TEXT NOT NULL, -- Subject from Zitadel
  zitadel_groups TEXT[], -- Groups from Zitadel token
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, zitadel_config_id),
  UNIQUE(zitadel_config_id, zitadel_user_id)
);

-- Enable RLS
ALTER TABLE public.user_zitadel_identities ENABLE ROW LEVEL SECURITY;

-- Users can view their own identity
CREATE POLICY "Users can view own Zitadel identity"
ON public.user_zitadel_identities FOR SELECT
USING (user_id = auth.uid());

-- Admins can manage identities in their org
CREATE POLICY "Admins can manage Zitadel identities"
ON public.user_zitadel_identities FOR ALL
USING (
  zitadel_config_id IN (
    SELECT id FROM zitadel_configurations 
    WHERE organization_id = get_user_org_id(auth.uid())
    AND get_user_role(auth.uid()) = ANY (ARRAY['org_admin'::user_role, 'global_admin'::user_role])
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_zitadel_config_updated_at
BEFORE UPDATE ON public.zitadel_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();