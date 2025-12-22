/**
 * LXD/LXC Integration Service
 * Manages Ubuntu Canonical containers and VMs via LXD REST API
 */

import { supabase } from '@/integrations/supabase/client';
import { getDecryptedSecret } from '../security/encryption';

interface LXDInstance {
  name: string;
  status: string;
  type: string;
  architecture: string;
  profiles: string[];
  ephemeral: boolean;
  stateful: boolean;
  description: string;
  created_at: string;
  last_used_at: string;
  location: string;
  project: string;
  state?: {
    status: string;
    cpu: {
      usage: number;
    };
    memory: {
      usage: number;
      total: number;
    };
    network?: Record<string, {
      addresses: Array<{
        family: string;
        address: string;
        netmask: string;
      }>;
    }>;
  };
}

interface LXDInstanceConfig {
  name: string;
  type: 'container' | 'virtual-machine';
  image: {
    server: string;
    alias: string;
  };
  profiles?: string[];
  config?: Record<string, string>;
  devices?: Record<string, any>;
  ephemeral?: boolean;
  description?: string;
}

/**
 * Get LXD connection details for an organization
 */
const getLXDConnection = async (organizationId: string): Promise<{
  endpoint: string;
  clientCert: string;
  clientKey: string;
}> => {
  const { data, error } = await supabase
    .from('cloud_providers')
    .select('credentials_ref, config')
    .eq('organization_id', organizationId)
    .eq('provider_type', 'lxd')
    .eq('enabled', true)
    .single();

  if (error || !data) {
    throw new Error('LXD integration not found for organization');
  }

  const credentials = await getDecryptedSecret(data.credentials_ref);
  if (!credentials) {
    throw new Error('Failed to retrieve LXD credentials');
  }

  const creds = JSON.parse(credentials);

  return {
    endpoint: data.config.endpoint,
    clientCert: creds.clientCert,
    clientKey: creds.clientKey,
  };
};

/**
 * Make authenticated request to LXD API
 */
const lxdRequest = async (
  endpoint: string,
  path: string,
  method: string = 'GET',
  body?: any
): Promise<any> => {
  // Note: In a browser environment, we cannot directly use client certificates
  // This would need to be proxied through a backend service
  // For now, this is a reference implementation
  
  throw new Error('LXD API calls must be proxied through backend service for certificate auth');
};

/**
 * List all LXD instances
 */
export const listLXDInstances = async (
  organizationId: string,
  project: string = 'default'
): Promise<LXDInstance[]> => {
  try {
    const { endpoint } = await getLXDConnection(organizationId);

    // This would be called via backend proxy
    const response = await fetch(`/api/lxd/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId,
        project,
      }),
    });

    if (!response.ok) {
      throw new Error(`LXD API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.instances || [];
  } catch (error) {
    console.error('Error listing LXD instances:', error);
    throw error;
  }
};

/**
 * Create a new LXD instance
 */
export const createLXDInstance = async (
  organizationId: string,
  config: LXDInstanceConfig,
  project: string = 'default'
): Promise<LXDInstance> => {
  try {
    const instanceBody = {
      name: config.name,
      type: config.type,
      source: {
        type: 'image',
        mode: 'pull',
        server: config.image.server,
        alias: config.image.alias,
      },
      profiles: config.profiles || ['default'],
      config: config.config || {},
      devices: config.devices || {},
      ephemeral: config.ephemeral || false,
      description: config.description || '',
    };

    // This would be called via backend proxy
    const response = await fetch(`/api/lxd/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId,
        project,
        instance: instanceBody,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LXD API error: ${error}`);
    }

    // Start the instance
    await startLXDInstance(organizationId, config.name, project);

    // Get instance details
    return await getLXDInstance(organizationId, config.name, project);
  } catch (error) {
    console.error('Error creating LXD instance:', error);
    throw error;
  }
};

/**
 * Get details of a specific LXD instance
 */
