import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ZitadelConfig {
  id: string
  issuer_url: string
  client_id: string
  client_secret: string
  redirect_uri: string
  scopes: string[]
  api_token: string
  project_id?: string
  sync_groups: boolean
}

interface ZitadelGroup {
  id: string
  name: string
  displayName: string
}

interface ZitadelUser {
  id: string
  userName: string
  email: string
  displayName: string
  groups: string[]
  grantId?: string
  projectId?: string
  projectName?: string
  orgId?: string
  orgName?: string
}

// Get OIDC discovery document
async function getOIDCDiscovery(issuerUrl: string) {
  const response = await fetch(`${issuerUrl}/.well-known/openid-configuration`)
  if (!response.ok) {
    throw new Error(`Failed to fetch OIDC discovery: ${response.status}`)
  }
  return await response.json()
}

// Exchange authorization code for tokens
async function exchangeCodeForTokens(
  config: ZitadelConfig,
  code: string,
  codeVerifier?: string
) {
  const discovery = await getOIDCDiscovery(config.issuer_url)
  
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.client_id,
    code,
    redirect_uri: config.redirect_uri,
  })

  if (config.client_secret) {
    params.append('client_secret', config.client_secret)
  }

  if (codeVerifier) {
    params.append('code_verifier', codeVerifier)
  }

  const response = await fetch(discovery.token_endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Token exchange error:', error)
    throw new Error(`Token exchange failed: ${response.status}`)
  }

  return await response.json()
}

// Get user info from Zitadel
async function getUserInfo(issuerUrl: string, accessToken: string) {
  const discovery = await getOIDCDiscovery(issuerUrl)
  
  const response = await fetch(discovery.userinfo_endpoint, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to get user info: ${response.status}`)
  }

  return await response.json()
}

// List project roles from Zitadel Management API
async function listProjectRoles(issuerUrl: string, apiToken: string, projectId?: string): Promise<ZitadelGroup[]> {
  // If projectId is provided, use specific project endpoint, otherwise use /projects/me/roles
  const endpoint = projectId 
    ? `${issuerUrl}/management/v1/projects/${projectId}/roles/_search`
    : `${issuerUrl}/management/v1/projects/me/roles/_search`
  
  console.log('Fetching roles from:', endpoint)
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: {
        limit: 1000,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Roles fetch failed:', response.status, errorText)
    
    // Try alternative endpoint for org members if project roles fail
    console.log('Trying org members endpoint...')
    return await listOrgMembers(issuerUrl, apiToken)
  }

  const data = await response.json()
  console.log('Roles found:', data.result?.length || 0)
  
  return data.result?.map((role: any) => ({
    id: role.key,
    name: role.key,
    displayName: role.displayName || role.key,
  })) || []
}

// List organization members as fallback
async function listOrgMembers(issuerUrl: string, apiToken: string): Promise<ZitadelGroup[]> {
  const response = await fetch(`${issuerUrl}/management/v1/orgs/me/members/_search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: {
        limit: 1000,
      },
    }),
  })

  if (!response.ok) {
    console.error('Org members fetch failed:', response.status)
    return []
  }

  const data = await response.json()
  return data.result?.map((m: any) => ({
    id: m.userId,
    name: m.roles?.join(', ') || 'member',
    displayName: m.preferredLoginName || m.email,
  })) || []
}

// List groups using legacy method (for backwards compatibility)
async function listGroups(issuerUrl: string, apiToken: string, projectId?: string): Promise<ZitadelGroup[]> {
  return listProjectRoles(issuerUrl, apiToken, projectId)
}

