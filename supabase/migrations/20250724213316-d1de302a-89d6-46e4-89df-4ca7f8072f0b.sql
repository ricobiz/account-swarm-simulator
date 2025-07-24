-- Fix remaining functions with search path issues
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, subscription_status)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    'basic',
    'trial'
  );
  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND role::text = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.update_multilogin_tokens_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Update profiles RLS policies to prevent privilege escalation
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

-- Users can only update their own profile but not change role
CREATE POLICY "profiles_update_restricted" 
ON public.profiles 
FOR UPDATE 
USING (
  id = auth.uid() 
  AND public.get_current_user_role() = 'admin'
  AND public.can_modify_user_role(id, role::text)
);

-- Create a secure update trigger to prevent role escalation
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- If role is being changed
  IF OLD.role != NEW.role THEN
    -- Check if user can modify this role
    IF NOT public.can_modify_user_role(NEW.id, NEW.role::text) THEN
      RAISE EXCEPTION 'Unauthorized role modification attempt';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to prevent role escalation
DROP TRIGGER IF EXISTS prevent_role_escalation_trigger ON public.profiles;
CREATE TRIGGER prevent_role_escalation_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();