export const getLXDInstance = async (
  organizationId: string,
  instanceName: string,
  project: string = 'default'
): Promise<LXDInstance> => {
  try {
    const response = await fetch(`/api/lxd/instances/${instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId,
        project,
      }),
    });

    if (!response.ok) {
      throw new Error(`LXD API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.instance;
  } catch (error) {
    console.error('Error getting LXD instance:', error);
    throw error;
  }
};

/**
 * Start a stopped LXD instance
 */
export const startLXDInstance = async (
  organizationId: string,
  instanceName: string,
  project: string = 'default'
): Promise<boolean> => {
  try {
    const response = await fetch(`/api/lxd/instances/${instanceName}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId,
        project,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error starting LXD instance:', error);
    throw error;
  }
};

/**
 * Stop a running LXD instance
 */
export const stopLXDInstance = async (
  organizationId: string,
  instanceName: string,
  project: string = 'default',
  force: boolean = false
): Promise<boolean> => {
  try {
    const response = await fetch(`/api/lxd/instances/${instanceName}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId,
        project,
        force,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error stopping LXD instance:', error);
    throw error;
  }
};

/**
 * Delete an LXD instance
 */
export const deleteLXDInstance = async (
  organizationId: string,
  instanceName: string,
  project: string = 'default'
): Promise<boolean> => {
  try {
    // Stop the instance first if it's running
    await stopLXDInstance(organizationId, instanceName, project, true);

    // Wait a bit for it to stop
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Delete the instance
    const response = await fetch(`/api/lxd/instances/${instanceName}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId,
        project,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error deleting LXD instance:', error);
    throw error;
  }
};

/**
 * Execute a command in an LXD instance
 */
export const execLXDCommand = async (
  organizationId: string,
  instanceName: string,
  command: string[],
  project: string = 'default'
): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  try {
    const response = await fetch(`/api/lxd/instances/${instanceName}/exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId,
        project,
        command,
        waitForWebsocket: true,
        recordOutput: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`LXD API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      stdout: data.output?.stdout || '',
      stderr: data.output?.stderr || '',
      exitCode: data.exitCode || 0,
    };
  } catch (error) {
    console.error('Error executing command in LXD instance:', error);
    throw error;
  }
};

/**
 * Setup LXD integration for an organization
 */
export const setupLXDIntegration = async (
  organizationId: string,
  endpoint: string,
  clientCert: string,
  clientKey: string
): Promise<string> => {
  try {
    // Store the certificates securely
    const credentials = JSON.stringify({
      clientCert,
      clientKey,
    });

    const { data: secretData, error: secretError } = await supabase.rpc(
      'store_encrypted_secret',
      {
        p_org_id: organizationId,
        p_key_name: 'lxd_certificates',
        p_secret_value: credentials,
        p_secret_type: 'certificate',
        p_metadata: { service: 'lxd', endpoint },
      }
    );

    if (secretError) throw secretError;

    // Create the integration record
    const { data, error } = await supabase
      .from('cloud_providers')
      .insert({
        organization_id: organizationId,
        provider_type: 'lxd',
        provider_name: 'LXD/LXC',
        credentials_ref: secretData,
        config: { endpoint },
        enabled: true,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error setting up LXD integration:', error);
    throw error;
  }
};

/**
 * Generate cloud-init configuration for Tailscale
 */
export const generateLXDCloudInit = (tailscaleAuthKey: string): string => {
  return `#cloud-config
package_update: true
package_upgrade: true

packages:
  - curl
  - ca-certificates

runcmd:
  # Install Tailscale
  - curl -fsSL https://tailscale.com/install.sh | sh
  - tailscale up --authkey=${tailscaleAuthKey} --accept-routes
  
  # Enable IP forwarding
  - echo 'net.ipv4.ip_forward = 1' >> /etc/sysctl.conf
  - echo 'net.ipv6.conf.all.forwarding = 1' >> /etc/sysctl.conf
  - sysctl -p

  # Set hostname
  - hostnamectl set-hostname $(hostname)

final_message: "LXD instance is ready after $UPTIME seconds"
`;
};

/**
 * Common LXD profiles for different use cases
 */
export const getLXDProfiles = () => ({
  default: {
    name: 'default',
    description: 'Default LXD profile',
    config: {},
    devices: {
      eth0: {
        name: 'eth0',
        nictype: 'bridged',
        parent: 'lxdbr0',
        type: 'nic',
      },
      root: {
        path: '/',
        pool: 'default',
        type: 'disk',
      },
    },
  },
  tailscale: {
    name: 'tailscale',
    description: 'Profile with Tailscale support',
    config: {
      'security.nesting': 'true',
      'security.privileged': 'false',
    },
    devices: {
      eth0: {
        name: 'eth0',
        nictype: 'bridged',
        parent: 'lxdbr0',
        type: 'nic',
      },
      root: {
        path: '/',
        pool: 'default',
        type: 'disk',
        size: '20GB',
      },
      tun: {
        path: '/dev/net/tun',
        type: 'unix-char',
      },
    },
  },
});
