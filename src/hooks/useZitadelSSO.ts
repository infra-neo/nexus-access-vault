import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ZitadelConfig {
  id: string;
  name: string;
  issuer_url: string;
  organization_id: string;
}

export function useZitadelSSO() {
  const [loading, setLoading] = useState(false);
  const [availableConfigs, setAvailableConfigs] = useState<ZitadelConfig[]>([]);
  const { toast } = useToast();

  // Fetch available Zitadel configurations for SSO
  const fetchAvailableConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('zitadel_configurations')
        .select('id, name, issuer_url, organization_id')
        .eq('is_active', true);

      if (error) throw error;
      setAvailableConfigs(data || []);
      return data || [];
    } catch (error: any) {
      console.error('Failed to fetch Zitadel configs:', error);
      return [];
    }
  };

  // Generate PKCE code verifier and challenge
  const generatePKCE = async () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const codeVerifier = btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return { codeVerifier, codeChallenge };
  };

  // Initiate SSO login
  const initiateSSO = async (configId: string) => {
    setLoading(true);
    try {
      // Get auth URL from edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zitadel-api?action=get-auth-url`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ configId }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to initiate SSO');
      }

      // Store state for callback verification
      sessionStorage.setItem('zitadel_state', result.state);
      sessionStorage.setItem('zitadel_nonce', result.nonce);
      sessionStorage.setItem('zitadel_config_id', configId);

      // Redirect to Zitadel authorization endpoint
      window.location.href = result.authUrl;

    } catch (error: any) {
      console.error('SSO initiation error:', error);
      toast({
        title: 'SSO Error',
        description: error.message || 'Failed to initiate SSO login',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return {
    loading,
    availableConfigs,
    fetchAvailableConfigs,
    initiateSSO,
  };
}
