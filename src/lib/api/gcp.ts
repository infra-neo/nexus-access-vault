/**
 * Google Cloud Platform (GCP) Integration Service
 * Handles VM provisioning, network configuration, and resource management
 */

import { supabase } from '@/integrations/supabase/client';
import { getDecryptedSecret } from '../security/encryption';

interface GCPInstance {
  id: string;
  name: string;
  machineType: string;
  status: string;
  networkInterfaces: Array<{
    networkIP: string;
    accessConfigs?: Array<{
      natIP: string;
    }>;
  }>;
  zone: string;
}

interface GCPInstanceConfig {
  name: string;
  machineType: string;
  zone: string;
  diskSizeGb: number;
  imageFamily: string;
  imageProject: string;
  network?: string;
  subnetwork?: string;
  tags?: string[];
  labels?: Record<string, string>;
  metadata?: Array<{
    key: string;
    value: string;
  }>;
}

/**
 * Get GCP credentials for an organization
 */
const getGCPCredentials = async (organizationId: string): Promise<{
  projectId: string;
  credentials: any;
}> => {
  const { data, error } = await supabase
    .from('cloud_providers')
    .select('credentials_ref, config')
    .eq('organization_id', organizationId)
    .eq('provider_type', 'gcp')
    .eq('enabled', true)
    .single();

  if (error || !data) {
    throw new Error('GCP integration not found for organization');
  }

  const credentials = await getDecryptedSecret(data.credentials_ref);
  if (!credentials) {
    throw new Error('Failed to retrieve GCP credentials');
  }

  return {
    projectId: data.config.projectId,
    credentials: JSON.parse(credentials),
  };
};

/**
 * Get GCP access token
 */
const getGCPAccessToken = async (credentials: any): Promise<string> => {
  // In a real implementation, this would use OAuth2 to get an access token
  // For now, this is a placeholder that would use the service account credentials
  
  // Example with @google-cloud/compute library:
  // const { GoogleAuth } = require('google-auth-library');
  // const auth = new GoogleAuth({ credentials });
  // const client = await auth.getClient();
  // const accessToken = await client.getAccessToken();
  
  throw new Error('GCP access token generation not implemented - requires backend service');
};

/**
 * List GCP instances in a project
 */
