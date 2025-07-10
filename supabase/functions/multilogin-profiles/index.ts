import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    let result
    
    switch (action) {
      case 'create_profile':
        result = await createProfile(token, profileData)
        break
      case 'start_profile':
        result = await startProfile(token, profileData.profileId)
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

// Создание нового профиля
async function createProfile(token: string, profileData: any) {
  console.log('🆕 Создаем профиль:', profileData)
  
  const response = await fetch('https://api.multilogin.com/profile', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      name: profileData.name || `Profile_${Date.now()}`,
      os: profileData.os || 'win',
      browser: profileData.browser || 'mimic',
      platform: profileData.platform || 'instagram',
      ...profileData
    })
  })

  const result = await response.json()
  
  if (!response.ok) {
    throw new Error(`Ошибка создания профиля: ${JSON.stringify(result)}`)
  }

  console.log('✅ Профиль создан:', result)
  return result
}

// Запуск профиля
async function startProfile(token: string, profileId: string) {
  console.log('▶️ Запускаем профиль:', profileId)
  
  const response = await fetch(`https://api.multilogin.com/profile/${profileId}/start`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  })

  const result = await response.json()
  
  if (!response.ok) {
    throw new Error(`Ошибка запуска профиля: ${JSON.stringify(result)}`)
  }

  console.log('✅ Профиль запущен:', result)
  return result
}

// Остановка профиля
async function stopProfile(token: string, profileId: string) {
  console.log('⏹️ Останавливаем профиль:', profileId)
  
  const response = await fetch(`https://api.multilogin.com/profile/${profileId}/stop`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  })

  const result = await response.json()
  
  if (!response.ok) {
    throw new Error(`Ошибка остановки профиля: ${JSON.stringify(result)}`)
  }

  console.log('✅ Профиль остановлен:', result)
  return result
}

// Получение списка профилей
async function listProfiles(token: string) {
  console.log('📋 Получаем список профилей')
  
  const response = await fetch('https://api.multilogin.com/profile', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  })

  const result = await response.json()
  
  if (!response.ok) {
    throw new Error(`Ошибка получения профилей: ${JSON.stringify(result)}`)
  }

  console.log('✅ Список профилей получен:', result)
  return result
}