import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Симуляция выполнения RPA задач для тестирования
async function simulateRPAExecution(task: any, multiloginProfile?: string): Promise<any> {
  console.log('🎯 Симуляция выполнения RPA задачи:', task.taskId)
  
  // Случайная задержка от 3 до 8 секунд
  const delay = Math.random() * 5000 + 3000
  await new Promise(resolve => setTimeout(resolve, delay))
  
  // Симуляция успешного выполнения с 85% вероятностью
  const isSuccess = Math.random() > 0.15
  
  if (isSuccess) {
    return {
      success: true,
      message: `Задача ${task.taskId} выполнена успешно`,
      executionTime: Math.round(delay),
      completedActions: task.actions?.length || 1,
      data: {
        platform: task.metadata?.platform || 'unknown',
        account: task.metadata?.account?.username || 'test-account',
        multilogin_profile: multiloginProfile || `simulated_profile_${Date.now()}`,
        multilogin_integrated: !!multiloginProfile,
        screenshot_urls: [
          `https://example.com/screenshot_${Date.now()}_1.png`,
          `https://example.com/screenshot_${Date.now()}_2.png`
        ],
        browser_fingerprint: {
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          screen_resolution: '1920x1080',
          timezone: 'Europe/Moscow',
          language: 'ru-RU'
        }
      }
    }
  } else {
    return {
      success: false,
      error: 'Ошибка выполнения: Таймаут соединения с платформой',
      executionTime: Math.round(delay),
      data: {
        platform: task.metadata?.platform || 'unknown',
        account: task.metadata?.account?.username || 'test-account'
      }
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

    if (req.method === 'POST') {
      const { task } = await req.json()
      console.log('🚀 Получена RPA задача:', JSON.stringify(task, null, 2))

      if (!task || !task.taskId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Отсутствует taskId в задаче'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Обновляем статус задачи на processing
      await supabase
        .from('rpa_tasks')
        .update({ status: 'processing' })
        .eq('task_id', task.taskId)

      console.log('📊 Статус задачи обновлен на processing')

      // Получаем Multilogin токен из секретов
      const multiloginToken = Deno.env.get('MULTILOGIN_TOKEN')
      
      if (!multiloginToken) {
        console.warn('⚠️ MULTILOGIN_TOKEN не найден, используем симуляцию')
      }

      try {
        // Используем встроенный Multilogin API эмулятор
        console.log('🔄 Интеграция с Multilogin API...')
        
        // Вызываем функцию multilogin-api для создания профиля
        let multiloginProfile = null
        try {
          const createProfileResponse = await supabase.functions.invoke('multilogin-api', {
            body: {
              platform: task.metadata?.platform || 'instagram',
              username: task.metadata?.account?.username || 'test_user',
              password: task.metadata?.account?.password || 'test_pass'
            }
          })
          
          if (createProfileResponse.data?.success) {
            multiloginProfile = createProfileResponse.data.profile_id
            console.log('✅ Multilogin профиль создан:', multiloginProfile)
          }
        } catch (error) {
          console.warn('⚠️ Ошибка создания Multilogin профиля:', error.message)
        }
        
        const result = await simulateRPAExecution(task, multiloginProfile)
        
        // Обновляем результат в базе данных
        const status = result.success ? 'completed' : 'failed'
        await supabase
          .from('rpa_tasks')
          .update({ 
            status,
            result_data: result
          })
          .eq('task_id', task.taskId)

        console.log(`✅ Задача ${task.taskId} завершена со статусом: ${status}`)

        return new Response(JSON.stringify({
          success: true,
          message: 'RPA задача принята и выполнена',
          taskId: task.taskId,
          result
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      } catch (error) {
        console.error('❌ Ошибка выполнения RPA:', error)

        // Обновляем статус задачи на failed
        await supabase
          .from('rpa_tasks')
          .update({ 
            status: 'failed',
            result_data: { 
              error: error.message,
              message: 'Ошибка выполнения RPA задачи'
            }
          })
          .eq('task_id', task.taskId)

        return new Response(JSON.stringify({
          success: false,
          error: 'Ошибка выполнения RPA',
          message: error.message
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Метод не поддерживается'
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('💥 Общая ошибка RPA функции:', error)
    
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