import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EnrollmentPayload {
  action: 'generate_token' | 'enroll' | 'verify' | 'create_pending_device' | 'check_tailscale_status'
  device_name?: string
  device_type?: string
  os?: string
  fingerprint?: string
  enrollment_token?: string
  user_id?: string
  organization_id?: string
  tailscale_auth_key?: string
}

// Input validation constants
const MAX_NAME_LENGTH = 100
const MAX_OS_LENGTH = 50
const MAX_FINGERPRINT_LENGTH = 100
const ALLOWED_DEVICE_TYPES = ['laptop', 'desktop', 'mobile', 'tablet', 'windows', 'macos']

// Validation helpers
const validateDeviceName = (name: string): boolean => {
  return typeof name === 'string' && name.length > 0 && name.length <= MAX_NAME_LENGTH
}

const validateDeviceType = (type: string): boolean => {
  return ALLOWED_DEVICE_TYPES.includes(type)
}

const validateOS = (os: string): boolean => {
  return typeof os === 'string' && os.length > 0 && os.length <= MAX_OS_LENGTH
}

const validateFingerprint = (fingerprint: string): boolean => {
  return typeof fingerprint === 'string' && 
         /^[a-zA-Z0-9-]+$/.test(fingerprint) && 
         fingerprint.length <= MAX_FINGERPRINT_LENGTH
}

