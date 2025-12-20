-- Add 'web_app' and 'direct' to resource_type enum
ALTER TYPE resource_type ADD VALUE IF NOT EXISTS 'web_app';
ALTER TYPE resource_type ADD VALUE IF NOT EXISTS 'direct';