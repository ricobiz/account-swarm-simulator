import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🚀 Запуск упрощенного Multilogin Token Manager')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Получаем учетные данные из секретов
    const multiloginEmail = Deno.env.get('MULTILOGIN_EMAIL')
    const multiloginPassword = Deno.env.get('MULTILOGIN_PASSWORD')

    console.log('🔧 Проверка секретов:')
    console.log('📧 MULTILOGIN_EMAIL:', multiloginEmail ? '✅ Есть' : '❌ Отсутствует')
    console.log('🔒 MULTILOGIN_PASSWORD:', multiloginPassword ? '✅ Есть' : '❌ Отсутствует')

    if (!multiloginEmail || !multiloginPassword) {
      console.log('❌ Секреты отсутствуют')
      return new Response(JSON.stringify({
        success: false,
        error: 'Секреты не настроены',
        email_exists: !!multiloginEmail,
        password_exists: !!multiloginPassword
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ Секреты найдены')
    console.log('ℹ️ ВАЖНО: Multilogin работает через Local API на localhost:35000')
    console.log('ℹ️ Edge Functions не могут обращаться к localhost пользователя')
    console.log('ℹ️ Нужен automation token или запуск automation-service локально')

    // Проверяем есть ли automation token
    const automationToken = Deno.env.get('MULTILOGIN_TOKEN')
    if (automationToken) {
      console.log('✅ Найден MULTILOGIN_TOKEN, пробуем его использовать')
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Multilogin Token найден',
        token: automationToken.substring(0, 10) + '...',
        note: 'Используем automation token вместо локального API',
        architecture: 'automation-token-based'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Возвращаем объяснение архитектуры
    return new Response(JSON.stringify({
      success: false,
      error: 'Неправильная архитектура интеграции',
      explanation: {
        problem: 'Multilogin работает через Local API (localhost:35000)',
        current_approach: 'Edge Function пытается обратиться к удаленному API',
        solutions: [
          '1. Использовать MULTILOGIN_TOKEN (automation token)',
          '2. Запустить automation-service локально у пользователя',
          '3. Настроить proxy/tunnel к локальному Multilogin'
        ]
      },
      multilogin_architecture: {
        local_api: 'http://localhost:35000',
        authentication: 'Через веб-интерфейс или CLI',
        access: 'Только с той же машины где запущен Multilogin'
      },
      our_current_setup: {
        edge_function: 'Работает в Supabase облаке',
        cannot_access: 'localhost пользователя',
        needs: 'automation token или локальный сервис'
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('💥 Критическая ошибка:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Внутренняя ошибка сервера',
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})