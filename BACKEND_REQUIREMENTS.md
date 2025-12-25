# Backend Implementation Requirements

This document outlines the backend services required for production deployment of Nexus Access Vault.

## Overview

The current implementation is a **frontend-heavy solution** with comprehensive UI, database schema, and API service designs. For production use, the following backend endpoints need to be implemented to handle secure operations that cannot be done safely in the browser.

## Required Backend Endpoints

### 1. Email Service

**Endpoint**: `POST /api/email/send`

**Purpose**: Send invitation and notification emails securely

**Request Body**:
```json
{
  "to": "user@example.com",
  "subject": "Welcome to Nexus Access Vault",
  "html": "<html>...</html>",
  "text": "Plain text version"
}
```

**Implementation Options**:
- SendGrid
- AWS SES
- Postmark
- SMTP server

**Security**:
- API key stored in backend environment variable
- Rate limiting (10 emails per minute per organization)
- Validate recipient email domains
- Log all sent emails

---

### 2. GCP Integration Proxy

**Endpoint**: `POST /api/gcp/token`

**Purpose**: Generate GCP access tokens using service account credentials

**Request Body**:
```json
{
  "organizationId": "uuid"
}
```

**Response**:
```json
{
  "accessToken": "ya29.c.Kl6iB...",
  "expiresAt": 1672531199
}
```

**Implementation**:
```javascript
const { GoogleAuth } = require('google-auth-library');

async function getGCPToken(organizationId) {
  // Retrieve service account key from encrypted_secrets
  const credentials = await getDecryptedSecret(organizationId, 'gcp_service_account');
  
  // Initialize auth
  const auth = new GoogleAuth({
    credentials: JSON.parse(credentials),
    scopes: ['https://www.googleapis.com/auth/compute']
  });
  
  // Get access token
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  
  return {
    accessToken: tokenResponse.token,
    expiresAt: Math.floor(Date.now() / 1000) + 3600
  };
}
```

**Security**:
- Verify user has admin role for organization
- Cache tokens until expiration
- Audit log all token requests

---

### 3. LXD Integration Proxy

**Endpoint**: `POST /api/lxd/proxy`

**Purpose**: Proxy LXD API calls with TLS client certificate authentication

**Request Body**:
```json
{
  "organizationId": "uuid",
  "endpoint": "https://lxd-server:8443",
  "path": "/1.0/instances",
  "method": "GET",
  "body": {}
}
```

**Response**:
```json
{
  "status": "Success",
  "data": [...]
}
```

**Implementation**:
```javascript
const https = require('https');

async function proxyLXDRequest(organizationId, endpoint, path, method, body) {
  // Retrieve client certificates from encrypted_secrets
  const credentials = await getDecryptedSecret(organizationId, 'lxd_certificates');
  const { clientCert, clientKey } = JSON.parse(credentials);
  
  // Configure HTTPS agent with client certificates
  const agent = new https.Agent({
    cert: clientCert,
    key: clientKey,
    rejectUnauthorized: true
  });
  
  // Make request to LXD server
  const response = await fetch(`${endpoint}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method !== 'GET' ? JSON.stringify(body) : undefined,
    agent
  });
  
  return await response.json();
}
```

**Security**:
- Verify user has admin role
- Validate endpoint is registered for organization
- Audit log all LXD API calls
- Rate limiting per organization

---

### 4. Zitadel Token Management

**Endpoint**: `GET /api/zitadel/token`

**Purpose**: Provide Zitadel management API token to authorized admins

**Response**:
```json
{
  "token": "eyJhbGciOiJ...",
  "expiresAt": 1672531199
}
```

**Implementation**:
```javascript
async function getZitadelToken(userId) {
  // Verify user is global_admin
  const user = await getUser(userId);
  if (user.role !== 'global_admin') {
    throw new Error('Unauthorized');
  }
  
  // Return cached token or fetch new one
  const token = process.env.ZITADEL_API_TOKEN;
  
  return {
    token,
    expiresAt: Math.floor(Date.now() / 1000) + 3600
  };
}
```

**Security**:
- Only accessible to global_admin role
- Token never logged or exposed in responses
- Implement token caching to reduce requests
- Audit log all token accesses

---

## Environment Variables Required

Backend service needs the following environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/nexus_vault
ENCRYPTION_MASTER_KEY=<generated-securely>

# Email Service
EMAIL_SERVICE=sendgrid  # or ses, postmark, smtp
EMAIL_API_KEY=<your-api-key>
EMAIL_FROM=noreply@yourdomain.com

# Zitadel
ZITADEL_DOMAIN=auth.yourdomain.com
ZITADEL_API_TOKEN=<service-account-token>

# Application
APP_URL=https://yourdomain.com
NODE_ENV=production
PORT=3000

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379
```