// Get Tailscale auth key from organization config or env
async function getTailscaleAuthKey(supabase: any, organizationId: string | null): Promise<string | null> {
  // First try to get from organization config
  if (organizationId) {
    const { data: config } = await supabase
      .from('organization_tailscale_config')
      .select('tailscale_auth_key')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (config?.tailscale_auth_key) {
      console.log('Using organization-specific Tailscale auth key')
      return config.tailscale_auth_key
    }
  }

  // Fallback to environment variable
  const envKey = Deno.env.get('TAILSCALE_AUTH_KEY')
  if (envKey) {
    console.log('Using environment Tailscale auth key')
    return envKey
  }

  return null
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

    // Get authorization header for user context
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create user-context client
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

    const payload: EnrollmentPayload = await req.json()
    console.log(`Device enrollment action: ${payload.action} for user: ${user.id}`)

    // Validate input fields
    if (payload.device_name && !validateDeviceName(payload.device_name)) {
      return new Response(
        JSON.stringify({ error: 'Invalid device name: must be 1-100 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (payload.device_type && !validateDeviceType(payload.device_type)) {
      return new Response(
        JSON.stringify({ error: `Invalid device type: must be one of ${ALLOWED_DEVICE_TYPES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (payload.os && !validateOS(payload.os)) {
      return new Response(
        JSON.stringify({ error: 'Invalid OS: must be 1-50 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (payload.fingerprint && !validateFingerprint(payload.fingerprint)) {
      return new Response(
        JSON.stringify({ error: 'Invalid fingerprint: must be alphanumeric with hyphens, max 100 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    switch (payload.action) {
      case 'create_pending_device': {
        // Admin creates a pending device for a user with Tailscale auth key
        // This is called when admin creates a new user or assigns a device
        
        const targetUserId = payload.user_id || user.id
        const organizationId = payload.organization_id

        // Get user's organization if not provided
        let orgId = organizationId
        if (!orgId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', targetUserId)
            .single()
          orgId = profile?.organization_id
        }

        // Get Tailscale auth key for this organization
        const tailscaleAuthKey = payload.tailscale_auth_key || await getTailscaleAuthKey(supabase, orgId || null)
        
        if (!tailscaleAuthKey) {
          return new Response(
            JSON.stringify({ error: 'No Tailscale auth key configured for this organization' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Generate enrollment token
        const enrollmentToken = crypto.randomUUID()
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

        // Create pending device with Tailscale auth key
        const { data: device, error: insertError } = await supabase
          .from('devices')
          .insert({
            user_id: targetUserId,
            organization_id: orgId,
            name: payload.device_name || 'Pending Device',
            device_type: payload.device_type || 'laptop',
            os: payload.os,
            enrollment_token: enrollmentToken,
            tailscale_auth_key: tailscaleAuthKey,
            enrollment_expires_at: expiresAt.toISOString(),
            status: 'pending',
            trust_level: 'low',
            metadata: { 
              created_by: user.id,
              tailscale_tags: ['tag:prod'],
              tailscale_group: 'sap',
            }
          })
          .select()
          .single()

        if (insertError) {
          console.error('Error creating pending device:', insertError)
          return new Response(
            JSON.stringify({ error: 'Failed to create pending device' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Log event
        await supabase.from('device_events').insert({
          device_id: device.id,
          event_type: 'pending_device_created',
          details: { 
            created_by: user.id,
            expires_at: expiresAt.toISOString(),
          },
          ip_address: req.headers.get('x-forwarded-for') || 'unknown'
        })

        // Log audit
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          organization_id: orgId,
          event: 'pending_device_created',
          details: { 
            device_id: device.id, 
            target_user_id: targetUserId,
            enrollment_token: enrollmentToken,
          }
        })

        console.log(`Created pending device ${device.id} with enrollment token for user ${targetUserId}`)

        return new Response(
          JSON.stringify({
            success: true,
            device_id: device.id,
            enrollment_token: enrollmentToken,
            expires_at: expiresAt.toISOString(),
            message: 'Pending device created. User can enroll using the enrollment token.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'generate_token': {
        // Generate a unique enrollment token
        const enrollmentToken = crypto.randomUUID()
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

        // Get user's organization
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single()

        // Get Tailscale auth key
        const tailscaleAuthKey = await getTailscaleAuthKey(supabase, profile?.organization_id)

        // Create pending device entry
        const { data: device, error: insertError } = await supabase
          .from('devices')
          .insert({
            user_id: user.id,
            organization_id: profile?.organization_id,
            name: payload.device_name || 'New Device',
            device_type: payload.device_type || 'laptop',
            os: payload.os,
            enrollment_token: enrollmentToken,
            tailscale_auth_key: tailscaleAuthKey,
            enrollment_expires_at: expiresAt.toISOString(),
            status: 'pending',
            trust_level: 'low',
            metadata: { 
              tailscale_tags: ['tag:prod'],
              tailscale_group: 'sap',
            }
          })
          .select()
          .single()

        if (insertError) {
          console.error('Error creating device:', insertError)
          return new Response(
            JSON.stringify({ error: 'Failed to generate enrollment token' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Log enrollment event
        await supabase.from('device_events').insert({
          device_id: device.id,
          event_type: 'enrollment_initiated',
          details: { method: 'qr_code' },
          ip_address: req.headers.get('x-forwarded-for') || 'unknown'
        })

        return new Response(
          JSON.stringify({
            success: true,
            enrollment_token: enrollmentToken,
            device_id: device.id,
            expires_at: expiresAt.toISOString(),
            has_tailscale_key: !!tailscaleAuthKey,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'enroll': {
        // Silent enrollment - device provides fingerprint
        if (!payload.fingerprint) {
          return new Response(
            JSON.stringify({ error: 'Device fingerprint required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check if device already enrolled
        const { data: existingDevice } = await supabase
          .from('devices')
          .select('id, status')
          .eq('fingerprint', payload.fingerprint)
          .eq('user_id', user.id)
          .maybeSingle()

        if (existingDevice) {
          // Update last seen
          await supabase
            .from('devices')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', existingDevice.id)

          return new Response(
            JSON.stringify({
              success: true,
              device_id: existingDevice.id,
              status: existingDevice.status,
              message: 'Device already enrolled'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get user's organization
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single()

        // Create new enrolled device
        const { data: device, error: insertError } = await supabase
          .from('devices')
          .insert({
            user_id: user.id,
            organization_id: profile?.organization_id,
            name: payload.device_name || 'Auto-enrolled Device',
            device_type: payload.device_type || 'laptop',
            os: payload.os,
            fingerprint: payload.fingerprint,
            enrolled_at: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            status: 'active',
            trust_level: 'medium'
          })
          .select()
          .single()

        if (insertError) {
          console.error('Error enrolling device:', insertError)
          return new Response(
            JSON.stringify({ error: 'Failed to enroll device' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Log enrollment event
        await supabase.from('device_events').insert({
          device_id: device.id,
          event_type: 'enrolled',
          details: { method: 'silent', os: payload.os },
          ip_address: req.headers.get('x-forwarded-for') || 'unknown'
        })

        // Log audit
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          organization_id: profile?.organization_id,
          event: 'device_enrolled',
          details: { device_id: device.id, device_name: device.name, method: 'silent' }
        })

        return new Response(
          JSON.stringify({
            success: true,
            device_id: device.id,
            status: 'active',
            message: 'Device enrolled successfully'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'verify': {
        // Verify enrollment token and return Tailscale auth key
        if (!payload.enrollment_token) {
          return new Response(
            JSON.stringify({ error: 'Enrollment token required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Find pending device with this token
        const { data: device, error: fetchError } = await supabase
          .from('devices')
          .select('*, organizations(name)')
          .eq('enrollment_token', payload.enrollment_token)
          .eq('status', 'pending')
          .maybeSingle()

        if (fetchError || !device) {
          console.log('Token validation failed:', fetchError || 'Device not found')
          return new Response(
            JSON.stringify({ error: 'Token inválido o expirado. Contacta a tu administrador.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check expiration
        const expiresAt = device.enrollment_expires_at ? new Date(device.enrollment_expires_at) : null
        if (expiresAt && expiresAt < new Date()) {
          console.log('Token expired:', expiresAt)
          return new Response(
            JSON.stringify({ error: 'Token de enrolamiento expirado. Solicita uno nuevo a tu administrador.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get Tailscale auth key from device or organization
        let tailscaleAuthKey = device.tailscale_auth_key
        if (!tailscaleAuthKey) {
          tailscaleAuthKey = await getTailscaleAuthKey(supabase, device.organization_id)
        }

        if (!tailscaleAuthKey) {
          return new Response(
            JSON.stringify({ error: 'No hay clave de Tailscale configurada. Contacta a tu administrador.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Update device with validation timestamp
        await supabase
          .from('devices')
          .update({
            device_type: payload.device_type || device.device_type,
            fingerprint: payload.fingerprint,
            metadata: {
              ...device.metadata,
              token_validated_at: new Date().toISOString(),
            }
          })
          .eq('id', device.id)

        // Log event
        await supabase.from('device_events').insert({
          device_id: device.id,
          event_type: 'token_validated',
          details: { 
            device_type: payload.device_type,
            has_tailscale_key: true,
          },
          ip_address: req.headers.get('x-forwarded-for') || 'unknown'
        })

        console.log(`Token validated for device ${device.id}, returning Tailscale auth key`)

        return new Response(
          JSON.stringify({
            success: true,
            device_id: device.id,
            device_name: device.name,
            organization_name: device.organizations?.name || 'Tu Organización',
            tailscale_auth_key: tailscaleAuthKey,
            tailscale_tags: device.metadata?.tailscale_tags || ['tag:prod'],
            tailscale_group: device.metadata?.tailscale_group || 'sap',
            expires_at: device.enrollment_expires_at,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'check_tailscale_status': {
        // Check if device has connected to Tailscale
        const deviceId = payload.enrollment_token // Using this field to pass device ID

        if (!deviceId) {
          return new Response(
            JSON.stringify({ error: 'Device ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get device
        const { data: device, error: fetchError } = await supabase
          .from('devices')
          .select('*')
          .eq('id', deviceId)
          .single()

        if (fetchError || !device) {
          return new Response(
            JSON.stringify({ error: 'Device not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Call Tailscale API to check for new devices
        try {
          const tailscaleApiUrl = `${supabaseUrl}/functions/v1/tailscale-api`
          const response = await fetch(`${tailscaleApiUrl}?action=sync-devices`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ 
              organization_id: device.organization_id,
              device_name_hint: device.name,
            }),
          })

          if (response.ok) {
            const result = await response.json()
            
            // Check if we found a matching device
            if (result.matched_device) {
              // Update device with Tailscale info
              await supabase
                .from('devices')
                .update({
                  status: 'active',
                  enrolled_at: new Date().toISOString(),
                  last_seen: new Date().toISOString(),
                  tailscale_device_id: result.matched_device.id,
                  tailscale_hostname: result.matched_device.hostname,
                  tailscale_ip: result.matched_device.ip,
                  trust_level: 'high',
                  enrollment_token: null, // Clear token after successful enrollment
                  tailscale_auth_key: null, // Clear auth key for security
                })
                .eq('id', device.id)

              // Log event
              await supabase.from('device_events').insert({
                device_id: device.id,
                event_type: 'tailscale_connected',
                details: { 
                  tailscale_device_id: result.matched_device.id,
                  tailscale_hostname: result.matched_device.hostname,
                  tailscale_ip: result.matched_device.ip,
                },
                ip_address: req.headers.get('x-forwarded-for') || 'unknown'
              })

              // Log audit
              await supabase.from('audit_logs').insert({
                user_id: device.user_id,
                organization_id: device.organization_id,
                event: 'device_enrolled_tailscale',
                details: { 
                  device_id: device.id, 
                  tailscale_hostname: result.matched_device.hostname,
                }
              })

              return new Response(
                JSON.stringify({
                  success: true,
                  status: 'active',
                  tailscale_connected: true,
                  tailscale_hostname: result.matched_device.hostname,
                  tailscale_ip: result.matched_device.ip,
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }
          }
        } catch (err) {
          console.error('Error checking Tailscale status:', err)
        }

        // Not connected yet
        return new Response(
          JSON.stringify({
            success: true,
            status: device.status,
            tailscale_connected: false,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Device enrollment error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})