-- Очищаем старые automation_token записи чтобы система использовала новые автоматические токены
DELETE FROM multilogin_tokens WHERE email = 'automation_token';

-- Убеждаемся что в таблице только токены от автоматической системы
UPDATE multilogin_tokens 
SET is_active = false 
WHERE email != (SELECT COALESCE(NULLIF(current_setting('supabase.auth.external_id', true), ''), 'unknown'));