// List user grants (authorizations) from Zitadel - users with roles on a project
async function listProjectUserGrants(issuerUrl: string, apiToken: string, projectId?: string): Promise<ZitadelUser[]> {
  const endpoint = `${issuerUrl}/management/v1/users/grants/_search`
  
  console.log('Fetching user grants from:', endpoint, 'projectId:', projectId)
  
  const requestBody: any = {
    query: {
      limit: 1000,
    },
  }
  
  // Filter by project if provided
  if (projectId) {
    requestBody.queries = [{
      projectIdQuery: {
        projectId: projectId,
      },
    }]
  }
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('User grants fetch failed:', response.status, errorText)
    
    // Try alternative approach: list project members
    if (projectId) {
      console.log('Trying project members endpoint as fallback...')
      return await listProjectMembers(issuerUrl, apiToken, projectId)
    }
    
    // If still failing, return empty with informative message
    throw new Error(`Failed to fetch user grants: ${response.status}. Ensure the service account has 'org.grant.read' permission.`)
  }

  const data = await response.json()
  console.log('User grants found:', data.result?.length || 0)
  
  return data.result?.map((grant: any) => ({
    id: grant.userId,
    userName: grant.userName || grant.preferredLoginName,
    email: grant.email || grant.preferredLoginName,
    displayName: grant.displayName || `${grant.firstName || ''} ${grant.lastName || ''}`.trim() || grant.userName,
    groups: grant.roleKeys || [],
    grantId: grant.id,
    projectId: grant.projectId,
    projectName: grant.projectName,
    orgId: grant.orgId,
    orgName: grant.orgName,
  })) || []
}

// List project members (users who can administer the project)
async function listProjectMembers(issuerUrl: string, apiToken: string, projectId: string): Promise<ZitadelUser[]> {
  const endpoint = `${issuerUrl}/management/v1/projects/${projectId}/members/_search`
  
  console.log('Fetching project members from:', endpoint)
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: {
        limit: 1000,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Project members fetch failed:', response.status, errorText)
    return []
  }

  const data = await response.json()
  console.log('Project members found:', data.result?.length || 0)
  
  return data.result?.map((member: any) => ({
    id: member.userId,
    userName: member.preferredLoginName || member.email,
    email: member.email || member.preferredLoginName,
    displayName: member.displayName || member.preferredLoginName,
    groups: member.roles || [],
    projectId: projectId,
  })) || []
}

// Search all users in the organization
async function searchAllOrgUsers(issuerUrl: string, apiToken: string): Promise<ZitadelUser[]> {
  const endpoint = `${issuerUrl}/management/v1/users/_search`
  
  console.log('Searching all organization users from:', endpoint)
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: {
        limit: 1000,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Users search failed:', response.status, errorText)
    throw new Error(`Failed to search users: ${response.status}`)
  }

  const data = await response.json()
  console.log('Organization users found:', data.result?.length || 0)
  
  return data.result?.map((user: any) => ({
    id: user.id,
    userName: user.userName,
    email: user.human?.email?.email || user.userName,
    displayName: user.human?.profile?.displayName || 
                 `${user.human?.profile?.firstName || ''} ${user.human?.profile?.lastName || ''}`.trim() || 
                 user.userName,
    groups: [],
  })) || []
}

// Search users in Zitadel (with query filter)
async function searchUsers(issuerUrl: string, apiToken: string, query?: string): Promise<ZitadelUser[]> {
  const response = await fetch(`${issuerUrl}/management/v1/users/_search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: {
        limit: 100,
        ...(query && {
          queries: [{
            userNameQuery: {
              userName: query,
              method: 'TEXT_QUERY_METHOD_CONTAINS_IGNORE_CASE',
            },
          }],
        }),
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Users search failed:', error)
    throw new Error(`Failed to search users: ${response.status}`)
  }

  const data = await response.json()
  return data.result?.map((user: any) => ({
    id: user.id,
    userName: user.userName,
    email: user.human?.email?.email || user.userName,
    displayName: user.human?.profile?.displayName || user.userName,
    groups: [],
  })) || []
}

// Get user's groups/roles from Zitadel
async function getUserGroups(issuerUrl: string, apiToken: string, userId: string): Promise<string[]> {
  const response = await fetch(`${issuerUrl}/management/v1/users/${userId}/grants/_search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: {
        limit: 100,
      },
    }),
  })

  if (!response.ok) {
    console.error('User grants fetch failed:', response.status)
    return []
  }

  const data = await response.json()
  const roles: string[] = []
  
  data.result?.forEach((grant: any) => {
    grant.roles?.forEach((role: string) => {
      if (!roles.includes(role)) {
        roles.push(role)
      }
    })
  })

  return roles
}

