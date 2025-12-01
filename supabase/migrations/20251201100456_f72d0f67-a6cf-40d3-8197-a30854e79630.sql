-- Create devices table for device enrollment
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'laptop',
  os TEXT,
  fingerprint TEXT UNIQUE,
  enrollment_token TEXT UNIQUE,
  enrolled_at TIMESTAMP WITH TIME ZONE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  location TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  trust_level TEXT NOT NULL DEFAULT 'low',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Users can view their own devices
CREATE POLICY "Users can view their own devices"
ON public.devices
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own devices
CREATE POLICY "Users can insert their own devices"
ON public.devices
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own devices
CREATE POLICY "Users can update their own devices"
ON public.devices
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own devices
CREATE POLICY "Users can delete their own devices"
ON public.devices
FOR DELETE
USING (user_id = auth.uid());

-- Admins can view all devices in their org
CREATE POLICY "Admins can view devices in their org"
ON public.devices
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid() AND role IN ('org_admin', 'global_admin')
  )
);

-- Create device_events table for tracking
CREATE TABLE IF NOT EXISTS public.device_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on device_events
ALTER TABLE public.device_events ENABLE ROW LEVEL SECURITY;

-- Users can view events for their devices
CREATE POLICY "Users can view their device events"
ON public.device_events
FOR SELECT
USING (
  device_id IN (
    SELECT id FROM devices WHERE user_id = auth.uid()
  )
);

-- System can insert device events
CREATE POLICY "System can insert device events"
ON public.device_events
FOR INSERT
WITH CHECK (true);