## Recommended Tech Stack

### Option 1: Node.js/Express

```bash
npm install express pg @google-cloud/compute
```

Pros:
- Same language as frontend (TypeScript)
- Large ecosystem
- Easy deployment

### Option 2: Python/FastAPI

```bash
pip install fastapi uvicorn psycopg2 google-cloud-compute
```

Pros:
- Great for API development
- Built-in async support
- Excellent documentation

### Option 3: Go

```bash
go get github.com/gin-gonic/gin
go get cloud.google.com/go/compute
```

Pros:
- High performance
- Strong typing
- Great for cloud services

## Implementation Checklist

### Setup Phase
- [ ] Choose tech stack
- [ ] Setup project structure
- [ ] Configure environment variables
- [ ] Setup database connection
- [ ] Implement authentication middleware

### Email Service
- [ ] Choose email provider
- [ ] Implement /api/email/send endpoint
- [ ] Add email templates
- [ ] Implement rate limiting
- [ ] Add error handling and retries

### GCP Integration
- [ ] Implement /api/gcp/token endpoint
- [ ] Add token caching
- [ ] Implement error handling
- [ ] Add audit logging

### LXD Integration
- [ ] Implement /api/lxd/proxy endpoint
- [ ] Add certificate handling
- [ ] Implement request validation
- [ ] Add audit logging

### Zitadel Integration
- [ ] Implement /api/zitadel/token endpoint
- [ ] Add role-based access control
- [ ] Implement token caching
- [ ] Add audit logging

### Security
- [ ] Implement rate limiting
- [ ] Add request validation
- [ ] Setup CORS policies
- [ ] Implement audit logging
- [ ] Add monitoring and alerting

### Testing
- [ ] Unit tests for each endpoint
- [ ] Integration tests
- [ ] Load testing
- [ ] Security testing

### Deployment
- [ ] Setup CI/CD pipeline
- [ ] Configure production environment
- [ ] Setup monitoring (Prometheus/Grafana)
- [ ] Configure log aggregation
- [ ] Setup automated backups

## Example Backend Implementation

### Minimal Express.js Backend

```javascript
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();

app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Authentication middleware
async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  req.user = user;
  next();
}

// Email endpoint
app.post('/api/email/send', authenticate, async (req, res) => {
  const { to, subject, html, text } = req.body;
  
  // Implement email sending
  // const result = await sendEmail(to, subject, html, text);
  
  res.json({ success: true });
});

// GCP token endpoint
app.post('/api/gcp/token', authenticate, async (req, res) => {
  const { organizationId } = req.body;
  
  // Verify user has access
  // Generate and return GCP token
  
  res.json({ accessToken: '...', expiresAt: Date.now() + 3600 });
});

// LXD proxy endpoint
app.post('/api/lxd/proxy', authenticate, async (req, res) => {
  const { organizationId, endpoint, path, method, body } = req.body;
  
  // Proxy request to LXD server with certificates
  
  res.json({ status: 'Success', data: {} });
});

// Zitadel token endpoint
app.get('/api/zitadel/token', authenticate, async (req, res) => {
  // Verify global admin role
  // Return Zitadel API token
  
  res.json({ token: '...', expiresAt: Date.now() + 3600 });
});

app.listen(3000, () => {
  console.log('Backend API listening on port 3000');
});
```

## Testing the Backend

```bash
# Test email endpoint
curl -X POST http://localhost:3000/api/email/send \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "Test",
    "html": "<p>Test</p>",
    "text": "Test"
  }'

# Test GCP token endpoint
curl -X POST http://localhost:3000/api/gcp/token \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"organizationId": "uuid"}'
```

## Production Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - ENCRYPTION_MASTER_KEY=${ENCRYPTION_MASTER_KEY}
      - EMAIL_API_KEY=${EMAIL_API_KEY}
      - ZITADEL_API_TOKEN=${ZITADEL_API_TOKEN}
    depends_on:
      - postgres
    restart: unless-stopped
```

## Support

For questions or assistance implementing the backend:
- Email: support@nexus-access-vault.com
- Documentation: See ARCHITECTURE.md and SECURITY.md

## Next Steps

1. Choose your tech stack
2. Implement the 4 required endpoints
3. Test thoroughly
4. Deploy to production
5. Update frontend to use backend endpoints

The frontend is **ready to use** once these backend endpoints are implemented!
