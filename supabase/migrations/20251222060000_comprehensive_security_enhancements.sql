-- Enable pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create table for storing encrypted secrets
CREATE TABLE IF NOT EXISTS public.encrypted_secrets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  secret_type TEXT NOT NULL, -- 'api_key', 'token', 'password', 'certificate'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(organization_id, key_name, secret_type)
);

-- Enable RLS
ALTER TABLE public.encrypted_secrets ENABLE ROW LEVEL SECURITY;

-- Only admins can manage secrets
CREATE POLICY "Admins can manage encrypted secrets" 
ON public.encrypted_secrets 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND organization_id = encrypted_secrets.organization_id
    AND role = ANY (ARRAY['org_admin'::user_role, 'global_admin'::user_role])
  )
);

-- Create Zitadel integration table
CREATE TABLE IF NOT EXISTS public.zitadel_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL UNIQUE,
  project_name TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_secret_ref UUID REFERENCES public.encrypted_secrets(id),
  oidc_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.zitadel_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage zitadel projects" 
ON public.zitadel_projects 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND organization_id = zitadel_projects.organization_id
    AND role = ANY (ARRAY['org_admin'::user_role, 'global_admin'::user_role])
  )
);

-- Create Tailscale integration table
CREATE TABLE IF NOT EXISTS public.tailscale_organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  tailnet TEXT NOT NULL,
  api_key_ref UUID REFERENCES public.encrypted_secrets(id),
  organization_tag TEXT,
  acl_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tailscale_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tailscale orgs" 
ON public.tailscale_organizations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND organization_id = tailscale_organizations.organization_id
    AND role = ANY (ARRAY['org_admin'::user_role, 'global_admin'::user_role])
  )
);

-- Create enrollment tokens table
CREATE TABLE IF NOT EXISTS public.enrollment_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  token_type TEXT NOT NULL, -- 'tailscale', 'device', 'invitation'
  device_type TEXT, -- 'windows', 'linux', 'macos', 'mobile'
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.enrollment_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tokens" 
ON public.enrollment_tokens 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage enrollment tokens" 
ON public.enrollment_tokens 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND organization_id = enrollment_tokens.organization_id
    AND role = ANY (ARRAY['org_admin'::user_role, 'global_admin'::user_role, 'support'::user_role])
  )
);

-- Create Pomerium policies table
CREATE TABLE IF NOT EXISTS public.pomerium_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  policy_name TEXT NOT NULL,
  from_url TEXT NOT NULL,
  to_url TEXT NOT NULL,
  allowed_users TEXT[],
  allowed_groups TEXT[],
  policy_config JSONB DEFAULT '{}'::jsonb,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, from_url)
);

-- Enable RLS
ALTER TABLE public.pomerium_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pomerium policies" 
ON public.pomerium_policies 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND organization_id = pomerium_policies.organization_id
    AND role = ANY (ARRAY['org_admin'::user_role, 'global_admin'::user_role])
  )
);

-- Create invitation emails table
CREATE TABLE IF NOT EXISTS public.invitation_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invitation_token UUID NOT NULL REFERENCES public.enrollment_tokens(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invitation_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invitations" 
ON public.invitation_emails 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND organization_id = invitation_emails.organization_id
    AND role = ANY (ARRAY['org_admin'::user_role, 'global_admin'::user_role])
  )
);

-- Create cloud providers table
CREATE TABLE IF NOT EXISTS public.cloud_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL, -- 'gcp', 'lxd', 'aws', 'azure'
  provider_name TEXT NOT NULL,
  credentials_ref UUID REFERENCES public.encrypted_secrets(id),
  config JSONB DEFAULT '{}'::jsonb,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, provider_type, provider_name)
);

-- Enable RLS
ALTER TABLE public.cloud_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cloud providers" 
ON public.cloud_providers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND organization_id = cloud_providers.organization_id
    AND role = ANY (ARRAY['org_admin'::user_role, 'global_admin'::user_role])
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_encrypted_secrets_updated_at
BEFORE UPDATE ON public.encrypted_secrets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_zitadel_projects_updated_at
BEFORE UPDATE ON public.zitadel_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tailscale_organizations_updated_at
BEFORE UPDATE ON public.tailscale_organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pomerium_policies_updated_at
BEFORE UPDATE ON public.pomerium_policies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cloud_providers_updated_at
BEFORE UPDATE ON public.cloud_providers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_encrypted_secrets_org ON public.encrypted_secrets(organization_id);
CREATE INDEX idx_zitadel_projects_org ON public.zitadel_projects(organization_id);
CREATE INDEX idx_tailscale_orgs_org ON public.tailscale_organizations(organization_id);
CREATE INDEX idx_enrollment_tokens_user ON public.enrollment_tokens(user_id);
CREATE INDEX idx_enrollment_tokens_org ON public.enrollment_tokens(organization_id);
CREATE INDEX idx_pomerium_policies_org ON public.pomerium_policies(organization_id);
CREATE INDEX idx_invitation_emails_email ON public.invitation_emails(email);
CREATE INDEX idx_cloud_providers_org ON public.cloud_providers(organization_id);
