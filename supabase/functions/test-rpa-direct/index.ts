import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // Инициализируем Supabase клиент
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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

    // 2. Получаем актуальный токен Multilogin из базы данных
    console.log('🔑 Получаем токен Multilogin из базы данных...')
    
    const { data: tokenData, error: tokenError } = await supabase
      .from('multilogin_tokens')
      .select('token, email, expires_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let multiloginToken = null;
    if (tokenError) {
      console.log('❌ Ошибка получения токена:', tokenError.message)
    } else if (!tokenData) {
      console.log('⚠️ Токен Multilogin не найден в базе данных')
    } else if (new Date() > new Date(tokenData.expires_at)) {
      console.log('⚠️ Токен Multilogin истек')
    } else {
      multiloginToken = tokenData.token;
      console.log(`✅ Токен Multilogin получен: ${tokenData.email}, истекает: ${tokenData.expires_at}`)
    }

    // 3. Тест простого RPA запроса
    let rpaTestResult = null;
    try {
      const testTime = new Date().toISOString()
      console.log(`🧪 === ТЕСТИРУЕМ RPA ЗАПРОС ===`)
      console.log(`🕐 Время теста: ${testTime}`)
      console.log(`🎯 URL для теста: https://www.google.com`)
      console.log(`🔑 Используем токен: ${multiloginToken ? 'ДА' : 'НЕТ'}`)
      
      const testTask = {
        taskId: `direct_test_${Date.now()}`, // Исправлено: taskId вместо task_id
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
          multilogin_token_info: multiloginToken ? {
            token: multiloginToken,
            email: tokenData?.email || 'unknown'
          } : null
        },
        multilogin_token: multiloginToken // Добавляем токен прямо в задачу
      }

      console.log(`📤 Отправляем задачу на RPA бот: ${rpaEndpoint}/execute`)
      console.log(`🕐 Время отправки: ${new Date().toISOString()}`)

      // Сохраняем задачу в базу данных для отображения в мониторе
      console.log('💾 Сохраняем задачу в базу данных...')
      const { data: savedTask, error: saveError } = await supabase
        .from('rpa_tasks')
        .insert({
          task_id: testTask.taskId,
          task_data: testTask,
          status: 'processing',
          user_id: null // тестовая задача
        })
        .select()
        .single()

      if (saveError) {
        console.log('⚠️ Ошибка сохранения задачи:', saveError.message)
      } else {
        console.log('✅ Задача сохранена в базу:', savedTask.id)
      }

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

        // Обновляем задачу в базе данных с результатом
        if (savedTask) {
          console.log('💾 Обновляем результат задачи в базе...')
          const { error: updateError } = await supabase
            .from('rpa_tasks')
            .update({
              status: rpaTestResult.success ? 'completed' : 'failed',
              result_data: {
                success: rpaTestResult.success,
                screenshot: rpaTestResult.screenshot,
                message: rpaTestResult.message || 'Тест выполнен',
                data: {
                  platform: 'test_google',
                  account: 'test_user',
                  screenshot_received: !!rpaTestResult.screenshot
                }
              }
            })
            .eq('id', savedTask.id)

          if (updateError) {
            console.log('⚠️ Ошибка обновления задачи:', updateError.message)
          } else {
            console.log('✅ Результат задачи сохранен в базу')
          }
        }
      } else {
        const errorText = await rpaResponse.text()
        console.log('❌ RPA тест failed:', rpaResponse.status, errorText)
        rpaTestResult = { 
          error: `HTTP ${rpaResponse.status}`, 
          details: errorText 
        }

        // Обновляем задачу как failed
        if (savedTask) {
          console.log('💾 Отмечаем задачу как failed...')
          await supabase
            .from('rpa_tasks')
            .update({
              status: 'failed',
              result_data: {
                success: false,
                error: rpaTestResult.error,
                message: 'Ошибка выполнения теста'
              }
            })
            .eq('id', savedTask.id)
        }
      }
    } catch (error) {
      console.log('❌ RPA тест error:', error.message)
      rpaTestResult = { error: error.message }
    }

    // 4. Проверяем Multilogin статус
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
      token_info: {
        has_database_token: !!multiloginToken,
        token_email: tokenData?.email || null,
        token_expires: tokenData?.expires_at || null
      }
    }

    console.log(`✅ === ПРОВЕРКА ЗАВЕРШЕНА ===`)
    console.log(`🕐 Время завершения: ${new Date().toISOString()}`)
    console.log(`📊 Результат проверки:`, {
      health_ok: !healthStatus?.error,
      rpa_test_ok: rpaTestResult?.success,
      multilogin_ok: !multiloginStatus?.error,
      screenshot_received: !!rpaTestResult?.screenshot,
      token_sent: !!multiloginToken
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