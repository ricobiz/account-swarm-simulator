import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mock скриншот Google (base64 изображение)
const mockGoogleScreenshot = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (req.method === 'POST') {
      const body = await req.json()
      console.log('🤖 Mock RPA Bot получил задачу:', JSON.stringify(body, null, 2))

      const { task_id, url, actions, multilogin_profile } = body

      // Имитируем задержку выполнения
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Проверяем что запрашивается скриншот
      const hasScreenshotAction = actions?.some((action: any) => action.type === 'screenshot')

      const response = {
        success: true,
        message: `Mock RPA: Успешно выполнил задачу на ${url}`,
        execution_time: 2.5,
        completed_actions: actions?.length || 0,
        task_id,
        // Возвращаем скриншот если запрашивался
        screenshot: hasScreenshotAction ? mockGoogleScreenshot : null,
        screenshots: hasScreenshotAction ? [mockGoogleScreenshot] : [],
        browser_info: {
          userAgent: "Mock Browser via Multilogin",
          profile: multilogin_profile || "mock_profile",
          fingerprint: "mock_fingerprint_12345"
        },
        logs: [
          "✅ Запустили браузер через Multilogin",
          `✅ Перешли на ${url}`,
          "✅ Дождались загрузки страницы",
          hasScreenshotAction ? "✅ Сделали скриншот" : "ℹ️ Скриншот не запрашивался",
          "✅ Задача завершена успешно"
        ]
      }

      console.log('📸 Mock RPA Bot возвращает результат:', response)

      return new Response(JSON.stringify(response), {
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
    console.error('❌ Ошибка Mock RPA Bot:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Ошибка Mock RPA Bot',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})