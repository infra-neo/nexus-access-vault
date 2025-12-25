/**
 * Client Onboarding Orchestration Service
 * Coordinates all steps needed to onboard a new client organization
 */

import { supabase } from '@/integrations/supabase/client';
import { setupZitadelForOrganization } from './zitadel';
import { setupTailscaleIntegration, createTailscaleAuthKey } from './tailscale';
import { sendInvitationEmail, recordEmailSent } from './email';
import { generateEnrollmentToken } from '../security/encryption';

export interface ClientOnboardingRequest {
  // Organization details
  organizationName: string;
  organizationLogo?: string;
  
  // Support user details
  supportEmail: string;
  supportFirstName: string;
  supportLastName: string;
  
  // Tailscale configuration
  tailnet: string;
  tailscaleApiKey: string;
  organizationTag?: string;
  
  // Application URLs
  appUrl: string;
  
  // Optional configurations
  enableMFA?: boolean;
  customACLs?: Record<string, any>;
}

export interface ClientOnboardingResult {
  success: boolean;
  organizationId?: string;
  zitadelProjectId?: string;
  zitadelClientId?: string;
  zitadelUserId?: string;
  tailscaleIntegrationId?: string;
  invitationToken?: string;
  errors?: string[];
}

/**
 * Main orchestration function for complete client onboarding
 */
