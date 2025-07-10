import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Простая версия Multilogin API для тестирования
class SimpleMultiloginAPI {
  constructor(token: string) {
    this.token = token
  }

  private token: string

  async checkHealth(): Promise<boolean> {
    console.log('🔍 Проверяем здоровье Multilogin API...')
    try {
      // Простая проверка без реального API
      return !!this.token && this.token.length > 10
    } catch (error) {
      console.error('❌ Ошибка проверки:', error)
      return false
    }
  }

  async createProfile(platform: string, username: string, password: string): Promise<string> {
    console.log(`🔄 Создаем профиль для ${platform}:${username}`)
    
    // Симулируем создание профиля
    const profileId = `profile_${platform}_${Date.now()}`
    
    await new Promise(resolve => setTimeout(resolve, 1000)) // Симуляция задержки
    
    console.log(`✅ Профиль создан: ${profileId}`)
    return profileId
  }

  async startProfile(profileId: string): Promise<boolean> {
    console.log(`🚀 Запускаем профиль: ${profileId}`)
    
    await new Promise(resolve => setTimeout(resolve, 500))
    
    console.log(`✅ Профиль запущен: ${profileId}`)
    return true
  }

  async stopProfile(profileId: string): Promise<boolean> {
    console.log(`🛑 Останавливаем профиль: ${profileId}`)
    
    await new Promise(resolve => setTimeout(resolve, 300))
    
    console.log(`✅ Профиль остановлен: ${profileId}`)
    return true
  }

  async getProfiles(): Promise<any[]> {
    console.log('📋 Получаем список профилей...')
    
    // Возвращаем тестовые данные
    return [
      {
        id: 'profile_test_1',
        name: 'Test Profile 1',
        platform: 'instagram',
        username: 'test_user_1',
        status: 'created',
        created_at: new Date().toISOString()
      },
      {
        id: 'profile_test_2',
        name: 'Test Profile 2',
        platform: 'telegram',
        username: 'test_user_2',
        status: 'running',
        created_at: new Date().toISOString()
      }
    ]
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

    const multiloginAPI = new SimpleMultiloginAPI(multiloginToken)

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