// Generate OIDC authorization URL
function generateAuthUrl(config: ZitadelConfig, state: string, codeVerifier?: string) {
  const params = new URLSearchParams({
    client_id: config.client_id,
    redirect_uri: config.redirect_uri,
    response_type: 'code',
    scope: config.scopes?.join(' ') || 'openid profile email',
    state,
  })

  if (codeVerifier) {
    // PKCE flow
    const encoder = new TextEncoder()
    const data = encoder.encode(codeVerifier)
    // Note: In production, use proper crypto to hash the code_verifier
    params.append('code_challenge', codeVerifier)
    params.append('code_challenge_method', 'plain') // Use S256 in production
  }

  return `${config.issuer_url}/oauth/v2/authorize?${params.toString()}`
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    
    console.log('Zitadel API action:', action)

    // Parse body, handle empty body gracefully
    let body: any = {}
    try {
      const text = await req.text()
      if (text && text.trim()) {
        body = JSON.parse(text)
      }
    } catch (e) {
      console.log('No body or invalid JSON, continuing with empty body')
    }

    // For test-connection, we don't need a configId
    if (action === 'test-connection') {
      console.log('test-connection body:', JSON.stringify(body))
      const { issuerUrl, apiToken } = body

      if (!issuerUrl) {
        return new Response(
          JSON.stringify({ error: 'Issuer URL is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Testing connection to:', issuerUrl)

      // Test OIDC discovery
      try {
        console.log('Fetching discovery from:', `${issuerUrl}/.well-known/openid-configuration`)
        const discoveryResponse = await fetch(`${issuerUrl}/.well-known/openid-configuration`)
        
        if (!discoveryResponse.ok) {
          throw new Error(`OIDC Discovery failed: ${discoveryResponse.status}`)
        }
        
        const discoveryText = await discoveryResponse.text()
        if (!discoveryText || !discoveryText.trim()) {
          throw new Error('OIDC Discovery returned empty response')
        }
        
        const discovery = JSON.parse(discoveryText)
        console.log('Discovery successful:', discovery.issuer)
      } catch (e: any) {
        console.error('OIDC discovery error:', e.message)
        return new Response(
          JSON.stringify({ 
            error: `OIDC Discovery failed: ${e.message}. Ensure the issuer URL is correct and accessible.`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // If API token provided, test it
      let apiConnected = false
      let groupCount = 0
      if (apiToken) {
        try {
          const groups = await listProjectRoles(issuerUrl, apiToken)
          apiConnected = true
          groupCount = groups.length
          console.log('API connection successful, groups found:', groupCount)
        } catch (e: any) {
          console.error('API connection failed:', e.message)
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          apiConnected,
          groupCount,
          message: 'Connection successful'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // All other actions require a configId
    const { configId } = body
    if (!configId) {
      return new Response(
        JSON.stringify({ error: 'configId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch the config
    const { data: config, error: configError } = await supabaseClient
      .from('zitadel_configurations')
      .select('*')
      .eq('id', configId)
      .single()

    if (configError || !config) {
      console.error('Config fetch error:', configError)
      return new Response(
        JSON.stringify({ error: 'Configuration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Config loaded:', config.name, 'issuer:', config.issuer_url, 'project_id:', config.project_id)

    switch (action) {
      case 'list-groups':
      case 'sync-groups': {
        if (!config.api_token) {
          throw new Error('API token not configured for this Zitadel instance')
        }

        const projectId = config.project_id || body.projectId
        console.log('Syncing roles for project:', projectId)
        
        const zitadelGroups = await listGroups(config.issuer_url, config.api_token, projectId)

        // Sync with local database
        const existingMappings = await supabaseClient
          .from('zitadel_group_mappings')
          .select('zitadel_group_id')
          .eq('zitadel_config_id', configId)

        const existingIds = new Set(existingMappings.data?.map(m => m.zitadel_group_id) || [])
        
        const newMappings = zitadelGroups
          .filter(g => !existingIds.has(g.id))
          .map(g => ({
            zitadel_config_id: configId,
            zitadel_group_id: g.id,
            zitadel_group_name: g.displayName || g.name,
            auto_sync: true,
          }))

        if (newMappings.length > 0) {
          await supabaseClient
            .from('zitadel_group_mappings')
            .insert(newMappings)
        }

        const { data: mappings } = await supabaseClient
          .from('zitadel_group_mappings')
          .select('*, groups(id, name)')
          .eq('zitadel_config_id', configId)

        return new Response(
          JSON.stringify({ 
            zitadelGroups, 
            mappings,
            newGroupsAdded: newMappings.length,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'list-roles': {
        if (!config.api_token) {
          throw new Error('API token not configured for this Zitadel instance')
        }

        const projectId = config.project_id || body.projectId
        console.log('Listing roles for project:', projectId)
        
        const roles = await listProjectRoles(config.issuer_url, config.api_token, projectId)
        return new Response(
          JSON.stringify({ groups: roles, roles, projectId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'list-project-users': {
        if (!config.api_token) {
          throw new Error('API token not configured for this Zitadel instance')
        }

        const projectId = config.project_id || body.projectId
        console.log('Listing users for project:', projectId)
        
        let users: ZitadelUser[] = []
        let source = 'grants'
        
        try {
          // First try to get users with grants on the project
          users = await listProjectUserGrants(config.issuer_url, config.api_token, projectId)
          console.log('Got users from grants:', users.length)
        } catch (grantError: any) {
          console.log('Grant fetch failed, trying alternatives...', grantError.message)
          
          // If projectId exists, try project members
          if (projectId) {
            try {
              users = await listProjectMembers(config.issuer_url, config.api_token, projectId)
              source = 'project_members'
              console.log('Got users from project members:', users.length)
            } catch (memberError: any) {
              console.log('Project members fetch failed:', memberError.message)
            }
          }
          
          // If still no users, get all org users as fallback
          if (users.length === 0) {
            try {
              users = await searchAllOrgUsers(config.issuer_url, config.api_token)
              source = 'org_users'
              console.log('Got users from org search:', users.length)
            } catch (orgError: any) {
              console.error('All user fetch methods failed:', orgError.message)
              throw new Error(`Unable to fetch users. Ensure the service account has proper permissions (org.user.read or org.grant.read).`)
            }
          }
        }
        
        return new Response(
          JSON.stringify({ users, projectId, source }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'search-users': {
        if (!config.api_token) {
          throw new Error('API token not configured for this Zitadel instance')
        }

        const { query } = body
        const users = await searchUsers(config.issuer_url, config.api_token, query)
        return new Response(
          JSON.stringify({ users }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get-user-groups': {
        if (!config.api_token) {
          throw new Error('API token not configured for this Zitadel instance')
        }

        const { userId } = body
        if (!userId) {
          throw new Error('userId is required')
        }

        const groups = await getUserGroups(config.issuer_url, config.api_token, userId)
        return new Response(
          JSON.stringify({ groups }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'exchange-code': {
        const { code, codeVerifier } = body
        if (!code) {
          throw new Error('Authorization code is required')
        }

        const tokens = await exchangeCodeForTokens(config, code, codeVerifier)
        const userInfo = await getUserInfo(config.issuer_url, tokens.access_token)
        
        // Get user groups if API token available
        let groups: string[] = []
        if (config.api_token && userInfo.sub) {
          groups = await getUserGroups(config.issuer_url, config.api_token, userInfo.sub)
        }

        return new Response(
          JSON.stringify({ 
            tokens,
            userInfo,
            groups,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get-auth-url': {
        const { state, codeVerifier } = body
        if (!state) {
          throw new Error('State is required')
        }

        const authUrl = generateAuthUrl(config, state, codeVerifier)
        return new Response(
          JSON.stringify({ authUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error: any) {
    console.error('Zitadel API error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
