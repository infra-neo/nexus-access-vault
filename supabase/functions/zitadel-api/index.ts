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

// List groups from Zitadel Management API
async function listGroups(issuerUrl: string, apiToken: string): Promise<ZitadelGroup[]> {
  const response = await fetch(`${issuerUrl}/management/v1/projects/me/roles/_search`, {
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
    // Try alternative endpoint for groups
    const groupsResponse = await fetch(`${issuerUrl}/management/v1/orgs/me/members/_search`, {
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

    if (!groupsResponse.ok) {
      console.error('Groups fetch failed, trying user grants...')
      return await listUserGrants(issuerUrl, apiToken)
    }

    const data = await groupsResponse.json()
    return data.result?.map((m: any) => ({
      id: m.userId,
      name: m.roles?.join(', ') || 'member',
      displayName: m.preferredLoginName || m.email,
    })) || []
  }

  const data = await response.json()
  return data.result?.map((role: any) => ({
    id: role.key,
    name: role.key,
    displayName: role.displayName || role.key,
  })) || []
}

// List user grants (roles/groups assigned to users)
async function listUserGrants(issuerUrl: string, apiToken: string): Promise<ZitadelGroup[]> {
  const response = await fetch(`${issuerUrl}/auth/v1/users/me/grants/_search`, {
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
    console.error('User grants fetch failed:', response.status)
    return []
  }

  const data = await response.json()
  const rolesSet = new Set<string>()
  const groups: ZitadelGroup[] = []

  data.result?.forEach((grant: any) => {
    grant.roles?.forEach((role: string) => {
      if (!rolesSet.has(role)) {
        rolesSet.add(role)
        groups.push({
          id: role,
          name: role,
          displayName: role,
        })
      }
    })
  })

  return groups
}

// Search users in Zitadel
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
function generateAuthUrl(config: ZitadelConfig, state: string, nonce: string) {
  const params = new URLSearchParams({
    client_id: config.client_id,
    redirect_uri: config.redirect_uri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
    nonce,
  })

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`Zitadel API action: ${action}`)

    // Get config ID from request
    const body = req.method === 'POST' ? await req.json() : {}
    const configId = body.configId || url.searchParams.get('configId')

    // Actions that require a config
    if (['get-auth-url', 'exchange-code', 'get-user-info', 'list-groups', 'search-users', 'sync-groups', 'get-user-groups'].includes(action || '')) {
      if (!configId) {
        throw new Error('configId is required')
      }

      // Fetch Zitadel configuration
      const { data: config, error: configError } = await supabase
        .from('zitadel_configurations')
        .select('*')
        .eq('id', configId)
        .eq('is_active', true)
        .single()

      if (configError || !config) {
        throw new Error('Zitadel configuration not found or inactive')
      }

      switch (action) {
        case 'get-auth-url': {
          const state = crypto.randomUUID()
          const nonce = crypto.randomUUID()
          const authUrl = generateAuthUrl(config, state, nonce)
          
          return new Response(
            JSON.stringify({ authUrl, state, nonce }),
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

          // Extract groups from token claims
          const groups = userInfo.groups || userInfo['urn:zitadel:iam:org:project:roles'] || []

          return new Response(
            JSON.stringify({
              tokens,
              userInfo,
              groups,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        case 'get-user-info': {
          const { accessToken } = body
          if (!accessToken) {
            throw new Error('Access token is required')
          }

          const userInfo = await getUserInfo(config.issuer_url, accessToken)
          return new Response(
            JSON.stringify(userInfo),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        case 'list-groups': {
          if (!config.api_token) {
            throw new Error('API token not configured for this Zitadel instance')
          }

          const groups = await listGroups(config.issuer_url, config.api_token)
          return new Response(
            JSON.stringify({ groups }),
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

          const { zitadelUserId } = body
          if (!zitadelUserId) {
            throw new Error('Zitadel user ID is required')
          }

          const groups = await getUserGroups(config.issuer_url, config.api_token, zitadelUserId)
          return new Response(
            JSON.stringify({ groups }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        case 'sync-groups': {
          if (!config.api_token) {
            throw new Error('API token not configured for this Zitadel instance')
          }

          // Get groups from Zitadel
          const zitadelGroups = await listGroups(config.issuer_url, config.api_token)

          // Get existing mappings
          const { data: existingMappings } = await supabase
            .from('zitadel_group_mappings')
            .select('*')
            .eq('zitadel_config_id', configId)

          const existingGroupIds = new Set(existingMappings?.map(m => m.zitadel_group_id) || [])

          // Create mappings for new groups
          const newGroups = zitadelGroups.filter(g => !existingGroupIds.has(g.id))
          
          if (newGroups.length > 0) {
            const { error: insertError } = await supabase
              .from('zitadel_group_mappings')
              .insert(newGroups.map(g => ({
                zitadel_config_id: configId,
                zitadel_group_id: g.id,
                zitadel_group_name: g.displayName || g.name,
              })))

            if (insertError) {
              console.error('Failed to insert group mappings:', insertError)
            }
          }

          // Get updated mappings
          const { data: allMappings } = await supabase
            .from('zitadel_group_mappings')
            .select('*, groups(*)')
            .eq('zitadel_config_id', configId)

          return new Response(
            JSON.stringify({
              zitadelGroups,
              mappings: allMappings,
              newGroupsAdded: newGroups.length,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        default:
          throw new Error(`Unknown action with config: ${action}`)
      }
    }

    // Actions that don't require a config
    switch (action) {
      case 'test-connection': {
        const { issuerUrl, apiToken } = body
        if (!issuerUrl) {
          throw new Error('Issuer URL is required')
        }

        // Test OIDC discovery
        const discovery = await getOIDCDiscovery(issuerUrl)

        // Test API connection if token provided
        let apiConnected = false
        let groups: ZitadelGroup[] = []
        
        if (apiToken) {
          try {
            groups = await listGroups(issuerUrl, apiToken)
            apiConnected = true
          } catch (e) {
            console.error('API connection test failed:', e)
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            oidcEndpoints: {
              authorization: discovery.authorization_endpoint,
              token: discovery.token_endpoint,
              userinfo: discovery.userinfo_endpoint,
            },
            apiConnected,
            groupCount: groups.length,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get-discovery': {
        const { issuerUrl } = body
        if (!issuerUrl) {
          throw new Error('Issuer URL is required')
        }

        const discovery = await getOIDCDiscovery(issuerUrl)
        return new Response(
          JSON.stringify(discovery),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        throw new Error(`Unknown action: ${action}`)
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Zitadel API error:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
