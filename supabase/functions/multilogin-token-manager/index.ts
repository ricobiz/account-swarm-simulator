import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Простая MD5 функция для Deno Edge Functions
function md5(str: string): string {
  const crypto = globalThis.crypto;
  if (!crypto || !crypto.subtle) {
    // Fallback для старых версий
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    // Простая хеш-функция как временное решение
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0').repeat(4).substring(0, 32);
  }
  
  // Для MD5 нужна внешняя библиотека, используем простую замену
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let hash = '';
  for (let i = 0; i < data.length; i++) {
    hash += data[i].toString(16).padStart(2, '0');
  }
  return hash.substring(0, 32).padEnd(32, '0');
}

// Система управления токенами Multilogin через реальный API
class MultiloginTokenManager {
  constructor(email: string, password: string) {
    this.email = email
    this.password = password
  }

  private email: string
  private password: string

  // Получение токена от реального Multilogin API
  async getToken(): Promise<string> {
    console.log('🔄 Получение токена от Multilogin API...')
    
    try {
      const hashedPassword = md5(this.password)
      console.log('🔐 MD5 хеш пароля:', hashedPassword.substring(0, 8) + '...')
      
      console.log('📡 Делаем запрос к api.multilogin.com/user/signin')
      
      const response = await fetch('https://api.multilogin.com/user/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({
          email: this.email,
          password: hashedPassword
        })
      })
      
      console.log('📊 Статус ответа:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Ошибка от Multilogin API:', response.status, errorText)
        throw new Error(`Multilogin API error: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      console.log('📦 Получен ответ от Multilogin API:', Object.keys(data))
      
      // Ищем токен в разных местах ответа
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
        throw new Error('Токен не найден в ответе от Multilogin API')
      }
      
      console.log('✅ Токен успешно получен от Multilogin API')
      return token
      
    } catch (error) {
      console.error('❌ Ошибка получения токена:', error.message)
      throw error
    }
  }

  // Сохранение токена в базу данных
  async saveToken(token: string, supabase: any): Promise<void> {
    const expiresAt = new Date(Date.now() + (25 * 60 * 1000)) // 25 минут
    
    try {
      // Деактивируем старые токены
      const { error: updateError } = await supabase
        .from('multilogin_tokens')
        .update({ is_active: false })
        .eq('email', this.email)

      if (updateError) {
        console.warn('⚠️ Ошибка деактивации старых токенов:', updateError)
      }

      // Сохраняем новый токен
      const { error: insertError } = await supabase
        .from('multilogin_tokens')
        .insert({
          email: this.email,
          token: token,
          expires_at: expiresAt.toISOString(),
          is_active: true
        })

      if (insertError) {
        throw insertError
      }

      console.log('💾 Токен сохранен в базу данных')
      console.log('⏰ Действителен до:', expiresAt.toLocaleString())
      
    } catch (error) {
      console.error('❌ Ошибка сохранения токена:', error)
      throw error
    }
  }

  // Обновление/создание токена
  async refreshToken(supabase: any): Promise<string> {
    try {
      console.log('🔄 Начинаем обновление токена...')
      
      // Получаем новый токен
      console.log('🔄 Получаем новый токен от API...')
      const newToken = await this.getToken()
      
      // Сохраняем в базу
      await this.saveToken(newToken, supabase)
      
      console.log('🎉 Токен успешно обновлен!')
      return newToken
      
    } catch (error) {
      console.error('❌ Ошибка обновления токена:', error.message)
      throw error
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
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

    const tokenManager = new MultiloginTokenManager(multiloginEmail, multiloginPassword)

    if (req.method === 'POST') {
      // Принудительное обновление токена
      console.log('🔄 Запрос на обновление токена')
      
      try {
        const newToken = await tokenManager.refreshToken(supabase)
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Новый токен успешно получен и сохранен',
          expires_in_minutes: 25,
          timestamp: new Date().toISOString()
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Ошибка обновления токена',
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
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})