export const onboardNewClient = async (
  request: ClientOnboardingRequest
): Promise<ClientOnboardingResult> => {
  const errors: string[] = [];
  let organizationId: string | undefined;
  
  try {
    console.log('Starting client onboarding for:', request.organizationName);

    // Step 1: Create organization in database
    console.log('Step 1: Creating organization...');
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: request.organizationName,
        logo_url: request.organizationLogo || null,
      })
      .select('id')
      .single();

    if (orgError || !org) {
      errors.push(`Failed to create organization: ${orgError?.message}`);
      return { success: false, errors };
    }

    organizationId = org.id;
    console.log('✓ Organization created:', organizationId);

    // Step 2: Set up Zitadel integration (project, OIDC app, support user)
    console.log('Step 2: Setting up Zitadel integration...');
    let zitadelResult;
    try {
      zitadelResult = await setupZitadelForOrganization(
        organizationId,
        request.organizationName,
        request.supportEmail,
        request.supportFirstName,
        request.supportLastName,
        request.appUrl
      );
      console.log('✓ Zitadel integration completed');
    } catch (error: any) {
      errors.push(`Zitadel setup failed: ${error.message}`);
      console.error('✗ Zitadel integration failed:', error);
    }

    // Step 3: Set up Tailscale integration
    console.log('Step 3: Setting up Tailscale integration...');
    let tailscaleIntegrationId;
    try {
      const orgTag = request.organizationTag || 
        request.organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      tailscaleIntegrationId = await setupTailscaleIntegration(
        organizationId,
        request.tailnet,
        request.tailscaleApiKey,
        orgTag
      );
      console.log('✓ Tailscale integration completed');
    } catch (error: any) {
      errors.push(`Tailscale setup failed: ${error.message}`);
      console.error('✗ Tailscale integration failed:', error);
    }

    // Step 4: Create support user profile in database
    console.log('Step 4: Creating support user profile...');
    let supportUserId;
    try {
      // Create user in Supabase (they'll complete signup via invitation)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          organization_id: organizationId,
          full_name: `${request.supportFirstName} ${request.supportLastName}`,
          role: 'support',
        })
        .select('id')
        .single();

      if (profileError) throw profileError;
      supportUserId = profile.id;
      console.log('✓ Support user profile created');
    } catch (error: any) {
      errors.push(`Failed to create support user profile: ${error.message}`);
      console.error('✗ Support user profile creation failed:', error);
    }

    // Step 5: Generate invitation token
    console.log('Step 5: Generating invitation token...');
    let invitationToken;
    try {
      if (supportUserId) {
        const tokenResult = await generateEnrollmentToken(
          organizationId,
          supportUserId,
          'invitation',
          undefined,
          24, // 24 hours expiry
          {
            email: request.supportEmail,
            firstName: request.supportFirstName,
            lastName: request.supportLastName,
          }
        );

        if (tokenResult) {
          invitationToken = tokenResult.token;
          
          // Record email invitation
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24);
          
          await recordEmailSent(
            organizationId,
            request.supportEmail,
            tokenResult.tokenId,
            expiresAt.toISOString()
          );

          console.log('✓ Invitation token generated');
        }
      }
    } catch (error: any) {
      errors.push(`Failed to generate invitation token: ${error.message}`);
      console.error('✗ Invitation token generation failed:', error);
    }

    // Step 6: Send invitation email
    console.log('Step 6: Sending invitation email...');
    try {
      if (invitationToken) {
        const emailSent = await sendInvitationEmail(
          request.supportEmail,
          request.supportFirstName,
          request.organizationName,
          invitationToken
        );

        if (emailSent) {
          console.log('✓ Invitation email sent');
        } else {
          errors.push('Failed to send invitation email');
          console.warn('✗ Invitation email failed');
        }
      }
    } catch (error: any) {
      errors.push(`Email sending failed: ${error.message}`);
      console.error('✗ Email sending failed:', error);
    }

    // Step 7: Generate initial Tailscale auth key for support user
    console.log('Step 7: Generating Tailscale auth key...');
    try {
      const authKey = await createTailscaleAuthKey(organizationId, {
        reusable: true,
        preauthorized: true,
        tags: [request.organizationTag || 'support'],
        expirySeconds: 2592000, // 30 days
      });
      console.log('✓ Tailscale auth key generated');
    } catch (error: any) {
      errors.push(`Failed to generate Tailscale auth key: ${error.message}`);
      console.error('✗ Tailscale auth key generation failed:', error);
    }

    // Step 8: Audit log
    console.log('Step 8: Recording audit log...');
    await supabase.from('audit_logs').insert({
      organization_id: organizationId,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      event: 'client_onboarded',
      details: {
        organization_name: request.organizationName,
        support_email: request.supportEmail,
        zitadel_project_id: zitadelResult?.projectId,
        tailscale_integration_id: tailscaleIntegrationId,
        errors: errors.length > 0 ? errors : undefined,
      },
    });

    console.log('✓ Audit log recorded');

    // Return result
    const success = errors.length === 0;
    console.log(success ? '✅ Client onboarding completed successfully!' : '⚠️ Client onboarding completed with errors');

    return {
      success,
      organizationId,
      zitadelProjectId: zitadelResult?.projectId,
      zitadelClientId: zitadelResult?.clientId,
      zitadelUserId: zitadelResult?.userId,
      tailscaleIntegrationId,
      invitationToken,
      errors: errors.length > 0 ? errors : undefined,
    };

  } catch (error: any) {
    console.error('✗ Critical error during client onboarding:', error);
    errors.push(`Critical error: ${error.message}`);
    
    // Attempt to record error in audit log
    if (organizationId) {
      try {
        await supabase.from('audit_logs').insert({
          organization_id: organizationId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          event: 'client_onboarding_failed',
          details: {
            error: error.message,
            stack: error.stack,
            errors,
          },
        });
      } catch (auditError) {
        console.error('Failed to record error in audit log:', auditError);
      }
    }

    return {
      success: false,
      organizationId,
      errors,
    };
  }
};

/**
 * Get onboarding status for an organization
 */
export const getOnboardingStatus = async (
  organizationId: string
): Promise<{
  hasZitadelIntegration: boolean;
  hasTailscaleIntegration: boolean;
  hasSupportUser: boolean;
  isComplete: boolean;
}> => {
  const [zitadel, tailscale, support] = await Promise.all([
    supabase
      .from('zitadel_projects')
      .select('id')
      .eq('organization_id', organizationId)
      .single(),
    supabase
      .from('tailscale_organizations')
      .select('id')
      .eq('organization_id', organizationId)
      .single(),
    supabase
      .from('profiles')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('role', 'support')
      .limit(1),
  ]);

  return {
    hasZitadelIntegration: !zitadel.error && !!zitadel.data,
    hasTailscaleIntegration: !tailscale.error && !!tailscale.data,
    hasSupportUser: !support.error && support.data && support.data.length > 0,
    isComplete: !zitadel.error && !tailscale.error && 
                support.data && support.data.length > 0,
  };
};
