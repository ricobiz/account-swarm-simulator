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

-- Update profiles RLS policies to use the secure validation function
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

-- Allow users to update their own profile (except role)
CREATE POLICY "profiles_update_self" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() 
  AND (OLD.role = NEW.role OR public.can_modify_user_role(id, NEW.role::text))
);

-- Allow admins to update any profile with proper validation
CREATE POLICY "profiles_update_admin" 
ON public.profiles 
FOR UPDATE 
USING (public.get_current_user_role() = 'admin')
WITH CHECK (
  public.get_current_user_role() = 'admin'
  AND (
    OLD.role = NEW.role 
    OR public.can_modify_user_role(id, NEW.role::text)
  )
);