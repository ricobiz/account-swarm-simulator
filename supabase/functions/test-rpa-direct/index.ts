import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const currentTime = new Date().toISOString()
    console.log(`🚀 === НАЧАЛО ПРЯМОЙ ПРОВЕРКИ RPA БОТА ===`)
    console.log(`🕐 Время запуска: ${currentTime}`)
    console.log(`📍 Timestamp: ${Date.now()}`)
    
    const rpaEndpoint = Deno.env.get('RPA_BOT_ENDPOINT')
    
    if (!rpaEndpoint) {
      return new Response(
        JSON.stringify({ 
          error: 'RPA_BOT_ENDPOINT не настроен',
          endpoint: null 
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.log('🔍 Проверяем RPA бот напрямую:', rpaEndpoint)

    // 1. Проверяем /health endpoint
    let healthStatus = null;
    try {
      const healthResponse = await fetch(`${rpaEndpoint}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (healthResponse.ok) {
        healthStatus = await healthResponse.json()
        console.log('✅ Health check успешен:', healthStatus)
      } else {
        console.log('❌ Health check failed:', healthResponse.status)
        healthStatus = { error: `HTTP ${healthResponse.status}` }
      }
    } catch (error) {
      console.log('❌ Health check error:', error.message)
      healthStatus = { error: error.message }
    }

    // 2. Тест простого RPA запроса
    let rpaTestResult = null;
    try {
      const testTime = new Date().toISOString()
      console.log(`🧪 === ТЕСТИРУЕМ RPA ЗАПРОС ===`)
      console.log(`🕐 Время теста: ${testTime}`)
      console.log(`🎯 URL для теста: https://www.google.com`)
      
      const testTask = {
        task_id: `direct_test_${Date.now()}`,
        url: 'https://www.google.com',
        actions: [
          { type: 'navigate', url: 'https://www.google.com', description: 'Переходим на Google' },
          { type: 'wait', duration: 3000, description: 'Ждем загрузки страницы Google' },
          { type: 'screenshot', description: 'Делаем скриншот Google для теста' }
        ],
        timeout: 30,
        metadata: {
          platform: 'test_google',
          account: { username: 'test_user' },
          multilogin_token_info: {
            token: Deno.env.get('MULTILOGIN_TOKEN'),
            email: 'test@example.com'
          }
        }
      }

      console.log(`📤 Отправляем задачу на RPA бот: ${rpaEndpoint}/execute`)
      console.log(`🕐 Время отправки: ${new Date().toISOString()}`)

      const rpaResponse = await fetch(`${rpaEndpoint}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testTask)
      })

      console.log(`📥 Получен ответ от RPA бота: ${rpaResponse.status}`)
      console.log(`🕐 Время ответа: ${new Date().toISOString()}`)

      if (rpaResponse.ok) {
        rpaTestResult = await rpaResponse.json()
        console.log('✅ RPA тест успешен:', { 
          success: rpaTestResult.success,
          screenshot_available: !!rpaTestResult.screenshot,
          screenshot_length: rpaTestResult.screenshot ? rpaTestResult.screenshot.length : 0
        })
        
        // Обрезаем скриншот для логов (слишком длинный)
        if (rpaTestResult.screenshot) {
          console.log(`📸 Скриншот получен: ${rpaTestResult.screenshot.substring(0, 100)}...`)
        }
      } else {
        const errorText = await rpaResponse.text()
        console.log('❌ RPA тест failed:', rpaResponse.status, errorText)
        rpaTestResult = { 
          error: `HTTP ${rpaResponse.status}`, 
          details: errorText 
        }
      }
    } catch (error) {
      console.log('❌ RPA тест error:', error.message)
      rpaTestResult = { error: error.message }
    }

    // 3. Проверяем Multilogin статус
    let multiloginStatus = null;
    try {
      const multiloginResponse = await fetch(`${rpaEndpoint}/multilogin/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (multiloginResponse.ok) {
        multiloginStatus = await multiloginResponse.json()
        console.log('✅ Multilogin статус:', multiloginStatus)
      } else {
        console.log('❌ Multilogin статус failed:', multiloginResponse.status)
        multiloginStatus = { error: `HTTP ${multiloginResponse.status}` }
      }
    } catch (error) {
      console.log('❌ Multilogin статус error:', error.message)
      multiloginStatus = { error: error.message }
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      test_completed_at: Date.now(),
      rpa_endpoint: rpaEndpoint,
      health_check: healthStatus,
      rpa_test: rpaTestResult,
      multilogin_status: multiloginStatus,
      environment: {
        has_rpa_endpoint: !!rpaEndpoint,
        has_multilogin_token: !!Deno.env.get('MULTILOGIN_TOKEN')
      }
    }

    console.log(`✅ === ПРОВЕРКА ЗАВЕРШЕНА ===`)
    console.log(`🕐 Время завершения: ${new Date().toISOString()}`)
    console.log(`📊 Результат проверки:`, {
      health_ok: !healthStatus?.error,
      rpa_test_ok: rpaTestResult?.success,
      multilogin_ok: !multiloginStatus?.error,
      screenshot_received: !!rpaTestResult?.screenshot
    })

    return new Response(
      JSON.stringify(result, null, 2),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('❌ Критическая ошибка тестирования RPA:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }), 
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 500 
      }
    )
  }
})