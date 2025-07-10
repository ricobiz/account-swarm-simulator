import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Автоматическое получение Multilogin токенов (адаптация вашей Node.js системы)
class MultiloginTokenManager {
  constructor(email: string, password: string) {
    this.email = email
    this.password = password
  }

  private email: string
  private password: string

  // MD5 хеширование (как в оригинальном коде)
  private async createMD5Hash(text: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(text)
    const hashBuffer = await crypto.subtle.digest('MD5', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // Получение токена через Multilogin API (как в оригинале)
  async getToken(): Promise<string> {
    console.log('🔄 Получаем новый Multilogin токен...')
    
    try {
      // Хешируем пароль в MD5
      const passwordHash = await this.createMD5Hash(this.password)
      
      const response = await fetch('https://api.multilogin.com/user/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: this.email,
          password: passwordHash
        })
      })

      const data = await response.json()
      
      if (data.data && data.data.token) {
        console.log('✅ Multilogin токен успешно получен!')
        return data.data.token
      } else {
        throw new Error(`Multilogin API error: ${JSON.stringify(data)}`)
      }
    } catch (error) {
      console.error('❌ Ошибка получения Multilogin токена:', error)
      throw error
    }
  }

  // Сохранение токена в Supabase (вместо файлов)
  async saveToken(token: string, supabase: any): Promise<void> {
    const expiresAt = new Date(Date.now() + (25 * 60 * 1000)) // 25 минут
    
    try {
      // Деактивируем старые токены
      await supabase
        .from('multilogin_tokens')
        .update({ is_active: false })
        .eq('email', this.email)

      // Сохраняем новый токен
      const { error } = await supabase
        .from('multilogin_tokens')
        .insert({
          email: this.email,
          token: token,
          expires_at: expiresAt.toISOString(),
          is_active: true
        })

      if (error) {
        throw error
      }

      console.log('💾 Токен сохранен в базу данных')
      console.log('⏰ Истекает:', expiresAt.toLocaleString('ru-RU'))
      
    } catch (error) {
      console.error('❌ Ошибка сохранения токена:', error)
      throw error
    }
  }

  // Получение актуального токена из базы
  async getCurrentToken(supabase: any): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('multilogin_tokens')
        .select('*')
        .eq('email', this.email)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        throw error
      }

      return data?.token || null
    } catch (error) {
      console.error('❌ Ошибка получения токена из базы:', error)
      return null
    }
  }

  // Обновление токена (основная функция)
  async refreshToken(supabase: any): Promise<string> {
    try {
      // Проверяем есть ли актуальный токен
      const existingToken = await this.getCurrentToken(supabase)
      if (existingToken) {
        console.log('✅ Актуальный токен уже существует')
        return existingToken
      }

      // Получаем новый токен
      const newToken = await this.getToken()
      
      // Сохраняем в базу
      await this.saveToken(newToken, supabase)
      
      const timestamp = new Date().toLocaleString('ru-RU')
      console.log(`🎉 MULTILOGIN ТОКЕН ОБНОВЛЕН (${timestamp})`)
      console.log('🔑 Токен:', newToken.substring(0, 50) + '...')
      
      return newToken
      
    } catch (error) {
      console.error('❌ Ошибка обновления Multilogin токена:', error.message)
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

    if (!multiloginEmail || !multiloginPassword) {
      return new Response(JSON.stringify({
        success: false,
        error: 'MULTILOGIN_EMAIL или MULTILOGIN_PASSWORD не настроены',
        message: 'Добавьте учетные данные в Supabase секреты'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const tokenManager = new MultiloginTokenManager(multiloginEmail, multiloginPassword)

    if (req.method === 'GET') {
      // Получить текущий токен
      const currentToken = await tokenManager.getCurrentToken(supabase)
      
      if (currentToken) {
        return new Response(JSON.stringify({
          success: true,
          token: currentToken,
          message: 'Актуальный токен получен из кеша'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } else {
        return new Response(JSON.stringify({
          success: false,
          message: 'Нет актуального токена, требуется обновление'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    if (req.method === 'POST') {
      // Принудительное обновление токена
      const newToken = await tokenManager.refreshToken(supabase)
      
      return new Response(JSON.stringify({
        success: true,
        token: newToken,
        message: 'Новый токен успешно получен и сохранен',
        expires_in_minutes: 25
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Метод не поддерживается'
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('💥 Критическая ошибка Multilogin Token Manager:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Внутренняя ошибка сервера',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})