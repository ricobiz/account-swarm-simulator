import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// MD5 hash function implementation using Deno std crypto
async function md5Hash(text: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("MD5", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    console.log('✅ MD5 хэш создан успешно');
    return hashHex;
  } catch (error) {
    console.warn('⚠️ MD5 недоступен, пробуем без хэширования:', error.message);
    // Fallback - return password as is
    return text;
  }
}

// Function to get token from Multilogin API
async function getMultiloginToken(email: string, password: string): Promise<string> {
  console.log('🔑 Получаем токен через Multilogin API...');
  console.log('📧 Email:', email);
  
  // Hash password using MD5
  const hashedPassword = await md5Hash(password);
  console.log('🔐 Пароль хэширован');
  
  const requestBody = JSON.stringify({
    email: email,
    password: hashedPassword
  });
  
  const response = await fetch('https://api.multilogin.com/user/signin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body: requestBody
  });
  
  console.log('📡 Статус ответа API:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Ошибка API:', errorText);
    throw new Error(`API ошибка: ${response.status} - ${errorText}`);
  }
  
  const responseData = await response.json();
  console.log('📄 Ответ API получен');
  
  // Extract token from different possible fields
  const token = responseData.data?.token || responseData.access_token || responseData.token;
  
  if (!token) {
    console.error('❌ Токен не найден в ответе:', responseData);
    throw new Error('Токен не найден в ответе API');
  }
  
  console.log('✅ Токен успешно получен!');
  return token;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔄 multilogin-token-manager: Запуск автоматической системы токенов...')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Получаем email и пароль из секретов Supabase
    const email = Deno.env.get('MULTILOGIN_EMAIL')
    const password = Deno.env.get('MULTILOGIN_PASSWORD')

    console.log('🔧 Проверка credentials:')
    console.log('📧 MULTILOGIN_EMAIL:', email ? '✅ Настроен' : '❌ Отсутствует')
    console.log('🔐 MULTILOGIN_PASSWORD:', password ? '✅ Настроен' : '❌ Отсутствует')

    if (!email || !password) {
      console.warn('⚠️ Credentials не настроены!')
      return new Response(JSON.stringify({
        success: false,
        error: 'Multilogin credentials не настроены',
        message: 'Добавьте MULTILOGIN_EMAIL и MULTILOGIN_PASSWORD в секреты Supabase'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'POST') {
      console.log('🔄 Автоматическое получение и сохранение токена...')
      
      try {
        // Получаем новый токен через API
        const newToken = await getMultiloginToken(email, password);
        
        // Устанавливаем срок действия - 25 минут для автообновления
        const expiresAt = new Date(Date.now() + (25 * 60 * 1000)); // 25 минут
        
        console.log('💾 Сохраняем новый токен в базу данных...')
        
        // Деактивируем старые токены
        const { error: updateError } = await supabase
          .from('multilogin_tokens')
          .update({ is_active: false })
          .eq('email', email)

        if (updateError) {
          console.warn('⚠️ Ошибка деактивации старых токенов:', updateError)
        }

        // Сохраняем новый токен
        const { error: insertError } = await supabase
          .from('multilogin_tokens')
          .insert({
            email: email,
            token: newToken,
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

        console.log('✅ Автоматический токен успешно получен и сохранен!')
        console.log('⏰ Действителен до:', expiresAt.toLocaleString())
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Токен автоматически получен и сохранен',
          token_type: 'auto_refresh_token',
          expires_at: expiresAt.toISOString(),
          note: 'Токен будет автоматически обновляться каждые 25 минут',
          timestamp: new Date().toISOString()
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
        
      } catch (error) {
        console.error('❌ Критическая ошибка получения токена:', error)
        
        return new Response(JSON.stringify({
          success: false,
          error: 'Ошибка автоматического получения токена',
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
      post_description: 'Автоматически получить и сохранить токен через Multilogin API',
      instructions: 'Используйте POST запрос для автоматического получения токена. Настройте MULTILOGIN_EMAIL и MULTILOGIN_PASSWORD в секретах Supabase.'
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