-- Crear tabla para configuración de Tailscale por organización
CREATE TABLE public.organization_tailscale_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tailscale_auth_key TEXT NOT NULL,
  tags TEXT[] DEFAULT ARRAY['tag:prod'],
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, tailscale_auth_key)
);

-- Enable RLS
ALTER TABLE public.organization_tailscale_config ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver y gestionar la configuración de Tailscale
CREATE POLICY "Admins can manage tailscale config"
ON public.organization_tailscale_config
FOR ALL
USING (
  organization_id = get_user_org_id(auth.uid()) 
  AND get_user_role(auth.uid()) IN ('org_admin', 'global_admin')
);

-- Agregar columnas adicionales a devices para el flujo de Tailscale
ALTER TABLE public.devices 
ADD COLUMN IF NOT EXISTS tailscale_auth_key TEXT,
ADD COLUMN IF NOT EXISTS tailscale_hostname TEXT,
ADD COLUMN IF NOT EXISTS tailscale_device_id TEXT,
ADD COLUMN IF NOT EXISTS tailscale_ip TEXT,
ADD COLUMN IF NOT EXISTS enrollment_expires_at TIMESTAMP WITH TIME ZONE;

-- Crear índice para búsqueda rápida por enrollment_token
CREATE INDEX IF NOT EXISTS idx_devices_enrollment_token ON public.devices(enrollment_token) WHERE enrollment_token IS NOT NULL;

-- Crear índice para búsqueda por tailscale_device_id
CREATE INDEX IF NOT EXISTS idx_devices_tailscale_device_id ON public.devices(tailscale_device_id) WHERE tailscale_device_id IS NOT NULL;