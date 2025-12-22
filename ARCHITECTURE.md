# Technical Architecture Documentation

## System Overview

The Nexus Access Vault is a comprehensive Zero Trust Network Access (ZTNA) management platform built with a multi-tenant architecture. It provides centralized identity management, secure device enrollment, and fine-grained access control for distributed organizations.

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              GLOBAL LAYER                                     │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Zitadel (Identity Provider)                                           │  │
│  │  - Multi-tenant OIDC/OAuth2                                           │  │
│  │  - MFA (TOTP, WebAuthn)                                               │  │
│  │  - User & Group Management                                            │  │
│  │  - Project-based isolation                                            │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Nexus Access Vault (Control Plane)                                    │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │  │
│  │  │  React Frontend  │  │  Supabase        │  │  PostgreSQL      │   │  │
│  │  │  - Admin Panel   │→ │  - Auth          │→ │  - Multi-tenant  │   │  │
│  │  │  - User Portal   │  │  - RLS           │  │  - Encrypted     │   │  │
│  │  │  - Enrollment    │  │  - Real-time     │  │  - Audit Logs    │   │  │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
┌───────────────────▼──────────┐    ┌──────────────────▼──────────────┐
│      CLIENT A STACK          │    │      CLIENT B STACK              │
│                              │    │                                  │
│  ┌────────────────────────┐  │    │  ┌────────────────────────┐    │
│  │  Pomerium (Access      │  │    │  │  Pomerium (Access      │    │
│  │  Proxy)                │  │    │  │  Proxy)                │    │
│  │  - OIDC Integration    │  │    │  │  - OIDC Integration    │    │
│  │  - Policy Engine       │  │    │  │  - Policy Engine       │    │
│  │  - Zero Trust Access   │  │    │  │  - Zero Trust Access   │    │
│  └────────────────────────┘  │    │  └────────────────────────┘    │
│                              │    │                                  │
│  ┌────────────────────────┐  │    │  ┌────────────────────────┐    │
│  │  Tailscale (Mesh VPN)  │  │    │  │  Tailscale (Mesh VPN)  │    │
│  │  - Device Enrollment   │  │    │  │  - Device Enrollment   │    │
│  │  - ACLs per Client     │  │    │  │  - ACLs per Client     │    │
│  │  - Secure Networking   │  │    │  │  - Secure Networking   │    │
│  └────────────────────────┘  │    │  └────────────────────────┘    │
│                              │    │                                  │
│  ┌────────────────────────┐  │    │  ┌────────────────────────┐    │
│  │  Cloud Resources       │  │    │  │  Cloud Resources       │    │
│  │  - GCP Instances       │  │    │  │  - LXD Containers      │    │
│  │  - LXD Containers      │  │    │  │  - AWS EC2             │    │
│  │  - Private Networks    │  │    │  │  - Private Networks    │    │
│  └────────────────────────┘  │    │  └────────────────────────┘    │
└──────────────────────────────┘    └──────────────────────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v6
- **Form Handling**: React Hook Form with Zod validation

### Backend
- **Database**: PostgreSQL 15+ with pgcrypto extension
- **Backend-as-a-Service**: Supabase
  - Row Level Security (RLS)
  - Real-time subscriptions
  - Edge Functions (serverless)
- **API**: REST + GraphQL via PostgREST

### Infrastructure
- **Container Orchestration**: Docker Compose
- **Access Proxy**: Pomerium
- **Mesh VPN**: Tailscale
- **Identity Provider**: Zitadel
- **Monitoring**: Prometheus + Grafana

### Cloud Integrations
- **GCP**: Compute Engine API
- **LXD/LXC**: REST API over TLS
- **AWS**: EC2 API (future)
- **Azure**: Compute API (future)

## Database Schema

### Core Tables

#### organizations
Represents client organizations in multi-tenant setup.

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### profiles
User profiles linked to auth.users with organization assignment.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TYPE user_role AS ENUM ('global_admin', 'org_admin', 'support', 'user');
```

#### encrypted_secrets
Stores all sensitive data with pgcrypto encryption.

```sql
CREATE TABLE encrypted_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  secret_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(organization_id, key_name, secret_type)
);
```

#### zitadel_projects
Zitadel project configuration per organization.

```sql
CREATE TABLE zitadel_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL UNIQUE,
  project_name TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_secret_ref UUID REFERENCES encrypted_secrets(id),
  oidc_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### tailscale_organizations
