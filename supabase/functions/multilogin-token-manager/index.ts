import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔄 multilogin-token-manager: Запуск функции...')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Получаем ГОТОВЫЙ automation token из секретов Supabase
    // Этот токен пользователь должен взять из приложения Multilogin
    const automationToken = Deno.env.get('MULTILOGIN_TOKEN')

    console.log('🔧 Проверка automation token:')
    console.log('🎯 MULTILOGIN_TOKEN:', automationToken ? '✅ Настроен' : '❌ Отсутствует')

    if (!automationToken) {
      console.warn('⚠️ Automation token не настроен!')
      return new Response(JSON.stringify({
        success: false,
        error: 'Automation token не настроен',
        message: 'Добавьте MULTILOGIN_TOKEN в секреты Supabase. Токен можно получить в приложении Multilogin.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'POST') {
      console.log('🔄 Сохраняем automation token в базу данных')
      
      try {
        // Сохраняем automation token в базу данных с долгим сроком действия
        // Automation tokens обычно действуют долго (месяцы/годы)
        const expiresAt = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)) // 1 год
        
        console.log('💾 Сохраняем токен в базу данных...')
        
        // Деактивируем старые токены
        const { error: updateError } = await supabase
          .from('multilogin_tokens')
          .update({ is_active: false })
          .eq('email', 'automation_token') // Используем специальный email для automation tokens

        if (updateError) {
          console.warn('⚠️ Ошибка деактивации старых токенов:', updateError)
        }

        // Сохраняем новый токен
        const { error: insertError } = await supabase
          .from('multilogin_tokens')
          .insert({
            email: 'automation_token', // Специальный email для automation tokens
            token: automationToken,
            expires_at: expiresAt.toISOString(),
            is_active: true
          })

        if (insertError) {
          console.error('❌ Ошибка сохранения токена:', insertError)
          return new Response(JSON.stringify({
            success: false,
            error: 'Ошибка сохранения токена в базу данных',
            message: insertError.message,
            timestamp: new Date().toISOString()
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        console.log('✅ Automation token успешно сохранен!')
        console.log('⏰ Действителен до:', expiresAt.toLocaleString())
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Automation token успешно сохранен в базу данных',
          token_type: 'automation_token',
          expires_at: expiresAt.toISOString(),
          note: 'Automation tokens обычно действуют очень долго. Обновляйте только при необходимости.',
          timestamp: new Date().toISOString()
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
        
      } catch (error) {
        console.error('❌ Критическая ошибка сохранения токена:', error)
        
        return new Response(JSON.stringify({
          success: false,
          error: 'Ошибка сохранения automation token',
          message: error.message,
          timestamp: new Date().toISOString()
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Метод не поддерживается',
      supported_methods: ['POST'],
      post_description: 'Сохранить automation token в базу данных',
      instructions: 'Получите automation token в приложении Multilogin и добавьте его в секреты Supabase как MULTILOGIN_TOKEN'
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('💥 Критическая ошибка Token Manager:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Внутренняя ошибка сервера',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})