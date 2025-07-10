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
    console.log('🔍 Тестирование секретов...')
    
    // Проверяем все секреты
    const secrets = {
      SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      MULTILOGIN_EMAIL: Deno.env.get('MULTILOGIN_EMAIL'),
      MULTILOGIN_PASSWORD: Deno.env.get('MULTILOGIN_PASSWORD'),
      RPA_BOT_ENDPOINT: Deno.env.get('RPA_BOT_ENDPOINT'),
      MULTILOGIN_TOKEN: Deno.env.get('MULTILOGIN_TOKEN')
    }
    
    console.log('📋 Результаты проверки секретов:')
    Object.entries(secrets).forEach(([key, value]) => {
      console.log(`${key}: ${value ? '✅ Есть' : '❌ Отсутствует'}`)
    })

    // Простой тест HTTP запроса
    let httpTestResult = null
    try {
      console.log('🌐 Тестируем HTTP запрос к httpbin.org...')
      const testResponse = await fetch('https://httpbin.org/get', {
        method: 'GET',
        headers: {
          'User-Agent': 'Deno-Test'
        }
      })
      httpTestResult = {
        status: testResponse.status,
        ok: testResponse.ok,
        success: true
      }
      console.log('✅ HTTP тест прошел успешно')
    } catch (error) {
      httpTestResult = {
        success: false,
        error: error.message
      }
      console.log('❌ HTTP тест провалился:', error.message)
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Тест Edge Function выполнен',
      timestamp: new Date().toISOString(),
      secrets_check: Object.fromEntries(
        Object.entries(secrets).map(([key, value]) => [key, !!value])
      ),
      secrets_values: {
        MULTILOGIN_EMAIL: secrets.MULTILOGIN_EMAIL || 'НЕ НАЙДЕН',
        MULTILOGIN_PASSWORD: secrets.MULTILOGIN_PASSWORD ? 'ЕСТЬ (скрыт)' : 'НЕ НАЙДЕН',
        RPA_BOT_ENDPOINT: secrets.RPA_BOT_ENDPOINT || 'НЕ НАЙДЕН'
      },
      http_test: httpTestResult,
      deno_version: Deno.version,
      environment: 'supabase-edge-function'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('💥 Критическая ошибка в test-secrets:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Ошибка в test-secrets функции',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})