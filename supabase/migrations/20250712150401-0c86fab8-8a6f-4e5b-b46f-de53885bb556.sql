-- Исправляем RLS политики для rpa_tasks
-- Добавляем политику для системных операций (Edge Functions)

-- Создаем политику для вставки системных задач
CREATE POLICY "System can insert rpa_tasks" 
ON public.rpa_tasks 
FOR INSERT 
WITH CHECK (true);

-- Создаем политику для обновления системных задач  
CREATE POLICY "System can update rpa_tasks" 
ON public.rpa_tasks 
FOR UPDATE 
USING (true);

-- Создаем политику для выбора задач
CREATE POLICY "System can select rpa_tasks" 
ON public.rpa_tasks 
FOR SELECT 
USING (true);