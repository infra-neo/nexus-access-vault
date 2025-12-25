/**
 * Tailscale API Integration Service
 * Handles all Tailscale API operations including device enrollment, ACL management, etc.
 */

import { supabase } from '@/integrations/supabase/client';
import { getDecryptedSecret } from '../security/encryption';

const TAILSCALE_API_BASE = 'https://api.tailscale.com/api/v2';

interface TailscaleDevice {
  id: string;
  hostname: string;
  name: string;
  ipv4: string;
  ipv6: string;
  tags: string[];
  os: string;
  lastSeen: string;
  online: boolean;
}

interface TailscaleAuthKey {
  id: string;
  key: string;
  created: string;
  expires: string;
  capabilities: {
    devices: {
      create: {
        reusable: boolean;
        ephemeral: boolean;
        preauthorized: boolean;
        tags: string[];
      }
    }
  }
}

/**
 * Get Tailscale API key for an organization
 */
const getTailscaleApiKey = async (organizationId: string): Promise<string> => {
  const { data, error } = await supabase
    .from('tailscale_organizations')
    .select('api_key_ref')
    .eq('organization_id', organizationId)
    .single();

  if (error || !data) {
    throw new Error('Tailscale integration not found for organization');
  }

  const apiKey = await getDecryptedSecret(data.api_key_ref);
  if (!apiKey) {
    throw new Error('Failed to retrieve Tailscale API key');
  }

  return apiKey;
};

/**
 * Get tailnet name for an organization
 */
const getTailnet = async (organizationId: string): Promise<string> => {
  const { data, error } = await supabase
    .from('tailscale_organizations')
    .select('tailnet')
    .eq('organization_id', organizationId)
    .single();

  if (error || !data) {
    throw new Error('Tailscale integration not found for organization');
  }

  return data.tailnet;
};

/**
 * Create a new Tailscale auth key for device enrollment
 */
export const createTailscaleAuthKey = async (
  organizationId: string,
  options: {
    reusable?: boolean;
    ephemeral?: boolean;
    preauthorized?: boolean;
    tags?: string[];
    expirySeconds?: number;
  } = {}
): Promise<TailscaleAuthKey> => {
  try {
    const apiKey = await getTailscaleApiKey(organizationId);
    const tailnet = await getTailnet(organizationId);

    const response = await fetch(
      `${TAILSCALE_API_BASE}/tailnet/${tailnet}/keys`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          capabilities: {
            devices: {
              create: {
                reusable: options.reusable ?? true,
                ephemeral: options.ephemeral ?? false,
                preauthorized: options.preauthorized ?? true,
                tags: options.tags ?? [],
              }
            }
          },
          expirySeconds: options.expirySeconds ?? 86400, // 24 hours default
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tailscale API error: ${error}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating Tailscale auth key:', error);
    throw error;
  }
};

/**
 * List all devices in the tailnet
 */
export const listTailscaleDevices = async (
  organizationId: string
): Promise<TailscaleDevice[]> => {
  try {
    const apiKey = await getTailscaleApiKey(organizationId);
    const tailnet = await getTailnet(organizationId);

    const response = await fetch(
      `${TAILSCALE_API_BASE}/tailnet/${tailnet}/devices`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tailscale API error: ${error}`);
    }

    const data = await response.json();
    return data.devices || [];
  } catch (error) {
    console.error('Error listing Tailscale devices:', error);
    throw error;
  }
};

/**
 * Delete a device from the tailnet
 */
export const deleteTailscaleDevice = async (
  organizationId: string,
  deviceId: string
): Promise<boolean> => {
  try {
    const apiKey = await getTailscaleApiKey(organizationId);
    const tailnet = await getTailnet(organizationId);

    const response = await fetch(
      `${TAILSCALE_API_BASE}/tailnet/${tailnet}/devices/${deviceId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error deleting Tailscale device:', error);
    throw error;
  }
};

/**
 * Update ACL for the tailnet
 */
export const updateTailscaleACL = async (
  organizationId: string,
  acl: Record<string, any>
): Promise<boolean> => {
  try {
    const apiKey = await getTailscaleApiKey(organizationId);
    const tailnet = await getTailnet(organizationId);

    const response = await fetch(
      `${TAILSCALE_API_BASE}/tailnet/${tailnet}/acl`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(acl),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tailscale ACL update error: ${error}`);
    }

    // Update the ACL config in database
    await supabase
      .from('tailscale_organizations')
      .update({ acl_config: acl })
      .eq('organization_id', organizationId);

    return true;
  } catch (error) {
    console.error('Error updating Tailscale ACL:', error);
    throw error;
  }
};

/**
 * Get current ACL for the tailnet
 */
export const getTailscaleACL = async (
  organizationId: string
): Promise<Record<string, any>> => {
  try {
    const apiKey = await getTailscaleApiKey(organizationId);
    const tailnet = await getTailnet(organizationId);

    const response = await fetch(
      `${TAILSCALE_API_BASE}/tailnet/${tailnet}/acl`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tailscale API error: ${error}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting Tailscale ACL:', error);
    throw error;
  }
};

/**
 * Create Tailscale integration for a new organization
 */
export const setupTailscaleIntegration = async (
  organizationId: string,
  tailnet: string,
  apiKey: string,
  organizationTag: string
): Promise<string> => {
  try {
    const { data, error } = await supabase.rpc('create_tailscale_integration', {
      p_org_id: organizationId,
      p_tailnet: tailnet,
      p_api_key: apiKey,
      p_organization_tag: organizationTag,
      p_acl_config: {
        acls: [
          {
            action: 'accept',
            src: [`tag:${organizationTag}`],
            dst: [`tag:${organizationTag}:*`],
          }
        ],
        tagOwners: {
          [`tag:${organizationTag}`]: [],
        }
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error setting up Tailscale integration:', error);
    throw error;
  }
};

/**
 * Generate enrollment instructions for a device
 */
export const generateEnrollmentInstructions = (
  authKey: string,
  deviceType: 'windows' | 'linux' | 'macos' | 'mobile'
): string => {
  const instructions: Record<typeof deviceType, string> = {
    windows: `
# Windows Installation
1. Download Tailscale from https://tailscale.com/download/windows
2. Run the installer
3. Open Tailscale and click "Log in"
4. Use this auth key when prompted:
   ${authKey}
5. Your device will be automatically enrolled
`,
    linux: `
# Linux Installation
1. Run the following commands:
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up --authkey=${authKey}
2. Your device will be automatically enrolled
`,
    macos: `
# macOS Installation
1. Download Tailscale from https://tailscale.com/download/mac
2. Open the downloaded .pkg file and install
3. Open Tailscale from Applications
4. Use this auth key when prompted:
   ${authKey}
5. Your device will be automatically enrolled
`,
    mobile: `
# Mobile Installation (iOS/Android)
1. Download Tailscale from App Store or Google Play
2. Open the app and tap "Get Started"
3. Use this auth key when prompted:
   ${authKey}
4. Your device will be automatically enrolled
`
  };

  return instructions[deviceType];
};
