# Security Documentation

## Security Overview

Nexus Access Vault implements multiple layers of security following Zero Trust principles. This document outlines the security architecture, best practices, and compliance considerations.

## Security Principles

### Zero Trust Architecture

1. **Never Trust, Always Verify** - Every request is authenticated and authorized
2. **Least Privilege Access** - Users get minimum permissions needed
3. **Assume Breach** - Systems designed to contain and detect breaches
4. **Verify Explicitly** - Authentication, authorization, and encryption at every layer

### Defense in Depth

Multiple security layers ensure protection:
- Network security (Tailscale mesh VPN)
- Application security (Pomerium access proxy)
- Data security (encryption at rest and in transit)
- Identity security (Zitadel with MFA)
- Infrastructure security (container isolation)

## Authentication & Authorization

### Multi-Factor Authentication (MFA)

**Required for**: All support and admin users
**Methods supported**:
- TOTP (Time-based One-Time Password) - Google Authenticator, Authy, etc.
- WebAuthn/FIDO2 - Hardware security keys (YubiKey, Titan)
- Biometric authentication (when available)

**Configuration**:
```typescript
// MFA is enforced at Zitadel level
// Users must complete MFA setup before accessing portal
const mfaPolicy = {
  required: true,
  methods: ['totp', 'webauthn'],
  gracePeriod: 0 // No grace period
};
```

### OAuth 2.0 / OIDC Flow

1. User initiates login → Redirected to Zitadel
2. Zitadel authenticates → User provides credentials + MFA
3. Zitadel returns → Authorization code
4. Application exchanges → Authorization code for JWT
5. Application validates → JWT signature and claims
6. Application creates → Supabase session with RLS

**Token Validation**:
```typescript
// JWT validation includes:
- Signature verification with Zitadel public key
- Expiration check (exp claim)
- Issuer verification (iss claim)
- Audience verification (aud claim)
- Custom claims (roles, organization)
```

### Role-Based Access Control (RBAC)

**Roles**:
- `global_admin` - Full system access, manages all organizations
- `org_admin` - Manages own organization, all resources
- `support` - Technical support, device enrollment, user management
- `user` - Basic access to assigned resources

**Permissions Matrix**:

| Action | User | Support | Org Admin | Global Admin |
|--------|------|---------|-----------|--------------|
| View own devices | ✅ | ✅ | ✅ | ✅ |
| Enroll devices | ✅ | ✅ | ✅ | ✅ |
| View org users | ❌ | ✅ | ✅ | ✅ |
| Create users | ❌ | ✅ | ✅ | ✅ |
| Manage policies | ❌ | ❌ | ✅ | ✅ |
| View secrets | ❌ | ❌ | ✅ | ✅ |
| Create organizations | ❌ | ❌ | ❌ | ✅ |
| Onboard clients | ❌ | ❌ | ❌ | ✅ |

## Data Security

### Encryption at Rest

**Database Encryption**:
All sensitive data is encrypted using PostgreSQL's pgcrypto extension with AES-256:

```sql
-- Encryption function
CREATE OR REPLACE FUNCTION encrypt_secret(secret TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    pgp_sym_encrypt(
      secret,
      current_setting('app.encryption_key')
    ),
    'base64'
  );
END;
$$ LANGUAGE plpgsql;

-- Decryption function (admin only)
CREATE OR REPLACE FUNCTION decrypt_secret(encrypted TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Check permissions
  IF get_user_role(auth.uid()) NOT IN ('org_admin', 'global_admin') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  RETURN pgp_sym_decrypt(
    decode(encrypted, 'base64'),
    current_setting('app.encryption_key')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Encrypted Data Types**:
- Tailscale API keys
- Zitadel client secrets
- Cloud provider credentials
- Database passwords
- Private keys and certificates
- Enrollment tokens (hashed)

**Key Management**:
- Master encryption key stored in environment variable
- Never logged or exposed in UI
- Rotated annually or on suspected compromise
- Backed up securely offline

### Encryption in Transit

**TLS/SSL Configuration**:
- All HTTP traffic uses TLS 1.3
- Strong cipher suites only
- Perfect Forward Secrecy (PFS) enabled
- HSTS headers enforced

**Certificate Management**:
```yaml
# Automatic cert renewal with Let's Encrypt
pomerium:
  autocert: true
  autocert_dir: /pomerium/certs
  
