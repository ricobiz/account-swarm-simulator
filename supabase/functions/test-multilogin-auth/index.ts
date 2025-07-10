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
    // Поддерживаем только POST запросы для тестирования
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
    
    console.log('🔄 Тестируем разные варианты Multilogin API...')
    
    const testResults = []
    
    // Вариант 1: Правильный launcher API endpoint  
    try {
      console.log('📡 Тест 1: launcher-api.multilogin.com/api/v1/signin')
      const response1 = await fetch('https://launcher-api.multilogin.com/api/v1/signin', {
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
      
      const result1 = {
        endpoint: 'launcher-api.multilogin.com/api/v1/signin',
        status: response1.status,
        ok: response1.ok,
        response: await response1.text()
      }
      
      testResults.push(result1)
      console.log('📊 Результат 1:', result1)
      
    } catch (error) {
      testResults.push({
        endpoint: 'launcher-api.multilogin.com/api/v1/signin',
        error: error.message
      })
    }
    
    // Вариант 2: accounts-api
    try {
      console.log('📡 Тест 2: accounts-api.multilogin.com/api/v1/signin')
      const response2 = await fetch('https://accounts-api.multilogin.com/api/v1/signin', {
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
      
      const result2 = {
        endpoint: 'accounts-api.multilogin.com/api/v1/signin',
        status: response2.status,
        ok: response2.ok,
        response: await response2.text()
      }
      
      testResults.push(result2)
      console.log('📊 Результат 2:', result2)
      
    } catch (error) {
      testResults.push({
        endpoint: 'accounts-api.multilogin.com/api/v1/signin',
        error: error.message
      })
    }
    
    // Вариант 3: Попробуем разные форматы для api.multilogin.com/user/signin
    try {
      console.log('📡 Тест 3: api.multilogin.com/user/signin (стандартный формат)')
      const response3 = await fetch('https://api.multilogin.com/user/signin', {
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
      
      const result3 = {
        endpoint: 'api.multilogin.com/user/signin (стандартный)',
        status: response3.status,
        ok: response3.ok,
        response: await response3.text()
      }
      
      testResults.push(result3)
      console.log('📊 Результат 3:', result3)
      
    } catch (error) {
      testResults.push({
        endpoint: 'api.multilogin.com/user/signin (стандартный)',
        error: error.message
      })
    }
    
    // Вариант 3b: Попробуем с дополнительными полями
    try {
      console.log('📡 Тест 3b: api.multilogin.com/user/signin (с дополнительными полями)')
      const response3b = await fetch('https://api.multilogin.com/user/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'MultiloginAPI/1.0'
        },
        body: JSON.stringify({
          email: email,
          password: password,
          version: "6.0",
          os: "windows"
        })
      })
      
      const result3b = {
        endpoint: 'api.multilogin.com/user/signin (расширенный)',
        status: response3b.status,
        ok: response3b.ok,
        response: await response3b.text()
      }
      
      testResults.push(result3b)
      console.log('📊 Результат 3b:', result3b)
      
    } catch (error) {
      testResults.push({
        endpoint: 'api.multilogin.com/user/signin (расширенный)',
        error: error.message
      })
    }
    
    // Вариант 3c: Попробуем POST form data
    try {
      console.log('📡 Тест 3c: api.multilogin.com/user/signin (form data)')
      const formData = new URLSearchParams()
      formData.append('email', email)
      formData.append('password', password)
      
      const response3c = await fetch('https://api.multilogin.com/user/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: formData
      })
      
      const result3c = {
        endpoint: 'api.multilogin.com/user/signin (form data)',
        status: response3c.status,
        ok: response3c.ok,
        response: await response3c.text()
      }
      
      testResults.push(result3c)
      console.log('📊 Результат 3c:', result3c)
      
    } catch (error) {
      testResults.push({
        endpoint: 'api.multilogin.com/user/signin (form data)',
        error: error.message
      })
    }
    
    // Вариант 4: Прямой API для токена 
    try {
      console.log('📡 Тест 4: api.multilogin.com/user/auth')
      const response4 = await fetch('https://api.multilogin.com/user/auth', {
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
      
      const result4 = {
        endpoint: 'api.multilogin.com/user/auth',
        status: response4.status,
        ok: response4.ok,
        response: await response4.text()
      }
      
      testResults.push(result4)
      console.log('📊 Результат 4:', result4)
      
    } catch (error) {
      testResults.push({
        endpoint: 'api.multilogin.com/user/auth',
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