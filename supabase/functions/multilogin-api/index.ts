import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Реальная интеграция с Multilogin API
class MultiloginAPIClient {
  private baseUrl: string
  private token: string

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl
    this.token = token
  }

  async makeRequest(endpoint: string, method: string = 'GET', body?: any) {
    const url = `${this.baseUrl}${endpoint}`
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    }

    const options: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    }
    
    try {
      const response = await fetch(url, options)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(`Multilogin API error: ${response.status} - ${data.message || 'Unknown error'}`)
      }
      
      return data
    } catch (error) {
      console.error(`Multilogin API request failed:`, error)
      throw error
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.makeRequest('/api/v1/profile')
      return true
    } catch (error) {
      console.error('Multilogin connection failed:', error)
      return false
    }
  }

  async createProfile(accountData: any): Promise<any> {
    const profileConfig = {
      name: `${accountData.platform}_${accountData.username}_${Date.now()}`,
      browser: 'mimic',
      os: 'win',
      startUrl: this.getStartUrl(accountData.platform),
      browserSettings: {
        userAgent: 'random',
        screenWidth: 1920,
        screenHeight: 1080,
        language: 'en-US',
        timezone: 'Europe/London'
      },
      proxySettings: accountData.proxy ? {
        type: 'http',
        host: accountData.proxy.host,
        port: accountData.proxy.port,
        username: accountData.proxy.username,
        password: accountData.proxy.password
      } : undefined,
      automation: {
        selenium: true,
        puppeteer: true
      }
    }

    const result = await this.makeRequest('/api/v1/profile', 'POST', profileConfig)
    console.log(`✅ Multilogin профиль создан: ${result.uuid}`)
    return result
  }

  async startProfile(profileId: string): Promise<any> {
    const result = await this.makeRequest(`/api/v1/profile/start?automation_type=selenium&profileId=${profileId}`, 'GET')
    
    console.log(`🚀 Multilogin профиль запущен: ${profileId}`)
    return {
      status: 'success',
      selenium_port: result.automation.port,
      webdriver_url: `http://localhost:${result.automation.port}`,
      profile_id: profileId
    }
  }

  async stopProfile(profileId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/api/v1/profile/stop?profileId=${profileId}`, 'GET')
      console.log(`🛑 Multilogin профиль остановлен: ${profileId}`)
      return true
    } catch (error) {
      console.error(`Ошибка остановки профиля ${profileId}:`, error)
      return false
    }
  }

  async getProfiles(): Promise<any[]> {
    const result = await this.makeRequest('/api/v1/profile')
    return result.data || []
  }

  private getStartUrl(platform: string): string {
    const urls: Record<string, string> = {
      'instagram': 'https://www.instagram.com/accounts/login/',
      'telegram': 'https://web.telegram.org/',
      'tiktok': 'https://www.tiktok.com/login',
      'youtube': 'https://www.youtube.com/',
      'reddit': 'https://www.reddit.com/login'
    }
    return urls[platform.toLowerCase()] || 'https://www.google.com'
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Получаем настройки Multilogin из секретов
    const multiloginToken = Deno.env.get('MULTILOGIN_TOKEN')
    const multiloginUrl = Deno.env.get('MULTILOGIN_URL') || 'https://api.multilogin.com'
    
    if (!multiloginToken) {
      return new Response(JSON.stringify({
        success: false,
        error: 'MULTILOGIN_TOKEN не настроен',
        message: 'Добавьте токен в Supabase секреты'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const multilogin = new MultiloginAPIClient(multiloginUrl, multiloginToken)

    const url = new URL(req.url)
    const path = url.pathname

    if (req.method === 'GET' && path.endsWith('/health')) {
      const isConnected = await multilogin.checkConnection()
      
      return new Response(JSON.stringify({
        status: isConnected ? 'connected' : 'disconnected',
        multilogin_connected: isConnected,
        timestamp: new Date().toISOString(),
        version: '4.0.0-real-api',
        api_url: multiloginUrl,
        features: [
          'profile_management', 
          'selenium_automation', 
          'proxy_integration',
          'fingerprint_spoofing'
        ]
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'GET' && path.endsWith('/profiles')) {
      const profiles = await multilogin.getProfiles()
      
      return new Response(JSON.stringify({
        success: true,
        profiles,
        count: profiles.length
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'POST' && path.endsWith('/profiles')) {
      const accountData = await req.json()
      
      if (!accountData.platform || !accountData.username) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Требуются platform и username'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const profile = await multilogin.createProfile(accountData)
      
      return new Response(JSON.stringify({
        success: true,
        profile_id: profile.uuid,
        profile_name: profile.name,
        selenium_ready: profile.automation?.selenium || false,
        message: 'Multilogin профиль создан успешно'
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'POST' && path.includes('/profiles/') && path.endsWith('/start')) {
      const profileId = path.split('/profiles/')[1].split('/start')[0]
      
      const result = await multilogin.startProfile(profileId)
      
      return new Response(JSON.stringify({
        success: true,
        ...result
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'POST' && path.includes('/profiles/') && path.endsWith('/stop')) {
      const profileId = path.split('/profiles/')[1].split('/stop')[0]
      
      const success = await multilogin.stopProfile(profileId)
      
      return new Response(JSON.stringify({
        success
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Endpoint не найден'
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Ошибка Multilogin API:', error)
    
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