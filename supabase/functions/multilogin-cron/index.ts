import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Cron job для автоматического обновления Multilogin токенов
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🕐 Запуск автоматического обновления Multilogin токенов...')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Вызываем функцию автоматического обновления токенов через POST
    const { data, error } = await supabase.functions.invoke('multilogin-token-manager', {
      method: 'POST'
    })

    if (error) {
      console.error('❌ Ошибка вызова multilogin-token-manager:', error)
      throw error
    }

    console.log('✅ Автоматическое обновление токенов завершено:', data)

    return new Response(JSON.stringify({
      success: true,
      message: 'Автоматическое обновление токенов выполнено',
      timestamp: new Date().toISOString(),
      result: data
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('💥 Ошибка автоматического обновления токенов:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Ошибка автоматического обновления',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})