# Comprehensive Client Onboarding Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Global Admin - Client Onboarding](#global-admin-client-onboarding)
5. [Support User - First Login](#support-user-first-login)
6. [Device Enrollment](#device-enrollment)
7. [Security Features](#security-features)
8. [Troubleshooting](#troubleshooting)

## Overview

The Nexus Access Vault provides a comprehensive Zero Trust access management solution with:

- **Multi-tenant architecture** - Complete isolation between client organizations
- **OIDC authentication via Zitadel** - Centralized identity management with MFA
- **Tailscale integration** - Secure device enrollment and network access
- **Pomerium policies** - Fine-grained access control
- **Encrypted secret management** - All sensitive data encrypted at rest
- **Cloud provider integration** - GCP and LXD/LXC support

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Global Admin                             │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Client Onboarding Wizard                         │  │
│  │  1. Create Organization                                  │  │
│  │  2. Setup Zitadel (Project + OIDC + Support User)       │  │
│  │  3. Configure Tailscale (API Key + Organization Tag)    │  │
│  │  4. Deploy Docker Stack (Pomerium + Services)           │  │
│  │  5. Send Invitation Email                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Support User Receives Email                   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1. Click invitation link                                │  │
│  │  2. Complete Zitadel authentication                      │  │
│  │  3. Setup MFA (TOTP/WebAuthn)                           │  │
│  │  4. Access portal dashboard                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Device Enrollment Flow                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1. Generate Tailscale auth key                          │  │
│  │  2. Select device type (Windows/Linux/macOS/Mobile)     │  │
│  │  3. Download installation instructions                   │  │
│  │  4. Install Tailscale client                            │  │
│  │  5. Device automatically enrolled and appears in portal  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Global Admin Requirements
- Access to Nexus Access Vault admin panel
- Zitadel instance with API access
- Tailscale account with API key
- Email service configured (SendGrid, AWS SES, etc.)
- Docker host for running client stacks

### Client Requirements
- Valid email address for support user
- Organization name and branding
- Tailnet name in Tailscale
- Domain for client portal

## Global Admin - Client Onboarding

### Step 1: Access Admin Panel

1. Log in to Nexus Access Vault as Global Admin
2. Navigate to **Admin Panel** from the sidebar
3. Click **+ Cliente** button in the top right

### Step 2: Complete Onboarding Wizard

#### Organization Details
- **Organization Name**: Client's company name (e.g., "Acme Corporation")
- **Logo URL**: Optional link to organization logo
- **Application URL**: Portal URL where client will access the system

#### Support User Information
- **First Name**: Support administrator's first name
- **Last Name**: Support administrator's last name
- **Email**: Valid email address (invitation will be sent here)

#### Tailscale Configuration
- **Tailnet Name**: Your Tailscale tailnet (e.g., "example.tailnet.ts.net")
- **API Key**: Tailscale API key with appropriate permissions
  - Required scopes: `devices:read`, `devices:write`, `keys:write`
- **Organization Tag**: Auto-generated or custom (e.g., "acme-corp")

### Step 3: Review and Submit

Review all information and click **Complete Onboarding**. The system will:

1. ✅ Create organization in database
2. ✅ Create Zitadel project with OIDC application
3. ✅ Create support user in Zitadel
4. ✅ Set up Tailscale integration with encrypted API key
5. ✅ Generate invitation token (expires in 24 hours)
6. ✅ Send invitation email to support user
7. ✅ Configure initial ACLs and policies
8. ✅ Record audit log

### Step 4: Deploy Client Stack (Optional)

After onboarding, deploy the client-specific infrastructure:

```bash
# Generate configuration from template
cd docker/templates
./generate-client-stack.sh <CLIENT_ID>

# Start services
cd ../clients/<CLIENT_ID>
docker-compose up -d

# Verify services are running
docker-compose ps
```

## Support User - First Login

### Step 1: Receive Invitation Email

The support user will receive an email with:
- Welcome message
- Invitation link (valid for 24 hours)
- Brief overview of next steps

### Step 2: Complete Authentication

1. Click the invitation link in the email
2. You'll be redirected to Zitadel authentication
3. If first time, you'll need to:
   - Verify your email address
   - Set a strong password (minimum 12 characters)
   - Accept terms and conditions

### Step 3: Setup MFA (Mandatory)

Multi-factor authentication is required for all support users:

1. **TOTP (Recommended)**
   - Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
   - Enter 6-digit code to verify
   - Save backup codes in a secure location

2. **WebAuthn (Optional)**
   - Use security key (YubiKey, Titan, etc.)
   - Follow browser prompts to register device

### Step 4: Access Portal Dashboard

After MFA setup, you'll be redirected to the portal dashboard where you can:
- View enrolled devices
- Manage users and groups
- Configure access policies
- Enroll new devices
- View audit logs

## Device Enrollment

### For Support Users

1. Navigate to **My Devices** or **Enroll** page
2. Click **Enroll New Device**
3. Select device type:
   - **Windows** - Workstations and servers
   - **Linux** - Ubuntu, Debian, CentOS, etc.
   - **macOS** - Mac computers
   - **Mobile** - iOS and Android devices

4. Click **Generate Enrollment Token**
5. Copy the Tailscale auth key
6. Follow platform-specific instructions

### Windows Installation

```powershell
# Download Tailscale
$url = "https://pkgs.tailscale.com/stable/tailscale-setup-latest-amd64.msi"
$output = "$env:TEMP\tailscale-setup.msi"
Invoke-WebRequest -Uri $url -OutFile $output

# Install
msiexec /i $output /qn

# Start and authenticate
tailscale up --authkey=<YOUR_AUTH_KEY>

# Verify connection
tailscale status
```

### Linux Installation

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Authenticate and connect
sudo tailscale up --authkey=<YOUR_AUTH_KEY>

# Verify connection
tailscale status
```

### macOS Installation

```bash
# Install via Homebrew
brew install tailscale

# Or download from https://tailscale.com/download/mac

# Start and authenticate
sudo tailscale up --authkey=<YOUR_AUTH_KEY>

# Verify connection
tailscale status
```

### Mobile (iOS/Android)

1. Install Tailscale app from App Store or Google Play
2. Open app and tap "Get Started"
3. Enter the auth key when prompted
4. Device will automatically connect

### Verification

Once enrolled, devices will appear in:
- Portal dashboard (My Devices page)
- Tailscale admin console
- Device list with status: Online/Offline

## Security Features

### Encrypted Secret Management

All sensitive data is encrypted at rest using pgcrypto:
- Tailscale API keys
- Zitadel client secrets
- Database passwords
- Enrollment tokens
- Cloud provider credentials

```sql
-- Secrets are never stored in plain text
-- Example: Storing a secret
SELECT store_encrypted_secret(
  '<org-id>',
  'api_key',
  'secret-value',
  'api_key',
  '{"service": "tailscale"}'::jsonb
);

-- Only admins can decrypt
SELECT get_decrypted_secret('<secret-id>');
```

### Token Expiration

All enrollment tokens have expiration:
- Invitation tokens: 24 hours
- Device enrollment tokens: 30 days (configurable)
- Tokens can only be used once

### Audit Logging

All administrative actions are logged:
- User creation and modification
- Device enrollment
- Policy changes
- Secret access
- Authentication events

### Row Level Security (RLS)

Database-level security ensures:
- Users can only see data from their organization
- Admins have elevated permissions
- Global admins can manage all organizations

## Troubleshooting

### Invitation Email Not Received

1. Check spam/junk folder
2. Verify email address is correct in admin panel
3. Check email service logs
4. Resend invitation from admin panel

### MFA Setup Issues

1. Ensure authenticator app time is synchronized
2. Use backup codes if primary method fails
3. Contact global admin to reset MFA

### Device Won't Enroll

1. Verify auth key hasn't expired
2. Check network connectivity
3. Ensure Tailscale service is running
4. Check firewall rules
5. Verify organization tag is correct

### Access Denied to Portal

1. Verify user account is active
2. Check organization assignment
3. Ensure MFA is completed
4. Clear browser cache and cookies
5. Try different browser

### Cannot Access Resources

1. Check user-resource assignments in admin panel
2. Verify Pomerium policies
3. Check Tailscale ACLs
4. Ensure device is online in Tailscale

## Support Contacts

- **Technical Support**: support@nexus-access-vault.com
- **Security Issues**: security@nexus-access-vault.com
- **Documentation**: https://docs.nexus-access-vault.com

---

## API Reference

For programmatic access, see:
- [API Documentation](./API.md)
- [Integration Guide](./INTEGRATION.md)
- [Developer Guide](./DEVELOPER.md)
