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
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        error: 'Метод не поддерживается',
        message: 'Используйте POST запрос для тестирования'
      }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const email = Deno.env.get('MULTILOGIN_EMAIL') || 'thailandislive@gmail.com'
    const password = Deno.env.get('MULTILOGIN_PASSWORD') || 'multilogin4815A!'
    
    console.log('🔄 Тестируем Multilogin API...')
    
    const testResults = []
    
    // Тест 1: api.multilogin.com/user/signin (JSON)
    try {
      console.log('📡 Тест 1: JSON формат')
      const response1 = await fetch('https://api.multilogin.com/user/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      })
      
      testResults.push({
        endpoint: 'api.multilogin.com/user/signin (JSON)',
        status: response1.status,
        ok: response1.ok,
        response: await response1.text()
      })
      
    } catch (error) {
      testResults.push({
        endpoint: 'api.multilogin.com/user/signin (JSON)',
        error: error.message
      })
    }
    
    // Тест 2: form data формат
    try {
      console.log('📡 Тест 2: Form data формат')
      const formData = new URLSearchParams()
      formData.append('email', email)
      formData.append('password', password)
      
      const response2 = await fetch('https://api.multilogin.com/user/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: formData
      })
      
      testResults.push({
        endpoint: 'api.multilogin.com/user/signin (Form)',
        status: response2.status,
        ok: response2.ok,
        response: await response2.text()
      })
      
    } catch (error) {
      testResults.push({
        endpoint: 'api.multilogin.com/user/signin (Form)',
        error: error.message
      })
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Тестирование Multilogin API завершено',
      credentials: {
        email: email,
        password_length: password.length
      },
      results: testResults,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('💥 Ошибка тестирования:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Ошибка тестирования API',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})