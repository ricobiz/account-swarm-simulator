-- Fix database function security by adding search_path protection
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN COALESCE(
    (SELECT role::text FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    'basic'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'basic';
END;
$function$;

-- Fix audit function security
CREATE OR REPLACE FUNCTION public.audit_sensitive_operation(operation_type text, table_name text, record_id uuid, details jsonb DEFAULT NULL::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    INSERT INTO public.logs (user_id, action, details, status)
    VALUES (
        auth.uid(),
        format('AUDIT: %s on %s', operation_type, table_name),
        jsonb_build_object(
            'operation', operation_type,
            'table', table_name,
            'record_id', record_id,
            'details', details,
            'timestamp', now(),
            'user_id', auth.uid()
        ),
        'audit'
    );
END;
$function$;

-- Add admin role validation function to prevent privilege escalation
CREATE OR REPLACE FUNCTION public.can_modify_user_role(target_user_id uuid, new_role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    current_user_role app_role;
    target_user_role app_role;
BEGIN
    -- Get current user's role
    SELECT role INTO current_user_role 
    FROM public.profiles 
    WHERE id = auth.uid();
    
    -- Get target user's current role
    SELECT role INTO target_user_role
    FROM public.profiles 
    WHERE id = target_user_id;
    
    -- Only admins can modify roles
    IF current_user_role != 'admin' THEN
        RETURN false;
    END IF;
    
    -- Users cannot modify their own role
    IF auth.uid() = target_user_id THEN
        RETURN false;
    END IF;
    
    -- Log the role change attempt
    INSERT INTO public.logs (user_id, action, details, status)
    VALUES (
        auth.uid(),
        'ROLE_CHANGE_ATTEMPT',
        jsonb_build_object(
            'target_user_id', target_user_id,
            'old_role', target_user_role,
            'new_role', new_role,
            'timestamp', now()
        ),
        'audit'
    );
    
    RETURN true;
END;
$function$;

-- Add RLS policy for admin-only profile updates
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_update_self" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid() AND id != auth.uid()) -- This will always be false, preventing self-updates
WITH CHECK (id = auth.uid() AND id != auth.uid());

CREATE POLICY "profiles_update_admin" 
ON public.profiles 
FOR UPDATE 
USING (
    public.get_current_user_role() = 'admin' 
    AND public.can_modify_user_role(id, role)
)
WITH CHECK (
    public.get_current_user_role() = 'admin' 
    AND public.can_modify_user_role(id, role)
);

-- Add security event logging table for better audit trails
CREATE TABLE IF NOT EXISTS public.security_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type text NOT NULL,
    event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    ip_address inet,
    user_agent text,
    timestamp timestamp with time zone NOT NULL DEFAULT now(),
    severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

-- Enable RLS on security events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read security events
CREATE POLICY "security_events_admin_read" 
ON public.security_events 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

-- System can insert security events (for edge functions)
CREATE POLICY "security_events_system_insert" 
ON public.security_events 
FOR INSERT 
WITH CHECK (true);