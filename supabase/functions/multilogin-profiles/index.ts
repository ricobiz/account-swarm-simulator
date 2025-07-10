import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Multilogin API endpoints
const MULTILOGIN_API_BASE = 'https://api.multilogin.com'
const MULTILOGIN_LAUNCHER_BASE = 'https://launcher.mlx.yt:45001'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { action, profileData } = await req.json()
    
    // Получаем рабочий токен из переменных окружения
    const token = Deno.env.get('MULTILOGIN_TOKEN')
    
    if (!token) {
      throw new Error('Multilogin токен не найден')
    }

    console.log(`🔄 Выполняем действие: ${action}`)
    console.log(`📄 Данные профиля:`, profileData)

    let result
    
    switch (action) {
      case 'create_profile':
        result = await createProfile(token, profileData)
        break
      case 'start_profile':
        result = await startProfile(token, profileData.profileId, profileData.folderId)
        break
      case 'stop_profile':
        result = await stopProfile(token, profileData.profileId)
        break
      case 'list_profiles':
        result = await listProfiles(token)
        break
      default:
        throw new Error(`Неизвестное действие: ${action}`)
    }

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Ошибка Multilogin API:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Создание профиля через Cloud API
async function createProfile(token: string, profileData: any) {
  console.log('🆕 Создаем профиль через Cloud API:', profileData)
  
  const url = `${MULTILOGIN_API_BASE}/profile`
  
  const requestBody = {
    name: profileData.name || 'New Profile',
    browser_type: profileData.browser || 'mimic',
    os_type: profileData.os || 'windows',
    parameters: {
      flags: {
        audio_masking: 'mask',
        fonts_masking: 'mask',
        geolocation_masking: 'mask',
        geolocation_popup: 'allow',
        graphics_masking: 'mask',
        graphics_noise: 'mask',
        localization_masking: 'mask',
        media_devices_masking: 'mask',
        navigator_masking: 'mask',
        ports_masking: 'mask',
        proxy_masking: 'mask',
        screen_masking: 'mask',
        timezone_masking: 'mask',
        webrtc_masking: 'mask'
      }
    }
  }

  console.log('📤 Отправляем запрос:', url, requestBody)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ Ошибка создания профиля:', response.status, errorText)
    throw new Error(`Ошибка создания профиля: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  console.log('✅ Профиль создан:', result)
  return result
}

// Запуск профиля через Launcher API
async function startProfile(token: string, profileId: string, folderId?: string) {
  console.log('▶️ Запускаем профиль через Launcher API:', profileId)
  
  try {
    const defaultFolderId = folderId || await getDefaultFolderId(token)
    const url = `${MULTILOGIN_LAUNCHER_BASE}/api/v2/profile/f/${defaultFolderId}/p/${profileId}/start?automation_type=selenium&headless_mode=false`
    
    console.log('📤 Отправляем запрос запуска:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Ошибка запуска профиля:', response.status, errorText)
      throw new Error(`Ошибка запуска профиля: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ Профиль запущен:', result)
    return result
  } catch (error) {
    console.error('❌ Критическая ошибка запуска:', error)
    throw error
  }
}

// Остановка профиля через Launcher API
async function stopProfile(token: string, profileId: string) {
  console.log('⏹️ Останавливаем профиль через Launcher API:', profileId)
  
  const url = `${MULTILOGIN_LAUNCHER_BASE}/api/v1/profile/stop/p/${profileId}`
  
  console.log('📤 Отправляем запрос остановки:', url)

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ Ошибка остановки профиля:', response.status, errorText)
    throw new Error(`Ошибка остановки профиля: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  console.log('✅ Профиль остановлен:', result)
  return result
}

// Получение списка профилей через Cloud API
async function listProfiles(token: string) {
  console.log('📋 Получаем список профилей через Cloud API')
  
  try {
    // Сначала получаем папки
    const foldersUrl = `${MULTILOGIN_API_BASE}/workspace/folders`
    
    console.log('📤 Запрашиваем папки:', foldersUrl)

    const foldersResponse = await fetch(foldersUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })

    if (!foldersResponse.ok) {
      const errorText = await foldersResponse.text()
      console.error('❌ Ошибка получения папок:', foldersResponse.status, errorText)
      throw new Error(`Ошибка получения папок: ${foldersResponse.status} ${errorText}`)
    }

    const foldersResult = await foldersResponse.json()
    console.log('✅ Папки получены:', foldersResult)
    
    if (!foldersResult.data?.folders?.length) {
      console.log('📭 Папки не найдены')
      return []
    }

    // Получаем профили из первой папки (обычно папка по умолчанию)
    const folderId = foldersResult.data.folders[0].folder_id
    const profilesUrl = `${MULTILOGIN_API_BASE}/profile/f/${folderId}`
    
    console.log('📤 Запрашиваем профили из папки:', profilesUrl)

    const profilesResponse = await fetch(profilesUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })

    if (!profilesResponse.ok) {
      const errorText = await profilesResponse.text()
      console.error('❌ Ошибка получения профилей:', profilesResponse.status, errorText)
      throw new Error(`Ошибка получения профилей: ${profilesResponse.status} ${errorText}`)
    }

    const profilesResult = await profilesResponse.json()
    console.log('✅ Профили получены:', profilesResult)
    return profilesResult.data?.profiles || []
  } catch (error) {
    console.error('❌ Критическая ошибка получения профилей:', error)
    throw error
  }
}

// Вспомогательная функция для получения ID папки по умолчанию
async function getDefaultFolderId(token: string): Promise<string> {
  const foldersUrl = `${MULTILOGIN_API_BASE}/workspace/folders`
  
  const response = await fetch(foldersUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error('Не удалось получить ID папки по умолчанию')
  }

  const result = await response.json()
  return result.data?.folders?.[0]?.folder_id || ''
}