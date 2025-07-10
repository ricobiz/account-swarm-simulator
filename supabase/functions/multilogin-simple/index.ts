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

    console.log('✅ Секреты найдены, пробуем простой запрос к Multilogin API...')

    try {
      const response = await fetch('https://api.multilogin.com/user/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: multiloginEmail,
          password: multiloginPassword
        })
      })
      
      console.log('📊 Статус ответа от Multilogin API:', response.status)
      
      const responseText = await response.text()
      console.log('📝 Ответ от API (первые 200 символов):', responseText.substring(0, 200))

      if (!response.ok) {
        console.log('❌ Multilogin API вернул ошибку')
        return new Response(JSON.stringify({
          success: false,
          error: 'Ошибка от Multilogin API',
          status: response.status,
          message: responseText,
          email: multiloginEmail
        }), {
          status: 200, // Возвращаем 200, чтобы клиент получил детали
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      let data
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        console.log('❌ Не удалось распарсить JSON ответ')
        return new Response(JSON.stringify({
          success: false,
          error: 'Неверный формат ответа от API',
          raw_response: responseText
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('✅ Успешно получен ответ от Multilogin API')
      
      const token = data.token || data.access_token || data.authToken
      
      if (!token) {
        console.log('❌ Токен не найден в ответе')
        return new Response(JSON.stringify({
          success: false,
          error: 'Токен не найден в ответе',
          available_fields: Object.keys(data),
          response_data: data
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('🎉 Токен найден:', token.substring(0, 10) + '...')

      // Сохраняем в базу
      const expiresAt = new Date(Date.now() + (25 * 60 * 1000)) // 25 минут
      
      try {
        // Деактивируем старые токены
        await supabase
          .from('multilogin_tokens')
          .update({ is_active: false })
          .eq('email', multiloginEmail)

        // Сохраняем новый токен
        const { error: insertError } = await supabase
          .from('multilogin_tokens')
          .insert({
            email: multiloginEmail,
            token: token,
            expires_at: expiresAt.toISOString(),
            is_active: true
          })

        if (insertError) {
          console.log('❌ Ошибка сохранения в базу:', insertError)
          return new Response(JSON.stringify({
            success: false,
            error: 'Ошибка сохранения токена',
            token_received: true,
            db_error: insertError.message
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        console.log('💾 Токен сохранен в базу')

        return new Response(JSON.stringify({
          success: true,
          message: 'Токен успешно получен и сохранен',
          email: multiloginEmail,
          token: token.substring(0, 10) + '...',
          expires_at: expiresAt.toISOString()
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      } catch (dbError) {
        console.log('❌ Ошибка работы с базой:', dbError)
        return new Response(JSON.stringify({
          success: false,
          error: 'Ошибка базы данных',
          message: dbError.message
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

    } catch (fetchError) {
      console.log('❌ Ошибка HTTP запроса:', fetchError)
      return new Response(JSON.stringify({
        success: false,
        error: 'Ошибка соединения с Multilogin API',
        message: fetchError.message
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

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