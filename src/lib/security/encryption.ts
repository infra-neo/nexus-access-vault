/**
 * Security utilities for encryption and secret management
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Generate a secure random token
 */
export const generateSecureToken = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Hash a token using SHA-256
 */
export const hashToken = async (token: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Store an encrypted secret in the database
 */
export const storeEncryptedSecret = async (
  organizationId: string,
  keyName: string,
  secretValue: string,
  secretType: 'api_key' | 'token' | 'password' | 'certificate',
  metadata: Record<string, any> = {},
  expiresAt?: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.rpc('store_encrypted_secret', {
      p_org_id: organizationId,
      p_key_name: keyName,
      p_secret_value: secretValue,
      p_secret_type: secretType,
      p_metadata: metadata,
      p_expires_at: expiresAt || null
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error storing encrypted secret:', error);
    throw error;
  }
};

/**
 * Retrieve a decrypted secret from the database (admin only)
 */
export const getDecryptedSecret = async (secretId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.rpc('get_decrypted_secret', {
      p_secret_id: secretId
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error retrieving decrypted secret:', error);
    throw error;
  }
};

/**
 * Generate an enrollment token
 */
export const generateEnrollmentToken = async (
  organizationId: string,
  userId: string,
  tokenType: 'tailscale' | 'device' | 'invitation',
  deviceType?: 'windows' | 'linux' | 'macos' | 'mobile',
  expiresHours: number = 24,
  metadata: Record<string, any> = {}
): Promise<{ tokenId: string; token: string } | null> => {
  try {
    const { data, error } = await supabase.rpc('generate_enrollment_token', {
      p_org_id: organizationId,
      p_user_id: userId,
      p_token_type: tokenType,
      p_device_type: deviceType || null,
      p_expires_hours: expiresHours,
      p_metadata: metadata
    });

    if (error) throw error;
    return data && data.length > 0 ? {
      tokenId: data[0].token_id,
      token: data[0].token
    } : null;
  } catch (error) {
    console.error('Error generating enrollment token:', error);
    throw error;
  }
};

/**
 * Validate an enrollment token
 */
export const validateEnrollmentToken = async (
  token: string,
  tokenType: 'tailscale' | 'device' | 'invitation'
): Promise<{
  isValid: boolean;
  tokenId?: string;
  userId?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
} | null> => {
  try {
    const { data, error } = await supabase.rpc('validate_enrollment_token', {
      p_token: token,
      p_token_type: tokenType
    });

    if (error) throw error;
    return data && data.length > 0 ? {
      isValid: data[0].is_valid,
      tokenId: data[0].token_id,
      userId: data[0].user_id,
      organizationId: data[0].organization_id,
      metadata: data[0].metadata
    } : null;
  } catch (error) {
    console.error('Error validating enrollment token:', error);
    throw error;
  }
};

/**
 * Mark a token as used
 */
export const markTokenUsed = async (tokenId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('mark_token_used', {
      p_token_id: tokenId
    });

    if (error) throw error;
    return data === true;
  } catch (error) {
    console.error('Error marking token as used:', error);
    return false;
  }
};

/**
 * Sanitize input to prevent XSS attacks
 */
export const sanitizeInput = (input: string): string => {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Generate a strong password
 */
export const generateStrongPassword = (length: number = 16): string => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => charset[byte % charset.length]).join('');
};

/**
 * Validate password strength
 */
export const validatePasswordStrength = (password: string): {
  isStrong: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isStrong: errors.length === 0,
    errors
  };
};
