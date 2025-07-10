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
    console.log(`📄 Данные профиля:`, profileData)

    let result
    
    switch (action) {
      case 'create_profile':
        result = await mockCreateProfile(profileData)
        break
      case 'start_profile':
        result = await mockStartProfile(profileData.profileId)
        break
      case 'stop_profile':
        result = await mockStopProfile(profileData.profileId)
        break
      case 'list_profiles':
        result = await mockListProfiles()
        break
      default:
        throw new Error(`Неизвестное действие: ${action}`)
    }

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString(),
      note: "Демо-режим: имитация Multilogin API (для локальной работы нужен запущенный Multilogin на порту 35000)"
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

// Имитация создания профиля (пока Multilogin не запущен локально)
async function mockCreateProfile(profileData: any) {
  console.log('🆕 [DEMO] Создаем профиль:', profileData)
  
  // Имитируем задержку API
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  const mockProfile = {
    uuid: `profile_${Date.now()}`,
    name: profileData.name || `Profile_${Date.now()}`,
    browser: profileData.browser || 'mimic',
    os: profileData.os || 'win',
    platform: profileData.platform || 'instagram',
    status: 'Inactive',
    created_at: new Date().toISOString(),
    selenium_port: Math.floor(Math.random() * 1000) + 35000,
    folders: ['main']
  }
  
  console.log('✅ [DEMO] Профиль создан:', mockProfile)
  return mockProfile
}

// Имитация запуска профиля
async function mockStartProfile(profileId: string) {
  console.log('▶️ [DEMO] Запускаем профиль:', profileId)
  
  await new Promise(resolve => setTimeout(resolve, 800))
  
  const result = {
    status: 'Active',
    profileId,
    selenium_port: Math.floor(Math.random() * 1000) + 35000,
    webdriver_url: `http://localhost:${Math.floor(Math.random() * 1000) + 35000}`,
    message: 'Профиль запущен успешно'
  }
  
  console.log('✅ [DEMO] Профиль запущен:', result)
  return result
}

// Имитация остановки профиля
async function mockStopProfile(profileId: string) {
  console.log('⏹️ [DEMO] Останавливаем профиль:', profileId)
  
  await new Promise(resolve => setTimeout(resolve, 500))
  
  const result = {
    status: 'Inactive',
    profileId,
    message: 'Профиль остановлен'
  }
  
  console.log('✅ [DEMO] Профиль остановлен:', result)
  return result
}

// Имитация получения списка профилей
async function mockListProfiles() {
  console.log('📋 [DEMO] Получаем список профилей')
  
  await new Promise(resolve => setTimeout(resolve, 600))
  
  // Возвращаем фиксированный список профилей + случайные
  const mockProfiles = [
    {
      uuid: 'profile_1704099600000',
      name: 'Instagram Main',
      browser: 'mimic',
      os: 'win',
      platform: 'instagram',
      status: 'Inactive',
      created_at: '2024-01-01T12:00:00.000Z',
      selenium_port: 35001
    },
    {
      uuid: 'profile_1704186000000',
      name: 'YouTube Channel',
      browser: 'stealthfox',
      os: 'mac',
      platform: 'youtube',
      status: 'Active',
      created_at: '2024-01-02T12:00:00.000Z',
      selenium_port: 35002
    },
    {
      uuid: `profile_${Date.now()}`,
      name: 'TikTok Marketing',
      browser: 'mimic',
      os: 'win',
      platform: 'tiktok',
      status: 'Inactive',
      created_at: new Date().toISOString(),
      selenium_port: 35003
    }
  ]
  
  console.log('✅ [DEMO] Список профилей получен:', mockProfiles.length, 'профилей')
  return { data: mockProfiles, total: mockProfiles.length }
}