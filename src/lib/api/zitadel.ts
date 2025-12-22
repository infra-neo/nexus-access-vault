/**
 * Zitadel API Integration Service
 * Handles authentication, project creation, user management, and OIDC configuration
 */

import { supabase } from '@/integrations/supabase/client';
import { storeEncryptedSecret } from '../security/encryption';

const ZITADEL_DOMAIN = import.meta.env.VITE_ZITADEL_DOMAIN || '';
const ZITADEL_API_BASE = `https://${ZITADEL_DOMAIN}`;

interface ZitadelProject {
  id: string;
  name: string;
  state: string;
}

interface ZitadelApplication {
  id: string;
  name: string;
  clientId: string;
  clientSecret?: string;
}

interface ZitadelUser {
  id: string;
  userName: string;
  profile: {
    firstName: string;
    lastName: string;
    displayName: string;
  };
  email: {
    email: string;
    isEmailVerified: boolean;
  };
}

/**
 * Get Zitadel management API token
 * 
 * SECURITY WARNING: This should NOT use client-side environment variables
 * in production as it exposes sensitive credentials to the browser.
 * 
 * TODO: Move to backend endpoint /api/zitadel/token
 * Backend should:
 * 1. Store Zitadel API token securely (environment variable or secret manager)
 * 2. Provide authenticated endpoint to frontend
 * 3. Return token only to authorized admins
 * 4. Implement token caching and refresh
 */
const getZitadelApiToken = async (): Promise<string> => {
  // PRODUCTION: Replace with backend API call
  // const response = await fetch('/api/zitadel/token');
  // const data = await response.json();
  // return data.token;
  
  // DEVELOPMENT: Use client-side env variable (NOT SECURE FOR PRODUCTION)
  const token = import.meta.env.VITE_ZITADEL_API_TOKEN;
  if (!token) {
    throw new Error('Zitadel API token not configured - set VITE_ZITADEL_API_TOKEN or implement backend endpoint');
  }
  
  console.warn('⚠️  Using client-side Zitadel API token - NOT SECURE FOR PRODUCTION');
  console.warn('    Implement backend endpoint /api/zitadel/token for production use');
  
  return token;
};

/**
 * Create a new Zitadel project for a client organization
 */
export const createZitadelProject = async (
  organizationId: string,
  projectName: string
): Promise<ZitadelProject> => {
  try {
    const token = await getZitadelApiToken();

    const response = await fetch(`${ZITADEL_API_BASE}/management/v1/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        projectRoleAssertion: true,
        projectRoleCheck: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Zitadel API error: ${error}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating Zitadel project:', error);
    throw error;
  }
};

/**
 * Create an OIDC application in Zitadel
 */
export const createZitadelOIDCApplication = async (
  projectId: string,
  appName: string,
  redirectUris: string[],
  postLogoutRedirectUris: string[]
): Promise<ZitadelApplication> => {
  try {
    const token = await getZitadelApiToken();

    const response = await fetch(
      `${ZITADEL_API_BASE}/management/v1/projects/${projectId}/apps/oidc`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: appName,
          redirectUris,
          postLogoutRedirectUris,
          responseTypes: ['OIDC_RESPONSE_TYPE_CODE'],
          grantTypes: ['OIDC_GRANT_TYPE_AUTHORIZATION_CODE', 'OIDC_GRANT_TYPE_REFRESH_TOKEN'],
          appType: 'OIDC_APP_TYPE_WEB',
          authMethodType: 'OIDC_AUTH_METHOD_TYPE_BASIC',
          version: 'OIDC_VERSION_1_0',
          devMode: false,
          accessTokenType: 'OIDC_TOKEN_TYPE_JWT',
          idTokenRoleAssertion: true,
          idTokenUserinfoAssertion: true,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Zitadel API error: ${error}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating Zitadel OIDC application:', error);
    throw error;
  }
};

/**
 * Create a support user in Zitadel
 */
export const createZitadelSupportUser = async (
  email: string,
  firstName: string,
  lastName: string,
  organizationName: string
): Promise<ZitadelUser> => {
  try {
    const token = await getZitadelApiToken();

    const response = await fetch(`${ZITADEL_API_BASE}/management/v1/users/human/_import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userName: email,
        profile: {
          firstName,
          lastName,
          displayName: `${firstName} ${lastName}`,
        },
        email: {
          email,
          isEmailVerified: false,
        },
        phone: {},
        passwordChangeRequired: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Zitadel API error: ${error}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating Zitadel user:', error);
    throw error;
  }
};

/**
 * Assign user to project with role
 */
export const assignUserToProject = async (
  userId: string,
  projectId: string,
  roles: string[]
): Promise<boolean> => {
  try {
    const token = await getZitadelApiToken();

    const response = await fetch(
      `${ZITADEL_API_BASE}/management/v1/projects/${projectId}/users/${userId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roleKeys: roles,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Zitadel API error: ${error}`);
    }

    return true;
  } catch (error) {
    console.error('Error assigning user to project:', error);
    throw error;
  }
};

