/**
 * Email Service for sending invitations and notifications
 * This is a placeholder that should be implemented with your email provider
 * (e.g., SendGrid, AWS SES, Postmark, etc.)
 */

import { supabase } from '@/integrations/supabase/client';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Generate invitation email template
 */
const generateInvitationEmail = (
  firstName: string,
  organizationName: string,
  invitationUrl: string,
  supportEmail: string
): EmailTemplate => {
  const subject = `Welcome to ${organizationName} - Complete Your Registration`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 8px; margin-top: 20px; }
    .button { 
      display: inline-block; 
      background-color: #4F46E5; 
      color: white; 
      padding: 12px 24px; 
      text-decoration: none; 
      border-radius: 6px; 
      margin: 20px 0;
    }
    .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
    .warning { background-color: #FEF3C7; padding: 15px; border-left: 4px solid #F59E0B; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to ${organizationName}</h1>
    </div>
    <div class="content">
      <p>Hi ${firstName},</p>
      
      <p>You've been invited to join <strong>${organizationName}</strong> as a support administrator.</p>
      
      <p>To get started, please complete your registration by following these steps:</p>
      
      <ol>
        <li>Click the button below to access the portal</li>
        <li>Complete the multi-factor authentication (MFA) setup</li>
        <li>Set up your secure password</li>
        <li>Access the device enrollment portal</li>
      </ol>
      
      <div style="text-align: center;">
        <a href="${invitationUrl}" class="button">Complete Registration</a>
      </div>
      
      <div class="warning">
        <strong>⚠️ Security Notice:</strong> This invitation link will expire in 24 hours. 
        Please complete your registration as soon as possible.
      </div>
      
      <p>Once you've completed registration, you'll be able to:</p>
      <ul>
        <li>Manage devices and users in your organization</li>
        <li>Configure secure access policies</li>
        <li>Enroll new devices with Tailscale</li>
        <li>Monitor audit logs and security events</li>
      </ul>
      
      <p>If you have any questions or need assistance, please contact us at 
      <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
      
      <p>Best regards,<br>The Nexus Access Vault Team</p>
    </div>
    <div class="footer">
      <p>This email was sent to you as part of your organization's onboarding process.</p>
      <p>If you did not request this invitation, please ignore this email.</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Welcome to ${organizationName}

Hi ${firstName},

You've been invited to join ${organizationName} as a support administrator.

To get started, please complete your registration by visiting:
${invitationUrl}

Steps to complete:
1. Access the portal using the link above
2. Complete the multi-factor authentication (MFA) setup
3. Set up your secure password
4. Access the device enrollment portal

⚠️ Security Notice: This invitation link will expire in 24 hours.

If you have any questions, contact us at ${supportEmail}.

Best regards,
The Nexus Access Vault Team
  `;

  return { subject, html, text };
};

/**
 * Generate device enrollment email template
 */
const generateEnrollmentEmail = (
  firstName: string,
  deviceType: string,
  enrollmentUrl: string,
  authKey: string
): EmailTemplate => {
  const subject = `Device Enrollment Instructions - ${deviceType}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 8px; margin-top: 20px; }
    .code-block { 
      background-color: #1F2937; 
      color: #10B981; 
      padding: 15px; 
      border-radius: 6px; 
      font-family: monospace; 
      overflow-x: auto;
      margin: 15px 0;
    }
    .button { 
      display: inline-block; 
      background-color: #4F46E5; 
      color: white; 
      padding: 12px 24px; 
      text-decoration: none; 
      border-radius: 6px; 
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Device Enrollment Instructions</h1>
    </div>
    <div class="content">
      <p>Hi ${firstName},</p>
      
      <p>Your device enrollment token has been generated for <strong>${deviceType}</strong>.</p>
      
      <p><strong>Authentication Key:</strong></p>
      <div class="code-block">${authKey}</div>
      
      <p>Click below for detailed installation instructions:</p>
      <div style="text-align: center;">
        <a href="${enrollmentUrl}" class="button">View Instructions</a>
      </div>
      
      <p><strong>⚠️ Important:</strong> Keep this authentication key secure. 
      Do not share it with anyone.</p>
      
      <p>Best regards,<br>The Nexus Access Vault Team</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Device Enrollment Instructions

Hi ${firstName},

Your device enrollment token has been generated for ${deviceType}.

Authentication Key:
${authKey}

For detailed instructions, visit: ${enrollmentUrl}

⚠️ Important: Keep this authentication key secure. Do not share it with anyone.

Best regards,
The Nexus Access Vault Team
  `;

  return { subject, html, text };
};

/**
 * Send invitation email
 * 
 * NOTE: Email service requires backend implementation
 * In production, configure your email provider (SendGrid, AWS SES, etc.)
 * 
 * TODO: Implement backend email service endpoint /api/email/send
 * Backend should:
 * 1. Accept email content and recipient
 * 2. Use configured email service (SendGrid/SES/SMTP)
 * 3. Send email and return success/failure
 * 4. Handle retries and error logging
 */
export const sendInvitationEmail = async (
  toEmail: string,
  firstName: string,
  organizationName: string,
  invitationToken: string
): Promise<boolean> => {
  try {
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const invitationUrl = `${appUrl}/auth?token=${invitationToken}`;
    const supportEmail = import.meta.env.EMAIL_FROM || 'support@nexus-access-vault.com';

    const emailContent = generateInvitationEmail(
      firstName,
      organizationName,
      invitationUrl,
      supportEmail
    );

    // TODO: Replace with actual email service implementation
    // Production implementation example:
    /*
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: toEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Email service error: ${error}`);
    }
    
    return true;
    */

    // Development mode: Log email instead of sending
    if (import.meta.env.DEV) {
      console.log('=== INVITATION EMAIL (DEV MODE) ===');
      console.log('To:', toEmail);
      console.log('Subject:', emailContent.subject);
      console.log('URL:', invitationUrl);
      console.log('====================================');
      console.log('\n⚠️  WARNING: Email not sent in development mode');
      console.log('    Configure email service for production\n');
    }

    // For now, record in database that email "would have been sent"
    // In production, only return true if email actually sent
    return true;
  } catch (error) {
    console.error('Error preparing invitation email:', error);
    return false;
  }
};

/**
 * Send device enrollment email
 */
export const sendEnrollmentEmail = async (
  toEmail: string,
  firstName: string,
  deviceType: string,
  authKey: string,
  enrollmentTokenId: string
): Promise<boolean> => {
  try {
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const enrollmentUrl = `${appUrl}/enroll?token=${enrollmentTokenId}&device=${deviceType}`;

    const emailContent = generateEnrollmentEmail(
      firstName,
      deviceType,
      enrollmentUrl,
      authKey
    );

    // TODO: Implement actual email sending
    if (import.meta.env.DEV) {
      console.log('=== ENROLLMENT EMAIL ===');
      console.log('To:', toEmail);
      console.log('Subject:', emailContent.subject);
      console.log('========================');
    }

    return true;
  } catch (error) {
    console.error('Error sending enrollment email:', error);
    return false;
  }
};

/**
 * Record email sent in database
 */
export const recordEmailSent = async (
  organizationId: string,
  email: string,
  invitationTokenId: string,
  expiresAt: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('invitation_emails')
      .insert({
        organization_id: organizationId,
        email,
        invitation_token: invitationTokenId,
        sent_at: new Date().toISOString(),
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error recording email:', error);
    return null;
  }
};
