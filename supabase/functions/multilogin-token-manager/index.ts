import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Получаем automation token из секретов
    const automationToken = Deno.env.get('MULTILOGIN_TOKEN')

    console.log('🔧 Проверка MULTILOGIN_TOKEN:', automationToken ? '✅ Есть' : '❌ Отсутствует')

    if (!automationToken) {
      console.warn('⚠️ MULTILOGIN_TOKEN не настроен!')
      return new Response(JSON.stringify({
        success: false,
        error: 'MULTILOGIN_TOKEN не настроен',
        message: 'Добавьте automation token в секреты Supabase',
        fix_instructions: 'Получите automation token из Multilogin и добавьте как MULTILOGIN_TOKEN'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'GET') {
      // Получить информацию о токене
      console.log('📋 Запрос на получение информации о токене')
      
      const { data, error } = await supabase
        .from('multilogin_tokens')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data && new Date() < new Date(data.expires_at)) {
        return new Response(JSON.stringify({
          success: true,
          message: 'Активный токен найден в базе данных',
          expires_at: data.expires_at,
          timestamp: new Date().toISOString()
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } else {
        return new Response(JSON.stringify({
          success: false,
          message: 'Нет активного токена, требуется обновление',
          timestamp: new Date().toISOString()
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    if (req.method === 'POST') {
      // Сохранить automation token в базу данных
      console.log('💾 Сохранение automation token в базу данных')
      
      try {
        const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)) // 24 часа
        
        // Деактивируем старые токены
        const { error: updateError } = await supabase
          .from('multilogin_tokens')
          .update({ is_active: false })
          .neq('id', '00000000-0000-0000-0000-000000000000') // обновляем все существующие

        if (updateError) {
          console.warn('⚠️ Ошибка деактивации старых токенов:', updateError)
        }

        // Сохраняем automation token
        const { error: insertError } = await supabase
          .from('multilogin_tokens')
          .insert({
            email: 'automation-token',
            token: automationToken,
            expires_at: expiresAt.toISOString(),
            is_active: true
          })

        if (insertError) {
          throw insertError
        }

        console.log('✅ Automation token сохранен в базу данных')
        console.log('⏰ Действителен до:', expiresAt.toLocaleString())
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Automation token успешно сохранен',
          expires_in_hours: 24,
          next_refresh: expiresAt.toISOString(),
          timestamp: new Date().toISOString()
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Ошибка сохранения токена',
          message: error.message,
          timestamp: new Date().toISOString()
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Метод не поддерживается',
      supported_methods: ['GET', 'POST'],
      get_description: 'Получить информацию о токене',
      post_description: 'Сохранить automation token в базу'
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('💥 Критическая ошибка Token Manager:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Внутренняя ошибка сервера',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})