Tailscale integration per organization.

```sql
CREATE TABLE tailscale_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  tailnet TEXT NOT NULL,
  api_key_ref UUID REFERENCES encrypted_secrets(id),
  organization_tag TEXT,
  acl_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### enrollment_tokens
Secure tokens for device and user enrollment.

```sql
CREATE TABLE enrollment_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  token_type TEXT NOT NULL,
  device_type TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### cloud_providers
Cloud provider integrations.

```sql
CREATE TABLE cloud_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  credentials_ref UUID REFERENCES encrypted_secrets(id),
  config JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, provider_type, provider_name)
);
```

## Security Architecture

### Encryption at Rest

All sensitive data is encrypted using PostgreSQL's pgcrypto extension:

```sql
-- Encryption key is stored in environment variable
-- and loaded via PostgREST configuration
SET app.encryption_key = '<master-encryption-key>';

-- Encrypt data
SELECT pgp_sym_encrypt('secret-value', current_setting('app.encryption_key'));

-- Decrypt data
SELECT pgp_sym_decrypt(encrypted_value::bytea, current_setting('app.encryption_key'));
```

### Row Level Security (RLS)

Database-level security ensures data isolation:

```sql
-- Users can only access data from their organization
CREATE POLICY "Users access own org data" ON profiles
FOR ALL USING (
  organization_id = (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- Admins have elevated permissions
CREATE POLICY "Admins manage org resources" ON resources
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND organization_id = resources.organization_id
    AND role IN ('org_admin', 'global_admin')
  )
);
```

### Token Security

- **Enrollment tokens**: SHA-256 hashed, single-use, time-limited
- **Invitation tokens**: Random 32-byte tokens, 24-hour expiry
- **API keys**: Stored encrypted with pgcrypto, never exposed in logs

### Authentication Flow

```
1. User → Zitadel Login Page
2. Zitadel → MFA Challenge (TOTP/WebAuthn)
3. User → MFA Response
4. Zitadel → OIDC Token (JWT)
5. Application → Validate Token with Zitadel
6. Application → Create Supabase Session
7. Application → Load User Profile with RLS
```

## API Endpoints

### Supabase Functions

#### store_encrypted_secret
```sql
SELECT store_encrypted_secret(
  p_org_id UUID,
  p_key_name TEXT,
  p_secret_value TEXT,
  p_secret_type TEXT,
  p_metadata JSONB DEFAULT '{}',
  p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID;
```

#### generate_enrollment_token
```sql
SELECT generate_enrollment_token(
  p_org_id UUID,
  p_user_id UUID,
  p_token_type TEXT,
  p_device_type TEXT DEFAULT NULL,
  p_expires_hours INTEGER DEFAULT 24,
  p_metadata JSONB DEFAULT '{}'
) RETURNS TABLE(token_id UUID, token TEXT);
```

#### validate_enrollment_token
```sql
SELECT validate_enrollment_token(
  p_token TEXT,
  p_token_type TEXT
) RETURNS TABLE(
  is_valid BOOLEAN,
  token_id UUID,
  user_id UUID,
  organization_id UUID,
  metadata JSONB
);
```

### REST API (via PostgREST)

#### List Organizations
```
GET /organizations
Authorization: Bearer <supabase-jwt>
```

#### Create Organization (Admin only)
```
POST /organizations
Authorization: Bearer <supabase-jwt>
Content-Type: application/json

{
  "name": "Acme Corporation",
  "logo_url": "https://example.com/logo.png"
}
```

#### List Devices
```
GET /resources?organization_id=eq.<org-id>&resource_type=eq.tailscale_node
Authorization: Bearer <supabase-jwt>
```

## Integration Architecture

### Tailscale Integration

```typescript
// Generate auth key for device enrollment
const authKey = await createTailscaleAuthKey(organizationId, {
  reusable: true,
  preauthorized: true,
  tags: ['support'],
  expirySeconds: 86400
});

// List devices in tailnet
const devices = await listTailscaleDevices(organizationId);

// Update ACLs
await updateTailscaleACL(organizationId, {
  acls: [
    {
      action: 'accept',
      src: ['tag:support'],
      dst: ['tag:resources:*']
    }
  ]
});
```

