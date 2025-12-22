-- Helper functions for secret management

-- Function to store encrypted secret
CREATE OR REPLACE FUNCTION public.store_encrypted_secret(
  p_org_id UUID,
  p_key_name TEXT,
  p_secret_value TEXT,
  p_secret_type TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_encrypted_value TEXT;
  v_secret_id UUID;
  v_user_role user_role;
BEGIN
  -- Check if user has admin role
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = auth.uid()
  AND organization_id = p_org_id;
  
  IF v_user_role NOT IN ('org_admin', 'global_admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to store secrets';
  END IF;

  -- Encrypt the secret value using pgcrypto
  v_encrypted_value := encode(
    pgp_sym_encrypt(
      p_secret_value,
      current_setting('app.encryption_key', true)
    ),
    'base64'
  );

  -- Insert or update the secret
  INSERT INTO encrypted_secrets (
    organization_id,
    key_name,
    encrypted_value,
    secret_type,
    metadata,
    created_by,
    expires_at
  ) VALUES (
    p_org_id,
    p_key_name,
    v_encrypted_value,
    p_secret_type,
    p_metadata,
    auth.uid(),
    p_expires_at
  )
  ON CONFLICT (organization_id, key_name, secret_type)
  DO UPDATE SET
    encrypted_value = v_encrypted_value,
    metadata = p_metadata,
    expires_at = p_expires_at,
    updated_at = now()
  RETURNING id INTO v_secret_id;

  -- Log the action
  INSERT INTO audit_logs (organization_id, user_id, event, details)
  VALUES (
    p_org_id,
    auth.uid(),
    'secret_stored',
    jsonb_build_object(
      'key_name', p_key_name,
      'secret_type', p_secret_type,
      'secret_id', v_secret_id
    )
  );

  RETURN v_secret_id;
END;
$$;

-- Function to retrieve decrypted secret (admin only)
CREATE OR REPLACE FUNCTION public.get_decrypted_secret(
  p_secret_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_encrypted_value TEXT;
  v_decrypted_value TEXT;
  v_org_id UUID;
  v_user_role user_role;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get secret details
  SELECT 
    encrypted_value,
    organization_id,
    expires_at
  INTO 
    v_encrypted_value,
    v_org_id,
    v_expires_at
  FROM encrypted_secrets
  WHERE id = p_secret_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Secret not found';
  END IF;

  -- Check expiration
  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RAISE EXCEPTION 'Secret has expired';
  END IF;

  -- Check if user has admin role in the organization
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = auth.uid()
  AND organization_id = v_org_id;
  
  IF v_user_role NOT IN ('org_admin', 'global_admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to retrieve secrets';
  END IF;

  -- Decrypt the secret
  v_decrypted_value := pgp_sym_decrypt(
    decode(v_encrypted_value, 'base64'),
    current_setting('app.encryption_key', true)
  );

  -- Log the access
  INSERT INTO audit_logs (organization_id, user_id, event, details)
  VALUES (
    v_org_id,
    auth.uid(),
    'secret_accessed',
    jsonb_build_object('secret_id', p_secret_id)
  );

  RETURN v_decrypted_value;
END;
$$;

-- Function to generate enrollment token
CREATE OR REPLACE FUNCTION public.generate_enrollment_token(
  p_org_id UUID,
  p_user_id UUID,
  p_token_type TEXT,
  p_device_type TEXT DEFAULT NULL,
  p_expires_hours INTEGER DEFAULT 24,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(token_id UUID, token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_token_hash TEXT;
  v_token_id UUID;
  v_user_role user_role;
BEGIN
  -- Check if user has permission
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = auth.uid()
  AND organization_id = p_org_id;
  
  IF v_user_role NOT IN ('org_admin', 'global_admin', 'support') THEN
    RAISE EXCEPTION 'Insufficient permissions to generate enrollment tokens';
  END IF;

  -- Generate a secure random token
  v_token := encode(gen_random_bytes(32), 'base64');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  -- Insert the token
  INSERT INTO enrollment_tokens (
    organization_id,
    user_id,
    token_hash,
    token_type,
    device_type,
    expires_at,
    metadata
  ) VALUES (
    p_org_id,
    p_user_id,
    v_token_hash,
    p_token_type,
    p_device_type,
    now() + (p_expires_hours || ' hours')::interval,
    p_metadata
  )
  RETURNING id INTO v_token_id;

  -- Log the action
  INSERT INTO audit_logs (organization_id, user_id, event, details)
  VALUES (
    p_org_id,
    auth.uid(),
    'enrollment_token_generated',
    jsonb_build_object(
      'token_id', v_token_id,
      'token_type', p_token_type,
      'for_user_id', p_user_id
    )
  );

  RETURN QUERY SELECT v_token_id, v_token;
END;
$$;

-- Function to validate enrollment token
CREATE OR REPLACE FUNCTION public.validate_enrollment_token(
  p_token TEXT,
  p_token_type TEXT
)
RETURNS TABLE(
  is_valid BOOLEAN,
  token_id UUID,
  user_id UUID,
  organization_id UUID,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_hash TEXT;
  v_token_data RECORD;
BEGIN
  -- Hash the provided token
  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  -- Find the token
  SELECT 
    et.id,
    et.user_id,
    et.organization_id,
    et.expires_at,
    et.used_at,
    et.revoked_at,
    et.metadata
  INTO v_token_data
  FROM enrollment_tokens et
  WHERE et.token_hash = v_token_hash
  AND et.token_type = p_token_type;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::UUID, NULL::JSONB;
    RETURN;
  END IF;

  -- Check if token is expired, used, or revoked
  IF v_token_data.expires_at < now() OR
     v_token_data.used_at IS NOT NULL OR
     v_token_data.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::UUID, NULL::JSONB;
    RETURN;
  END IF;

  -- Token is valid
  RETURN QUERY SELECT 
    true,
    v_token_data.id,
    v_token_data.user_id,
    v_token_data.organization_id,
    v_token_data.metadata;
END;
$$;

-- Function to mark token as used
CREATE OR REPLACE FUNCTION public.mark_token_used(
  p_token_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE enrollment_tokens
  SET used_at = now()
  WHERE id = p_token_id
  AND used_at IS NULL
  AND revoked_at IS NULL
  AND expires_at > now();

  RETURN FOUND;
END;
$$;

-- Function to create Tailscale API key for organization
CREATE OR REPLACE FUNCTION public.create_tailscale_integration(
  p_org_id UUID,
  p_tailnet TEXT,
  p_api_key TEXT,
  p_organization_tag TEXT,
  p_acl_config JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret_id UUID;
  v_integration_id UUID;
BEGIN
  -- Store the API key securely
  v_secret_id := store_encrypted_secret(
    p_org_id,
    'tailscale_api_key',
    p_api_key,
    'api_key',
    jsonb_build_object('service', 'tailscale', 'tailnet', p_tailnet)
  );

  -- Create the integration record
  INSERT INTO tailscale_organizations (
    organization_id,
    tailnet,
    api_key_ref,
    organization_tag,
    acl_config
  ) VALUES (
    p_org_id,
    p_tailnet,
    v_secret_id,
    p_organization_tag,
    p_acl_config
  )
  RETURNING id INTO v_integration_id;

  RETURN v_integration_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.store_encrypted_secret TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_decrypted_secret TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_enrollment_token TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_enrollment_token TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_token_used TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_tailscale_integration TO authenticated;