/**
 * Create a project role
 */
export const createProjectRole = async (
  projectId: string,
  roleKey: string,
  displayName: string
): Promise<boolean> => {
  try {
    const token = await getZitadelApiToken();

    const response = await fetch(
      `${ZITADEL_API_BASE}/management/v1/projects/${projectId}/roles`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roleKey,
          displayName,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Zitadel API error: ${error}`);
    }

    return true;
  } catch (error) {
    console.error('Error creating project role:', error);
    throw error;
  }
};

/**
 * Send email verification to user
 */
export const sendEmailVerification = async (userId: string): Promise<boolean> => {
  try {
    const token = await getZitadelApiToken();

    const response = await fetch(
      `${ZITADEL_API_BASE}/management/v1/users/${userId}/email/_resend_code`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error sending email verification:', error);
    throw error;
  }
};

/**
 * Complete Zitadel setup for a new organization
 * This orchestrates all the steps needed for client onboarding
 */
export const setupZitadelForOrganization = async (
  organizationId: string,
  organizationName: string,
  supportEmail: string,
  supportFirstName: string,
  supportLastName: string,
  appUrl: string
): Promise<{
  projectId: string;
  applicationId: string;
  clientId: string;
  userId: string;
}> => {
  try {
    // 1. Create project
    const project = await createZitadelProject(organizationId, organizationName);
    
    // 2. Create project roles
    await createProjectRole(project.id, 'admin', 'Administrator');
    await createProjectRole(project.id, 'support', 'Support User');
    await createProjectRole(project.id, 'user', 'Standard User');

    // 3. Create OIDC application
    const redirectUris = [
      `${appUrl}/auth/callback`,
      `${appUrl}/dashboard`,
    ];
    const postLogoutUris = [`${appUrl}/auth`];
    
    const application = await createZitadelOIDCApplication(
      project.id,
      `${organizationName} Portal`,
      redirectUris,
      postLogoutUris
    );

    // 4. Store client secret securely
    if (application.clientSecret) {
      const secretId = await storeEncryptedSecret(
        organizationId,
        'zitadel_client_secret',
        application.clientSecret,
        'password',
        {
          service: 'zitadel',
          projectId: project.id,
          applicationId: application.id,
        }
      );

      // 5. Store Zitadel project info in database
      await supabase.from('zitadel_projects').insert({
        organization_id: organizationId,
        project_id: project.id,
        project_name: organizationName,
        client_id: application.clientId,
        client_secret_ref: secretId,
        oidc_config: {
          redirectUris,
          postLogoutUris,
          applicationId: application.id,
        },
      });
    }

    // 6. Create support user
    const user = await createZitadelSupportUser(
      supportEmail,
      supportFirstName,
      supportLastName,
      organizationName
    );

    // 7. Assign user to project with admin role
    await assignUserToProject(user.id, project.id, ['admin', 'support']);

    // 8. Send email verification
    await sendEmailVerification(user.id);

    return {
      projectId: project.id,
      applicationId: application.id,
      clientId: application.clientId,
      userId: user.id,
    };
  } catch (error) {
    console.error('Error setting up Zitadel for organization:', error);
    throw error;
  }
};