### Zitadel Integration

```typescript
// Create project and OIDC app
const { projectId, clientId, userId } = await setupZitadelForOrganization(
  organizationId,
  organizationName,
  supportEmail,
  supportFirstName,
  supportLastName,
  appUrl
);

// Assign roles
await assignUserToProject(userId, projectId, ['admin', 'support']);
```

### GCP Integration

```typescript
// Create instance with Tailscale
const instance = await createGCPInstance(organizationId, {
  name: 'app-server-01',
  machineType: 'e2-medium',
  zone: 'us-central1-a',
  diskSizeGb: 50,
  imageFamily: 'ubuntu-2204-lts',
  imageProject: 'ubuntu-os-cloud',
  metadata: [
    {
      key: 'startup-script',
      value: generateGCPStartupScript(authKey)
    }
  ]
});
```

### LXD Integration

```typescript
// Create container with cloud-init
const container = await createLXDInstance(organizationId, {
  name: 'web-01',
  type: 'container',
  image: {
    server: 'https://images.linuxcontainers.org',
    alias: 'ubuntu/22.04'
  },
  profiles: ['default', 'tailscale'],
  config: {
    'cloud-init.user-data': generateLXDCloudInit(authKey)
  }
});
```

## Deployment Architecture

### Per-Client Stack

Each client organization gets an isolated stack:

```yaml
services:
  pomerium:
    image: pomerium/pomerium:latest
    environment:
      - IDP_PROVIDER=oidc
      - IDP_PROVIDER_URL=${ZITADEL_DOMAIN}
      - IDP_CLIENT_ID=${ZITADEL_CLIENT_ID}
      - IDP_CLIENT_SECRET=${ZITADEL_CLIENT_SECRET}
      - POLICY=${POLICY_JSON}
    networks:
      - client_${CLIENT_ID}
  
  tailscale:
    image: tailscale/tailscale:latest
    environment:
      - TS_AUTHKEY=${TAILSCALE_AUTH_KEY}
      - TS_EXTRA_ARGS=--advertise-tags=tag:${ORG_TAG}
    cap_add:
      - NET_ADMIN
    networks:
      - client_${CLIENT_ID}
```

### Network Architecture

```
Internet
    │
    ├─→ Pomerium (443) ──→ Zitadel Auth
    │                   └─→ Backend Services
    │
    └─→ Tailscale Mesh
         ├─→ User Devices
         ├─→ GCP Instances
         └─→ LXD Containers
```

## Monitoring & Observability

### Audit Logging

All administrative actions are logged:

```sql
INSERT INTO audit_logs (
  organization_id,
  user_id,
  event,
  details
) VALUES (
  '<org-id>',
  '<user-id>',
  'device_enrolled',
  '{"device_name": "laptop-01", "device_type": "macos"}'::jsonb
);
```

### Metrics

Prometheus collects metrics from:
- Pomerium (requests, latency, errors)
- Tailscale (connections, bandwidth)
- Application (API calls, auth events)
- Database (queries, connections)

## Scalability Considerations

### Multi-Tenant Isolation
- Database-level RLS
- Per-client Docker networks
- Separate Tailscale tailnets
- Zitadel project isolation

### Horizontal Scaling
- Stateless application servers
- Connection pooling for PostgreSQL
- Supabase edge functions for compute
- CDN for static assets

### Performance Optimization
- Database indexes on frequently queried columns
- Materialized views for complex queries
- Redis caching for session data
- Asset optimization and lazy loading

## Future Enhancements

1. **Multi-region deployment** - Deploy stacks in different regions
2. **Advanced monitoring** - Grafana dashboards, alerting
3. **Automated backups** - Scheduled database and config backups
4. **CI/CD integration** - Automated testing and deployment
5. **Mobile apps** - Native iOS and Android applications
6. **Advanced analytics** - Usage patterns, security insights
7. **Compliance reporting** - SOC2, ISO 27001, GDPR reports
8. **API marketplace** - Third-party integrations

---

For implementation details, see:
- [Onboarding Guide](./ONBOARDING_GUIDE.md)
- [API Reference](./API.md)
- [Developer Guide](./DEVELOPER.md)
