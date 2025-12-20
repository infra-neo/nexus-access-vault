-- Create policies table for dynamic Zero Trust policies
CREATE TABLE IF NOT EXISTS public.policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  policy_type TEXT NOT NULL DEFAULT 'access',
  status TEXT NOT NULL DEFAULT 'draft',
  conditions JSONB DEFAULT '[]'::jsonb,
  applies_to INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

-- Create policies for admins
CREATE POLICY "Admins can manage policies in their org" 
ON public.policies 
FOR ALL 
USING (
  (organization_id = get_user_org_id(auth.uid())) 
  AND (get_user_role(auth.uid()) = ANY (ARRAY['org_admin'::user_role, 'global_admin'::user_role]))
);

CREATE POLICY "Users can view policies in their org" 
ON public.policies 
FOR SELECT 
USING (organization_id = get_user_org_id(auth.uid()));

-- Create role_permissions table to map roles to permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role, permission_id)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Everyone can view role_permissions
CREATE POLICY "All users can view role permissions" 
ON public.role_permissions 
FOR SELECT 
USING (true);

-- Only global admins can manage role_permissions
CREATE POLICY "Global admins can manage role permissions" 
ON public.role_permissions 
FOR ALL 
USING (get_user_role(auth.uid()) = 'global_admin'::user_role);

-- Create user_groups table for group membership
CREATE TABLE IF NOT EXISTS public.user_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, group_id)
);

-- Enable RLS
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;

-- Admins can manage user groups in their org
CREATE POLICY "Admins can manage user groups" 
ON public.user_groups 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles p1
    JOIN profiles p2 ON p1.organization_id = p2.organization_id
    WHERE p1.id = auth.uid() 
    AND p2.id = user_groups.user_id
    AND p1.role = ANY (ARRAY['org_admin'::user_role, 'global_admin'::user_role])
  )
);

-- Users can view their own group memberships
CREATE POLICY "Users can view their group memberships" 
ON public.user_groups 
FOR SELECT 
USING (user_id = auth.uid());

-- Add trigger for policies updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_policies_updated_at
BEFORE UPDATE ON public.policies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();