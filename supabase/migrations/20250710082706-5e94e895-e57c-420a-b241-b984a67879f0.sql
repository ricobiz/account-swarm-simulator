-- Создаем таблицу для хранения Multilogin токенов
CREATE TABLE IF NOT EXISTS public.multilogin_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Включаем RLS
ALTER TABLE public.multilogin_tokens ENABLE ROW LEVEL SECURITY;

-- Политики для системного доступа (edge functions)
CREATE POLICY "System can manage multilogin tokens" 
ON public.multilogin_tokens 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Функция для автоматического обновления timestamp
CREATE OR REPLACE FUNCTION public.update_multilogin_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления
CREATE TRIGGER update_multilogin_tokens_updated_at
BEFORE UPDATE ON public.multilogin_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_multilogin_tokens_updated_at();