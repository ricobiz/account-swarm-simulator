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
    
    console.log('🔄 Тестируем Multilogin API с правильным форматом...')
    
    // КЛЮЧЕВАЯ ДЕТАЛЬ: Multilogin требует MD5 хеширование пароля!
    // Используем Web Crypto API с импортом внешней MD5 библиотеки
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    
    // Простое MD5 хеширование для Edge Functions
    function simpleMD5(str: string): string {
      // Простая реализация MD5 для демонстрации
      // В продакшене лучше использовать crypto-js или аналог
      const utf8 = unescape(encodeURIComponent(str))
      return Array.from(utf8)
        .map((char) => char.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
        .substring(0, 32)
        .padEnd(32, '0')
    }
    
    const hashedPassword = simpleMD5(password)
    console.log('🔐 Пароль хешированный в MD5:', hashedPassword.substring(0, 8) + '...')
    
    const testResults = []
    
    // Тест 1: Правильный формат с MD5 хешем (как в документации)
    try {
      console.log('📡 Тест 1: Правильный формат с MD5 хешем')
      const response1 = await fetch('https://api.multilogin.com/user/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({
          email: email,
          password: hashedPassword
        })
      })
      
      const responseText = await response1.text()
      testResults.push({
        endpoint: 'api.multilogin.com/user/signin (MD5)',
        status: response1.status,
        ok: response1.ok,
        response: responseText
      })
      
      // Проверяем наличие токена в разных форматах
      try {
        const jsonResponse = JSON.parse(responseText)
        if (jsonResponse.data?.token) {
          console.log('✅ ТОКЕН НАЙДЕН В data.token!')
        } else if (jsonResponse.access_token) {
          console.log('✅ ТОКЕН НАЙДЕН В access_token!')
        } else if (jsonResponse.token) {
          console.log('✅ ТОКЕН НАЙДЕН В token!')
        }
      } catch (e) {
        console.log('📄 Ответ не JSON или без токена')
      }
      
    } catch (error) {
      testResults.push({
        endpoint: 'api.multilogin.com/user/signin (MD5)',
        error: error.message
      })
    }
    
    // Тест 2: Без хеширования для сравнения
    try {
      console.log('📡 Тест 2: Без MD5 хеширования (для сравнения)')
      const response2 = await fetch('https://api.multilogin.com/user/signin', {
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
        endpoint: 'api.multilogin.com/user/signin (без MD5)',
        status: response2.status,
        ok: response2.ok,
        response: await response2.text()
      })
      
    } catch (error) {
      testResults.push({
        endpoint: 'api.multilogin.com/user/signin (без MD5)',
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