import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get authenticated user
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user's role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      // Log unauthorized access attempt
      await supabase
        .from('security_events')
        .insert({
          user_id: user.id,
          event_type: 'UNAUTHORIZED_ADMIN_ACCESS',
          event_data: {
            user_email: user.email,
            timestamp: new Date().toISOString(),
            ip_address: req.headers.get('x-forwarded-for') || 'unknown'
          },
          severity: 'warning'
        })

      return new Response(
        JSON.stringify({ error: 'Admin privileges required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (req.method === 'POST') {
      const { action, targetUserId, newRole, accountsLimit, scenariosLimit } = await req.json()

      // Validate action
      const validActions = ['UPDATE_ROLE', 'UPDATE_LIMITS']
      if (!validActions.includes(action)) {
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Prevent self-modification
      if (targetUserId === user.id) {
        await supabase
          .from('security_events')
          .insert({
            user_id: user.id,
            event_type: 'SELF_MODIFICATION_ATTEMPT',
            event_data: {
              action,
              targetUserId,
              timestamp: new Date().toISOString()
            },
            severity: 'critical'
          })

        return new Response(
          JSON.stringify({ error: 'Cannot modify own account' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Get target user's current data
      const { data: targetUser, error: targetError } = await supabase
        .from('profiles')
        .select('role, accounts_limit, scenarios_limit')
        .eq('id', targetUserId)
        .single()

      if (targetError || !targetUser) {
        return new Response(
          JSON.stringify({ error: 'Target user not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      let updateData: any = {}
      let actionDescription = ''

      if (action === 'UPDATE_ROLE') {
        // Validate role
        const validRoles = ['admin', 'premium', 'basic']
        if (!validRoles.includes(newRole)) {
          return new Response(
            JSON.stringify({ error: 'Invalid role' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        updateData.role = newRole
        actionDescription = `Role changed from ${targetUser.role} to ${newRole}`
      } else if (action === 'UPDATE_LIMITS') {
        // Validate limits
        if (typeof accountsLimit !== 'number' || typeof scenariosLimit !== 'number' ||
            accountsLimit < 0 || scenariosLimit < 0 || 
            accountsLimit > 1000 || scenariosLimit > 100) {
          return new Response(
            JSON.stringify({ error: 'Invalid limits' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        updateData.accounts_limit = accountsLimit
        updateData.scenarios_limit = scenariosLimit
        actionDescription = `Limits updated: accounts ${targetUser.accounts_limit} -> ${accountsLimit}, scenarios ${targetUser.scenarios_limit} -> ${scenariosLimit}`
      }

      // Perform the update
      const { data: updatedUser, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', targetUserId)
        .select()
        .single()

      if (updateError) {
        console.error('Update error:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update user' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Log the successful admin action
      await supabase
        .from('security_events')
        .insert({
          user_id: user.id,
          event_type: 'ADMIN_ACTION_SUCCESS',
          event_data: {
            action,
            targetUserId,
            adminEmail: user.email,
            description: actionDescription,
            timestamp: new Date().toISOString(),
            ip_address: req.headers.get('x-forwarded-for') || 'unknown'
          },
          severity: 'info'
        })

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: updatedUser,
          message: 'User updated successfully' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Admin action error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})