import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TailscaleDevice {
  id: string
  name: string
  hostname: string
  user: string
  ipAddresses: string[]
  lastSeen: string
  online: boolean
  os: string
  clientVersion: string
  tags?: string[]
}

interface TailscaleAuthKeyRequest {
  capabilities: {
    devices: {
      create: {
        reusable: boolean
        ephemeral: boolean
        preauthorized: boolean
        tags?: string[]
      }
    }
  }
  expirySeconds?: number
  description?: string
}

// Get OAuth access token using client credentials
async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get('TAILSCALE_CLIENT_ID')
  const clientSecret = Deno.env.get('TAILSCALE_CLIENT_SECRET')
  
  if (!clientId || !clientSecret) {
    throw new Error('Tailscale OAuth credentials not configured')
  }

  const response = await fetch('https://api.tailscale.com/api/v2/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('OAuth token error:', error)
    throw new Error('Failed to obtain Tailscale access token')
  }

  const data = await response.json()
  return data.access_token
}

// Get tailnet name from OAuth token
async function getTailnet(accessToken: string): Promise<string> {
  const response = await fetch('https://api.tailscale.com/api/v2/tailnet/-/devices', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  // If we can access with -, return it, otherwise extract from error
  if (response.ok) {
    return '-'
  }

  // Try to get tailnet from whoami
  const whoamiResponse = await fetch('https://api.tailscale.com/api/v2/whoami', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (whoamiResponse.ok) {
    const data = await whoamiResponse.json()
    return data.tailnet?.name || '-'
  }

  return '-'
}

// List all devices in the tailnet
async function listDevices(accessToken: string, tailnet: string): Promise<TailscaleDevice[]> {
  const response = await fetch(`https://api.tailscale.com/api/v2/tailnet/${tailnet}/devices`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('List devices error:', error)
    throw new Error('Failed to list Tailscale devices')
  }

  const data = await response.json()
  return data.devices || []
}

// Get device by hostname or IP
async function findDevice(accessToken: string, tailnet: string, identifier: string): Promise<TailscaleDevice | null> {
  const devices = await listDevices(accessToken, tailnet)
  
  // Search by hostname, name, or IP
  const device = devices.find(d => 
    d.hostname?.toLowerCase() === identifier.toLowerCase() ||
    d.name?.toLowerCase().includes(identifier.toLowerCase()) ||
    d.ipAddresses?.includes(identifier)
  )

  return device || null
}

// Generate a pre-authorized auth key for new device enrollment
async function generateAuthKey(accessToken: string, tailnet: string, tags: string[], description: string): Promise<{ key: string, expiresAt: string }> {
  // Use the stored auth key instead of generating via API
  const storedAuthKey = Deno.env.get('TAILSCALE_AUTH_KEY')
  
  if (storedAuthKey) {
    console.log('Using stored Tailscale auth key')
    // Return the stored key with 24h expiry
    return {
      key: storedAuthKey,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  }

  // Fallback: try to generate via API (requires auth-keys:write scope)
  const body: TailscaleAuthKeyRequest = {
    capabilities: {
      devices: {
        create: {
          reusable: true,
          ephemeral: false,
          preauthorized: true,
          tags: tags.length > 0 ? tags : undefined,
        },
      },
    },
    expirySeconds: 86400, // 24 hours
    description: description,
  }

  const response = await fetch(`https://api.tailscale.com/api/v2/tailnet/${tailnet}/keys`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Generate auth key error:', error)
    throw new Error('Failed to generate Tailscale auth key')
  }

  const data = await response.json()
  return {
    key: data.key,
    expiresAt: data.expires,
  }
}

// Check if a device is online and get its status
async function getDeviceStatus(accessToken: string, deviceId: string): Promise<{ online: boolean, lastSeen: string, ipAddresses: string[] }> {
  const response = await fetch(`https://api.tailscale.com/api/v2/device/${deviceId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get device status')
  }

  const device = await response.json()
  return {
    online: device.online || false,
    lastSeen: device.lastSeen || new Date().toISOString(),
    ipAddresses: device.addresses || [],
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    // Get access token
    const accessToken = await getAccessToken()
    const tailnet = await getTailnet(accessToken)
    console.log(`Tailscale API action: ${action}, tailnet: ${tailnet}`)

    switch (action) {
      case 'list-devices': {
        const devices = await listDevices(accessToken, tailnet)
        return new Response(
          JSON.stringify({ success: true, devices }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'check-device': {
        // Check if a specific device is online
        const body = await req.json()
        const { identifier } = body

        if (!identifier) {
          return new Response(
            JSON.stringify({ error: 'Device identifier required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const device = await findDevice(accessToken, tailnet, identifier)
        
        if (!device) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              found: false,
              online: false,
              message: 'Device not found in Tailscale network'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            found: true,
            online: device.online,
            device: {
              id: device.id,
              name: device.name,
              hostname: device.hostname,
              os: device.os,
              lastSeen: device.lastSeen,
              ipAddresses: device.ipAddresses,
              tags: device.tags,
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'generate-auth-key': {
        // Generate a new auth key for device enrollment
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: 'Authorization required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verify user
        const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
          global: { headers: { Authorization: authHeader } }
        })
        const { data: { user }, error: authError } = await userClient.auth.getUser()
        
        if (authError || !user) {
          return new Response(
            JSON.stringify({ error: 'Invalid authentication' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const body = await req.json()
        const { deviceId, tags = ['tag:prod'], group = 'sap' } = body

        // Get user's profile and organization
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, organization_id, organizations(name)')
          .eq('id', user.id)
          .single()

        const orgName = (profile?.organizations as { name?: string } | null)?.name || 'Unknown Org'
        const description = `Enrollment for ${profile?.full_name || user.email} - ${orgName}`
        
        try {
          const authKey = await generateAuthKey(accessToken, tailnet, tags, description)
          
          // Update device with the auth key
          if (deviceId) {
            await supabase
              .from('devices')
              .update({
                metadata: {
                  tailscale_auth_key: authKey.key,
                  tailscale_key_expires: authKey.expiresAt,
                  tailscale_tags: tags,
                  tailscale_group: group,
                },
              })
              .eq('id', deviceId)

            // Log the event
            await supabase.from('device_events').insert({
              device_id: deviceId,
              event_type: 'tailscale_auth_key_generated',
              details: { tags, group, expiresAt: authKey.expiresAt },
            })
          }

          return new Response(
            JSON.stringify({ 
              success: true, 
              authKey: authKey.key,
              expiresAt: authKey.expiresAt,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } catch (err) {
          console.error('Error generating auth key:', err)
          return new Response(
            JSON.stringify({ error: 'Failed to generate auth key' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      case 'validate-enrollment': {
        // Validate that a device has successfully enrolled in Tailscale
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: 'Authorization required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const body = await req.json()
        const { deviceId, hostname } = body

        if (!deviceId) {
          return new Response(
            JSON.stringify({ error: 'Device ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check if device exists in Tailscale
        const devices = await listDevices(accessToken, tailnet)
        const tailscaleDevice = hostname 
          ? devices.find(d => d.hostname?.toLowerCase() === hostname.toLowerCase())
          : null

        if (tailscaleDevice && tailscaleDevice.online) {
          // Update device status in database
          await supabase
            .from('devices')
            .update({
              status: 'active',
              enrolled_at: new Date().toISOString(),
              last_seen: new Date().toISOString(),
              trust_level: 'high',
              metadata: {
                tailscale_device_id: tailscaleDevice.id,
                tailscale_hostname: tailscaleDevice.hostname,
                tailscale_ip: tailscaleDevice.ipAddresses?.[0],
                tailscale_os: tailscaleDevice.os,
                tailscale_tags: tailscaleDevice.tags,
              },
            })
            .eq('id', deviceId)

          // Log enrollment success
          await supabase.from('device_events').insert({
            device_id: deviceId,
            event_type: 'tailscale_enrollment_complete',
            details: {
              tailscale_device_id: tailscaleDevice.id,
              hostname: tailscaleDevice.hostname,
              ip: tailscaleDevice.ipAddresses?.[0],
            },
          })

          return new Response(
            JSON.stringify({ 
              success: true, 
              enrolled: true,
              device: {
                id: tailscaleDevice.id,
                hostname: tailscaleDevice.hostname,
                online: tailscaleDevice.online,
                ipAddresses: tailscaleDevice.ipAddresses,
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            enrolled: false,
            message: 'Device not yet visible in Tailscale network'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'sync-devices': {
        // Sync all Tailscale devices with local database
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: 'Authorization required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const devices = await listDevices(accessToken, tailnet)
        
        // Get all local devices
        const { data: localDevices } = await supabase
          .from('devices')
          .select('id, name, metadata, last_seen')
          .eq('status', 'active')

        let synced = 0
        for (const localDevice of localDevices || []) {
          const metadata = localDevice.metadata as Record<string, unknown> | null
          const tsDeviceId = metadata?.tailscale_device_id as string | undefined
          const tsHostname = metadata?.tailscale_hostname as string | undefined

          const tailscaleDevice = devices.find(d => 
            d.id === tsDeviceId || 
            d.hostname?.toLowerCase() === tsHostname?.toLowerCase()
          )

          if (tailscaleDevice) {
            await supabase
              .from('devices')
              .update({
                last_seen: tailscaleDevice.online ? new Date().toISOString() : localDevice.last_seen,
                metadata: {
                  ...localDevice.metadata,
                  tailscale_online: tailscaleDevice.online,
                  tailscale_last_seen: tailscaleDevice.lastSeen,
                  tailscale_ip: tailscaleDevice.ipAddresses?.[0],
                },
              })
              .eq('id', localDevice.id)
            synced++
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            synced,
            totalTailscaleDevices: devices.length,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Valid actions: list-devices, check-device, generate-auth-key, validate-enrollment, sync-devices' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error: unknown) {
    console.error('Tailscale API error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
