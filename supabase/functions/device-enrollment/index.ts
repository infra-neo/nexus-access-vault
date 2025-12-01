import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EnrollmentPayload {
  action: 'generate_token' | 'enroll' | 'verify'
  device_name?: string
  device_type?: string
  os?: string
  fingerprint?: string
  enrollment_token?: string
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

    switch (payload.action) {
      case 'generate_token': {
        // Generate a unique enrollment token
        const enrollmentToken = crypto.randomUUID()
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

        // Get user's organization
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single()

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
            status: 'pending',
            trust_level: 'low',
            metadata: { expires_at: expiresAt.toISOString() }
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
            expires_at: expiresAt.toISOString()
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
        // Verify enrollment token from QR code
        if (!payload.enrollment_token || !payload.fingerprint) {
          return new Response(
            JSON.stringify({ error: 'Enrollment token and fingerprint required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Find pending device with this token
        const { data: device, error: fetchError } = await supabase
          .from('devices')
          .select('*')
          .eq('enrollment_token', payload.enrollment_token)
          .eq('status', 'pending')
          .maybeSingle()

        if (fetchError || !device) {
          return new Response(
            JSON.stringify({ error: 'Invalid or expired enrollment token' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check expiration
        const expiresAt = new Date(device.metadata?.expires_at || 0)
        if (expiresAt < new Date()) {
          await supabase.from('devices').delete().eq('id', device.id)
          return new Response(
            JSON.stringify({ error: 'Enrollment token expired' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Complete enrollment
        const { error: updateError } = await supabase
          .from('devices')
          .update({
            fingerprint: payload.fingerprint,
            name: payload.device_name || device.name,
            os: payload.os || device.os,
            device_type: payload.device_type || device.device_type,
            enrolled_at: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            status: 'active',
            trust_level: 'high',
            enrollment_token: null,
            metadata: { ...device.metadata, expires_at: null }
          })
          .eq('id', device.id)

        if (updateError) {
          console.error('Error completing enrollment:', updateError)
          return new Response(
            JSON.stringify({ error: 'Failed to complete enrollment' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Log enrollment event
        await supabase.from('device_events').insert({
          device_id: device.id,
          event_type: 'enrolled',
          details: { method: 'qr_code', os: payload.os },
          ip_address: req.headers.get('x-forwarded-for') || 'unknown'
        })

        // Log audit
        await supabase.from('audit_logs').insert({
          user_id: device.user_id,
          organization_id: device.organization_id,
          event: 'device_enrolled',
          details: { device_id: device.id, device_name: device.name, method: 'qr_code' }
        })

        return new Response(
          JSON.stringify({
            success: true,
            device_id: device.id,
            status: 'active',
            message: 'Device verified and enrolled successfully'
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