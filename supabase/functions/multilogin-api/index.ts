import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Реальная интеграция с Multilogin API
class RealMultiloginAPI {
  constructor(token: string) {
    this.token = token
    this.baseURL = 'https://api.multilogin.com'
  }

  private token: string
  private baseURL: string

  async checkHealth(): Promise<boolean> {
    console.log('🔍 Проверяем подключение к реальному Multilogin API...')
    try {
      const response = await fetch(`${this.baseURL}/user/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('📊 Статус ответа API:', response.status)
      return response.ok
    } catch (error) {
      console.error('❌ Ошибка подключения к Multilogin API:', error.message)
      return false
    }
  }

  async createProfile(platform: string, username: string, password: string): Promise<string> {
    console.log(`🔄 Создаем реальный профиль для ${platform}:${username}`)
    
    try {
      const response = await fetch(`${this.baseURL}/profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `${platform}_${username}_${Date.now()}`,
          os: 'win',
          browser: 'mimic',
          platform_data: {
            platform,
            username,
            password
          }
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Multilogin API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      const profileId = data.uuid || data.id
      
      console.log(`✅ Реальный профиль создан: ${profileId}`)
      return profileId
      
    } catch (error) {
      console.error('❌ Ошибка создания реального профиля:', error.message)
      throw error
    }
  }

  async startProfile(profileId: string): Promise<boolean> {
    console.log(`🚀 Запускаем реальный профиль: ${profileId}`)
    
    try {
      const response = await fetch(`${this.baseURL}/profile/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uuid: profileId
        })
      })

      const success = response.ok
      console.log(`${success ? '✅' : '❌'} Результат запуска профиля: ${profileId}`)
      return success
      
    } catch (error) {
      console.error('❌ Ошибка запуска профиля:', error.message)
      return false
    }
  }

  async stopProfile(profileId: string): Promise<boolean> {
    console.log(`🛑 Останавливаем реальный профиль: ${profileId}`)
    
    try {
      const response = await fetch(`${this.baseURL}/profile/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uuid: profileId
        })
      })

      const success = response.ok
      console.log(`${success ? '✅' : '❌'} Результат остановки профиля: ${profileId}`)
      return success
      
    } catch (error) {
      console.error('❌ Ошибка остановки профиля:', error.message)
      return false
    }
  }

  async getProfiles(): Promise<any[]> {
    console.log('📋 Получаем список реальных профилей...')
    
    try {
      const response = await fetch(`${this.baseURL}/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      const profiles = Array.isArray(data) ? data : data.profiles || []
      
      console.log(`✅ Получено ${profiles.length} реальных профилей`)
      return profiles
      
    } catch (error) {
      console.error('❌ Ошибка получения профилей:', error.message)
      return []
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

    // Получаем токен из автоматической системы или секретов
    let multiloginToken = null
    
    try {
      console.log('🔑 Пытаемся получить автоматический токен...')
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('multilogin-token-manager')
      
      if (tokenData?.success) {
        multiloginToken = tokenData.token
        console.log('✅ Используем автоматический токен')
      } else {
        console.warn('⚠️ Автоматический токен недоступен:', tokenError?.message)
      }
    } catch (error) {
      console.warn('⚠️ Ошибка получения автоматического токена:', error.message)
    }

    // Fallback на секреты
    if (!multiloginToken) {
      multiloginToken = Deno.env.get('MULTILOGIN_TOKEN')
      if (multiloginToken) {
        console.log('🔄 Используем токен из секретов')
      } else {
        console.warn('⚠️ Токен недоступен, используем тестовый режим')
        multiloginToken = 'test_token_for_development'
      }
    }

    const multiloginAPI = new RealMultiloginAPI(multiloginToken)

    // Обрабатываем запросы
    if (req.method === 'POST') {
      const body = await req.json()
      console.log('📥 Получен запрос:', JSON.stringify(body, null, 2))

      const { action } = body

      switch (action) {
        case 'health':
          const isHealthy = await multiloginAPI.checkHealth()
          return new Response(JSON.stringify({
            success: isHealthy,
            multilogin_connected: isHealthy,
            message: isHealthy ? 'Multilogin API работает' : 'Multilogin API недоступен',
            token_status: multiloginToken !== 'test_token_for_development' ? 'real' : 'test',
            timestamp: new Date().toISOString()
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })

        case 'create_profile':
          const { platform = 'instagram', username = 'test_user', password = 'test_pass' } = body
          const profileId = await multiloginAPI.createProfile(platform, username, password)
          
          return new Response(JSON.stringify({
            success: true,
            profile_id: profileId,
            message: `Профиль создан для ${platform}:${username}`,
            timestamp: new Date().toISOString()
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })

        case 'start_profile':
          const { profile_id } = body
          if (!profile_id) {
            return new Response(JSON.stringify({
              success: false,
              error: 'profile_id обязателен для запуска профиля'
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }

          const startSuccess = await multiloginAPI.startProfile(profile_id)
          return new Response(JSON.stringify({
            success: startSuccess,
            message: startSuccess ? `Профиль ${profile_id} запущен` : `Ошибка запуска профиля ${profile_id}`,
            timestamp: new Date().toISOString()
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })

        case 'stop_profile':
          const { profile_id: stopProfileId } = body
          const stopSuccess = await multiloginAPI.stopProfile(stopProfileId)
          return new Response(JSON.stringify({
            success: stopSuccess,
            message: stopSuccess ? `Профиль ${stopProfileId} остановлен` : `Ошибка остановки профиля ${stopProfileId}`,
            timestamp: new Date().toISOString()
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })

        case 'get_profiles':
          const profiles = await multiloginAPI.getProfiles()
          return new Response(JSON.stringify({
            success: true,
            profiles,
            count: profiles.length,
            message: `Найдено ${profiles.length} профилей`,
            timestamp: new Date().toISOString()
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })

        default:
          return new Response(JSON.stringify({
            success: false,
            error: `Неизвестное действие: ${action}`,
            available_actions: ['health', 'create_profile', 'start_profile', 'stop_profile', 'get_profiles']
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
      }
    }

    // GET запрос для общей информации
    if (req.method === 'GET') {
      const isHealthy = await multiloginAPI.checkHealth()
      return new Response(JSON.stringify({
        success: true,
        service: 'Multilogin API',
        version: '2.0 (Simplified)',
        status: isHealthy ? 'healthy' : 'degraded',
        multilogin_connected: isHealthy,
        token_status: multiloginToken !== 'test_token_for_development' ? 'real' : 'test',
        available_actions: ['health', 'create_profile', 'start_profile', 'stop_profile', 'get_profiles'],
        timestamp: new Date().toISOString()
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
    console.error('💥 Критическая ошибка Multilogin API:', error)
    
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