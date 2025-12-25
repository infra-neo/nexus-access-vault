-- Add project_id column to zitadel_configurations for targeting specific Zitadel projects
ALTER TABLE public.zitadel_configurations 
ADD COLUMN IF NOT EXISTS project_id text;