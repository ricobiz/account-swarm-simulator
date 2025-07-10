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
    // Проверяем какие секреты реально настроены
    const multiloginEmail = Deno.env.get('MULTILOGIN_EMAIL')
    const multiloginPassword = Deno.env.get('MULTILOGIN_PASSWORD')
    const multiloginToken = Deno.env.get('MULTILOGIN_TOKEN')
    
    console.log('🔧 Проверка всех Multilogin секретов...')
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Проверка секретов Multilogin',
      secrets_status: {
        MULTILOGIN_EMAIL: {
          configured: !!multiloginEmail,
          value: multiloginEmail || 'НЕ НАСТРОЕН',
          length: multiloginEmail ? multiloginEmail.length : 0
        },
        MULTILOGIN_PASSWORD: {
          configured: !!multiloginPassword,
          first_3_chars: multiloginPassword ? multiloginPassword.substring(0, 3) + '...' : 'НЕ НАСТРОЕН',
          length: multiloginPassword ? multiloginPassword.length : 0
        },
        MULTILOGIN_TOKEN: {
          configured: !!multiloginToken,
          first_10_chars: multiloginToken ? multiloginToken.substring(0, 10) + '...' : 'НЕ НАСТРОЕН',
          length: multiloginToken ? multiloginToken.length : 0
        }
      },
      recommendations: multiloginEmail && multiloginPassword ? 
        ['Учетные данные настроены, проверьте их корректность в Multilogin'] :
        ['Добавьте MULTILOGIN_EMAIL и MULTILOGIN_PASSWORD в секреты Supabase'],
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('💥 Ошибка проверки секретов:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Ошибка проверки секретов',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})