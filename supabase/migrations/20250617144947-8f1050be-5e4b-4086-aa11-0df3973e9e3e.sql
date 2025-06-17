
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create simpler, non-recursive policies
CREATE POLICY "Enable read access for users based on user_id" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Enable update for users based on user_id" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users only" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);
