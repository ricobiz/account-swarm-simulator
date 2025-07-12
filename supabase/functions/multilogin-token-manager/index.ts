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

    // Получаем учетные данные из секретов
    const multiloginEmail = Deno.env.get('MULTILOGIN_EMAIL')
    const multiloginPassword = Deno.env.get('MULTILOGIN_PASSWORD')

    console.log('🔧 Проверка секретов:')
    console.log('📧 MULTILOGIN_EMAIL:', multiloginEmail ? '✅ Настроен' : '❌ Отсутствует')
    console.log('🔒 MULTILOGIN_PASSWORD:', multiloginPassword ? '✅ Настроен' : '❌ Отсутствует')

    if (!multiloginEmail || !multiloginPassword) {
      console.warn('⚠️ Учетные данные Multilogin не настроены!')
      return new Response(JSON.stringify({
        success: false,
        error: 'Учетные данные Multilogin не настроены',
        message: 'Добавьте MULTILOGIN_EMAIL и MULTILOGIN_PASSWORD в секреты Supabase'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'POST') {
      console.log('🔄 Запрос на обновление токена')
      
      try {
        // Простая функция хеширования MD5 для Deno
        async function md5(str: string): Promise<string> {
          const encoder = new TextEncoder()
          const data = encoder.encode(str)
          const hashBuffer = await crypto.subtle.digest('MD5', data)
          const hashArray = Array.from(new Uint8Array(hashBuffer))
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
          return hashHex
        }
        
        console.log('🔐 Хешируем пароль...')
        const hashedPassword = await md5(multiloginPassword)
        console.log('🔐 MD5 хеш готов')
        
        console.log('📡 Отправляем запрос к Multilogin API...')
        const response = await fetch('https://api.multilogin.com/user/signin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          body: JSON.stringify({
            email: multiloginEmail,
            password: hashedPassword
          })
        })
        
        console.log('📊 Статус ответа от Multilogin:', response.status)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('❌ Ошибка от Multilogin API:', response.status, errorText)
          
          return new Response(JSON.stringify({
            success: false,
            error: 'Ошибка от Multilogin API',
            message: `HTTP ${response.status}: ${errorText}`,
            timestamp: new Date().toISOString()
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        
        const data = await response.json()
        console.log('📦 Ответ от Multilogin API получен:', Object.keys(data))
        
        // Ищем токен в ответе
        let token = null
        if (data.data && data.data.token) {
          token = data.data.token
          console.log('✅ Токен найден в data.token')
        } else if (data.token) {
          token = data.token
          console.log('✅ Токен найден в token')
        } else if (data.access_token) {
          token = data.access_token
          console.log('✅ Токен найден в access_token')
        }
        
        if (!token) {
          console.error('❌ Токен не найден в ответе:', data)
          return new Response(JSON.stringify({
            success: false,
            error: 'Токен не найден в ответе от Multilogin API',
            message: 'API вернул данные, но токен отсутствует',
            response_keys: Object.keys(data),
            timestamp: new Date().toISOString()
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        
        // Сохраняем токен в базу данных
        const expiresAt = new Date(Date.now() + (25 * 60 * 1000)) // 25 минут
        
        console.log('💾 Сохраняем токен в базу данных...')
        
        // Деактивируем старые токены
        const { error: updateError } = await supabase
          .from('multilogin_tokens')
          .update({ is_active: false })
          .eq('email', multiloginEmail)

        if (updateError) {
          console.warn('⚠️ Ошибка деактивации старых токенов:', updateError)
        }

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

        console.log('✅ Токен успешно сохранен!')
        console.log('⏰ Действителен до:', expiresAt.toLocaleString())
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Новый токен успешно получен и сохранен',
          expires_in_minutes: 25,
          expires_at: expiresAt.toISOString(),
          timestamp: new Date().toISOString()
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
        
      } catch (error) {
        console.error('❌ Критическая ошибка обновления токена:', error)
        
        return new Response(JSON.stringify({
          success: false,
          error: 'Ошибка обновления токена',
          message: error.message,
          stack: error.stack,
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
      post_description: 'Обновить/создать новый токен'
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
      stack: error.stack,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})