# Manual certificates
certificate_file: /path/to/cert.pem
certificate_key_file: /path/to/key.pem
```

**Tailscale Encryption**:
- WireGuard protocol (ChaCha20-Poly1305)
- Automatic key rotation
- End-to-end encryption
- No central decryption point

### Data Classification

| Level | Examples | Storage | Access |
|-------|----------|---------|--------|
| Public | Documentation, logos | Unencrypted | All users |
| Internal | User profiles, device lists | RLS protected | Org members |
| Confidential | API keys, tokens | Encrypted + RLS | Admins only |
| Secret | Master keys, root passwords | Encrypted + offline | Global admins |

## Network Security

### Zero Trust Networking

**Tailscale Implementation**:
```typescript
// ACL configuration per organization
const acl = {
  // Define tags for organization
  tagOwners: {
    'tag:acme-admin': ['user@acme.com'],
    'tag:acme-user': ['group:acme-users'],
  },
  
  // Define access rules
  acls: [
    {
      action: 'accept',
      src: ['tag:acme-admin'],
      dst: ['tag:acme-resources:*'],
    },
    {
      action: 'accept',
      src: ['tag:acme-user'],
      dst: ['tag:acme-resources:443,80'],
    },
  ],
  
  // SSH access controls
  ssh: [
    {
      action: 'accept',
      src: ['tag:acme-admin'],
      dst: ['tag:acme-resources'],
      users: ['root', 'admin'],
    },
  ],
};
```

### Network Segmentation

**Per-Client Isolation**:
- Separate Docker networks per organization
- Isolated Tailscale tailnets or tags
- Pomerium policies per client
- No cross-client network access

**Firewall Rules**:
```bash
# Default deny all
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow Tailscale
iptables -A INPUT -i tailscale0 -j ACCEPT

# Allow Pomerium from trusted sources only
iptables -A INPUT -p tcp --dport 443 -m state --state NEW,ESTABLISHED -j ACCEPT
```

## Vulnerability Management

### Dependency Scanning

**Automated Scanning**:
```json
{
  "scripts": {
    "audit": "npm audit --audit-level=high",
    "audit-fix": "npm audit fix",
    "security-check": "npm run audit && npm run lint"
  }
}
```

**Regular Updates**:
- Weekly dependency updates
- Security patches applied within 24 hours
- Major version updates tested in staging first

### Code Security

**Static Analysis**:
- CodeQL security scanning enabled
- ESLint with security rules
- SonarQube for code quality

**Input Validation**:
```typescript
import { z } from 'zod';

// All user input validated with Zod schemas
const userSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(100),
  password: z.string()
    .min(12)
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^a-zA-Z0-9]/, 'Must contain special char'),
});

// Sanitize HTML to prevent XSS
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput);
```

**SQL Injection Prevention**:
- Parameterized queries only
- PostgREST handles query building
- RLS policies prevent unauthorized access

```sql
-- Good: Parameterized query
SELECT * FROM users WHERE email = $1;

-- Bad: String concatenation (never used)
-- SELECT * FROM users WHERE email = '" + email + "';
```

## Secrets Management

### Secret Storage

**Never store in code**:
- Environment variables for configuration
- Encrypted database for credentials
- External secret managers for production

**Environment Variables**:
```bash
# .env (never committed to git)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
ZITADEL_CLIENT_SECRET=<encrypted-value>
TAILSCALE_API_KEY=<encrypted-value>
ENCRYPTION_MASTER_KEY=<stored-offline>
```

**Secret Rotation**:
```typescript
// Automated rotation every 90 days
async function rotateAPIKey(organizationId: string) {
  // Generate new key
  const newKey = await generateSecureToken(32);
  
  // Store encrypted
  const secretId = await storeEncryptedSecret(
    organizationId,
    'api_key',
    newKey,
    'api_key'
  );
  
  // Update references
  await updateAPIKeyReferences(organizationId, secretId);
  
  // Audit log
  await logSecretRotation(organizationId, 'api_key');
}
```

## Incident Response

### Detection

**Monitoring**:
- Failed login attempts (> 5 in 10 minutes)
- Unusual access patterns
- Privilege escalation attempts
- Data export/download spikes
- Geographic anomalies

**Alerts**:
```yaml
# Prometheus alerting rules
groups:
  - name: security
    rules:
      - alert: FailedLoginSpike
        expr: rate(failed_logins[5m]) > 10
        for: 5m
        annotations:
          summary: "High rate of failed logins detected"
      
      - alert: PrivilegeEscalation
        expr: increase(role_changes[1h]) > 3
        annotations:
          summary: "Multiple role changes detected"
