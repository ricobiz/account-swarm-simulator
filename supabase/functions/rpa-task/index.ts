import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Реальное выполнение RPA задач через Railway RPA Bot
async function executeRPATask(task: any, multiloginProfile?: string): Promise<any> {
  console.log('🎯 Выполнение RPA задачи:', task.taskId)
  
  const rpaEndpoint = Deno.env.get('RPA_BOT_ENDPOINT')
  
  // Если RPA_BOT_ENDPOINT не настроен, используем mock
  const endpoint = rpaEndpoint || 'mock'
  
  if (endpoint === 'mock' || !rpaEndpoint) {
    console.log('🤖 Используем Mock RPA Bot')
    
    // Вызываем нашу mock edge функцию
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const mockResponse = await supabase.functions.invoke('mock-rpa-bot', {
      body: {
        task_id: task.taskId,
        actions: task.actions || [],
        url: task.url || '',
        account_data: task.metadata?.account || {},
        multilogin_profile: multiloginProfile,
        human_behavior: task.humanBehavior || true,
        timeout: task.timeout || 60,
        platform: task.metadata?.platform || 'unknown'
      }
    })
    
    if (mockResponse.error) {
      throw new Error(`Mock RPA error: ${mockResponse.error.message}`)
    }
    
    return mockResponse.data
  }

  try {
    console.log('📡 Отправляем задачу на Railway RPA Bot:', rpaEndpoint)
    
    const response = await fetch(`${rpaEndpoint}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task_id: task.taskId,
        actions: task.actions || [],
        url: task.url || '',
        account_data: task.metadata?.account || {},
        multilogin_profile: multiloginProfile,
        human_behavior: task.humanBehavior || true,
        timeout: task.timeout || 60,
        platform: task.metadata?.platform || 'unknown'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`RPA Bot error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ RPA задача выполнена реально:', result)
    
    return {
      success: result.success || false,
      message: result.message || 'Задача выполнена',
      executionTime: result.execution_time || 0,
      completedActions: result.completed_actions || 0,
      screenshot: result.screenshot || null,
      data: {
        platform: task.metadata?.platform || 'unknown',
        account: task.metadata?.account?.username || 'unknown',
        multilogin_profile: multiloginProfile || null,
        multilogin_integrated: !!multiloginProfile,
        screenshot_urls: result.screenshots || [],
        browser_fingerprint: result.browser_info || {},
        execution_details: result.logs || []
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка выполнения реальной RPA задачи:', error.message)
    return {
      success: false,
      error: error.message,
      message: `Ошибка выполнения: ${error.message}`,
      executionTime: 0,
      data: {
        platform: task.metadata?.platform || 'unknown',
        account: task.metadata?.account?.username || 'unknown'
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
        console.warn('⚠️ MULTILOGIN_TOKEN не найден, пробуем автоматическую систему')
      }

      try {
        // Используем реальную интеграцию с Multilogin API
        console.log('🔄 Интеграция с реальным Multilogin API...')
        
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
        
        const result = await executeRPATask(task, multiloginProfile)
        
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