export const listGCPInstances = async (
  organizationId: string,
  zone?: string
): Promise<GCPInstance[]> => {
  try {
    const { projectId, credentials } = await getGCPCredentials(organizationId);
    const accessToken = await getGCPAccessToken(credentials);

    const zonesEndpoint = zone
      ? `zones/${zone}/instances`
      : 'aggregated/instances';

    const response = await fetch(
      `https://compute.googleapis.com/compute/v1/projects/${projectId}/${zonesEndpoint}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GCP API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Handle aggregated response
    if (!zone && data.items) {
      const instances: GCPInstance[] = [];
      Object.values(data.items).forEach((zoneData: any) => {
        if (zoneData.instances) {
          instances.push(...zoneData.instances);
        }
      });
      return instances;
    }

    return data.items || [];
  } catch (error) {
    console.error('Error listing GCP instances:', error);
    throw error;
  }
};

/**
 * Create a new GCP instance
 */
export const createGCPInstance = async (
  organizationId: string,
  config: GCPInstanceConfig
): Promise<GCPInstance> => {
  try {
    const { projectId, credentials } = await getGCPCredentials(organizationId);
    const accessToken = await getGCPAccessToken(credentials);

    const instanceBody = {
      name: config.name,
      machineType: `zones/${config.zone}/machineTypes/${config.machineType}`,
      disks: [
        {
          boot: true,
          autoDelete: true,
          initializeParams: {
            sourceImage: `projects/${config.imageProject}/global/images/family/${config.imageFamily}`,
            diskSizeGb: config.diskSizeGb,
          },
        },
      ],
      networkInterfaces: [
        {
          network: config.network || 'global/networks/default',
          subnetwork: config.subnetwork,
          accessConfigs: [
            {
              type: 'ONE_TO_ONE_NAT',
              name: 'External NAT',
            },
          ],
        },
      ],
      tags: {
        items: config.tags || [],
      },
      labels: config.labels || {},
      metadata: {
        items: config.metadata || [],
      },
    };

    const response = await fetch(
      `https://compute.googleapis.com/compute/v1/projects/${projectId}/zones/${config.zone}/instances`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(instanceBody),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GCP API error: ${error}`);
    }

    const operation = await response.json();
    
    // Wait for operation to complete (simplified)
    // In production, implement proper operation polling
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Fetch the created instance
    const instanceResponse = await fetch(
      `https://compute.googleapis.com/compute/v1/projects/${projectId}/zones/${config.zone}/instances/${config.name}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const instance = await instanceResponse.json();
    return instance;
  } catch (error) {
    console.error('Error creating GCP instance:', error);
    throw error;
  }
};

/**
 * Delete a GCP instance
 */
export const deleteGCPInstance = async (
  organizationId: string,
  zone: string,
  instanceName: string
): Promise<boolean> => {
  try {
    const { projectId, credentials } = await getGCPCredentials(organizationId);
    const accessToken = await getGCPAccessToken(credentials);

    const response = await fetch(
      `https://compute.googleapis.com/compute/v1/projects/${projectId}/zones/${zone}/instances/${instanceName}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error deleting GCP instance:', error);
    throw error;
  }
};

/**
 * Start a stopped GCP instance
 */
export const startGCPInstance = async (
  organizationId: string,
  zone: string,
  instanceName: string
): Promise<boolean> => {
  try {
    const { projectId, credentials } = await getGCPCredentials(organizationId);
    const accessToken = await getGCPAccessToken(credentials);

    const response = await fetch(
      `https://compute.googleapis.com/compute/v1/projects/${projectId}/zones/${zone}/instances/${instanceName}/start`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error starting GCP instance:', error);
    throw error;
  }
};

/**
 * Stop a running GCP instance
 */
export const stopGCPInstance = async (
  organizationId: string,
  zone: string,
  instanceName: string
): Promise<boolean> => {
  try {
    const { projectId, credentials } = await getGCPCredentials(organizationId);
    const accessToken = await getGCPAccessToken(credentials);

    const response = await fetch(
      `https://compute.googleapis.com/compute/v1/projects/${projectId}/zones/${zone}/instances/${instanceName}/stop`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error stopping GCP instance:', error);
    throw error;
  }
};

/**
 * Setup GCP integration for an organization
 */
export const setupGCPIntegration = async (
  organizationId: string,
  projectId: string,
  serviceAccountKey: string
): Promise<string> => {
  try {
    // Store the service account key securely
    const { data: secretData, error: secretError } = await supabase.rpc(
      'store_encrypted_secret',
      {
        p_org_id: organizationId,
        p_key_name: 'gcp_service_account',
        p_secret_value: serviceAccountKey,
        p_secret_type: 'certificate',
        p_metadata: { service: 'gcp', projectId },
      }
    );

    if (secretError) throw secretError;

    // Create the integration record
    const { data, error } = await supabase
      .from('cloud_providers')
      .insert({
        organization_id: organizationId,
        provider_type: 'gcp',
        provider_name: 'Google Cloud Platform',
        credentials_ref: secretData,
        config: { projectId },
        enabled: true,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error setting up GCP integration:', error);
    throw error;
  }
};

/**
 * Generate startup script for Tailscale installation
 */
export const generateGCPStartupScript = (tailscaleAuthKey: string): string => {
  return `#!/bin/bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Start Tailscale
tailscale up --authkey=${tailscaleAuthKey} --accept-routes

# Enable IP forwarding
echo 'net.ipv4.ip_forward = 1' | tee -a /etc/sysctl.conf
echo 'net.ipv6.conf.all.forwarding = 1' | tee -a /etc/sysctl.conf
sysctl -p /etc/sysctl.conf

# Install monitoring agent (optional)
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
bash add-google-cloud-ops-agent-repo.sh --also-install
`;
};