```

### Response Procedures

**Incident Severity Levels**:

| Level | Example | Response Time | Actions |
|-------|---------|---------------|---------|
| P1 - Critical | Data breach, system compromise | < 15 minutes | Immediate lockdown |
| P2 - High | Suspicious access, MFA bypass | < 1 hour | Investigate, restrict |
| P3 - Medium | Failed login spike, unusual patterns | < 4 hours | Monitor, alert |
| P4 - Low | Single failed login, minor errors | < 24 hours | Log, review |

**Incident Response Steps**:
1. **Detect** - Automated alerts or manual report
2. **Contain** - Isolate affected systems, revoke tokens
3. **Investigate** - Analyze logs, identify scope
4. **Remediate** - Patch vulnerabilities, rotate secrets
5. **Recover** - Restore services, verify integrity
6. **Learn** - Post-mortem, update procedures

### Data Breach Protocol

1. **Immediate Actions**:
   - Disconnect affected systems
   - Revoke all access tokens
   - Enable read-only mode
   - Alert security team

2. **Investigation**:
   - Identify compromised data
   - Determine breach timeline
   - Document all findings
   - Preserve evidence

3. **Notification**:
   - Notify affected users (< 72 hours)
   - Report to authorities if required
   - Public disclosure if appropriate

4. **Remediation**:
   - Patch vulnerabilities
   - Reset all credentials
   - Implement additional controls
   - Enhanced monitoring

## Compliance & Standards

### GDPR Compliance

**Data Rights**:
- Right to access: Users can export their data
- Right to erasure: Complete data deletion on request
- Right to portability: Data export in JSON format
- Right to rectification: Users can update their data

**Implementation**:
```typescript
// Data export
async function exportUserData(userId: string) {
  const data = {
    profile: await getProfile(userId),
    devices: await getDevices(userId),
    auditLogs: await getAuditLogs(userId),
    // Exclude secrets and admin data
  };
  
  return JSON.stringify(data, null, 2);
}

// Data deletion
async function deleteUserData(userId: string) {
  // Soft delete with 30-day grace period
  await markUserDeleted(userId);
  
  // Schedule permanent deletion
  await scheduleDataDeletion(userId, 30);
  
  // Audit log
  await logDataDeletion(userId);
}
```

### SOC 2 Compliance

**Control Objectives**:
- Security: Access controls, encryption, monitoring
- Availability: 99.9% uptime, disaster recovery
- Processing Integrity: Data validation, error handling
- Confidentiality: Encryption, access restrictions
- Privacy: GDPR compliance, data handling

### Best Practices

**OWASP Top 10 Protection**:
1. ✅ Injection - Parameterized queries, input validation
2. ✅ Broken Authentication - MFA, strong passwords, session management
3. ✅ Sensitive Data Exposure - Encryption at rest/transit
4. ✅ XML External Entities - Not applicable (JSON only)
5. ✅ Broken Access Control - RLS, RBAC, authorization checks
6. ✅ Security Misconfiguration - Secure defaults, hardening
7. ✅ XSS - Input sanitization, CSP headers
8. ✅ Insecure Deserialization - JSON validation, type checking
9. ✅ Using Components with Known Vulnerabilities - Dependency scanning
10. ✅ Insufficient Logging & Monitoring - Comprehensive audit logs

## Security Checklist

### For Administrators

- [ ] Enable MFA for all admin accounts
- [ ] Rotate API keys every 90 days
- [ ] Review audit logs weekly
- [ ] Keep dependencies up to date
- [ ] Monitor security alerts
- [ ] Conduct security training quarterly
- [ ] Review and update access policies monthly
- [ ] Test incident response procedures annually

### For Developers

- [ ] Never commit secrets to git
- [ ] Use environment variables for configuration
- [ ] Validate all user input
- [ ] Sanitize output to prevent XSS
- [ ] Use parameterized queries
- [ ] Implement proper error handling
- [ ] Add security tests
- [ ] Document security considerations

### For Users

- [ ] Use strong, unique passwords
- [ ] Enable MFA on all accounts
- [ ] Don't share credentials
- [ ] Report suspicious activity
- [ ] Keep devices updated
- [ ] Use VPN when on public WiFi
- [ ] Verify URLs before clicking
- [ ] Lock devices when not in use

## Security Contact

For security issues or concerns:
- **Email**: security@nexus-access-vault.com
- **PGP Key**: Available at security.txt
- **Bug Bounty**: Contact for responsible disclosure

**Response Times**:
- Critical vulnerabilities: < 24 hours
- High severity: < 72 hours
- Medium severity: < 1 week
- Low severity: < 1 month

---

Last Updated: December 2025
Next Review: March 2026
