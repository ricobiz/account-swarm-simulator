import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

export const MultiloginAuthTester = () => {
  const [testingAuth, setTestingAuth] = useState(false)
  const [checkingSecrets, setCheckingSecrets] = useState(false)
  const [testingSimple, setTestingSimple] = useState(false)
  
  const [authResults, setAuthResults] = useState<any>(null)
  const [secretsResults, setSecretsResults] = useState<any>(null)
  const [simpleResults, setSimpleResults] = useState<any>(null)
  
  const { toast } = useToast()

  const checkSecrets = async () => {
    setCheckingSecrets(true)
    try {
      console.log('🔄 Проверка секретов Multilogin...')
      
      const { data, error } = await supabase.functions.invoke('check-multilogin-secrets', {
        body: {},
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (error) throw error
      
      setSecretsResults(data)
      console.log('📋 Статус секретов:', data)
      
      toast({
        title: "✅ Проверка секретов завершена",
        description: "Все секреты проверены",
      })
      
    } catch (error) {
      console.error('❌ Ошибка проверки секретов:', error)
      toast({
        title: "❌ Ошибка проверки секретов",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setCheckingSecrets(false)
    }
  }

  const testMultiloginAuth = async () => {
    setTestingAuth(true)
    try {
      console.log('🔄 Тест получения токена через API...')
      
      const { data, error } = await supabase.functions.invoke('test-multilogin-auth', {
        body: {},
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (error) throw error
      
      setAuthResults(data)
      console.log('📋 Результаты теста API:', data)
      
      toast({
        title: "✅ Тест API завершен",
        description: "Проверьте результаты ниже",
      })
      
    } catch (error) {
      console.error('❌ Ошибка теста API:', error)
      toast({
        title: "❌ Ошибка теста API",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setTestingAuth(false)
    }
  }

  const testSimpleToken = async () => {
    setTestingSimple(true)
    try {
      console.log('🔄 Тест упрощенного токена...')
      
      const { data, error } = await supabase.functions.invoke('multilogin-simple', {
        body: {},
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (error) throw error
      
      setSimpleResults(data)
      console.log('📋 Результаты упрощенного теста:', data)
      
      toast({
        title: "✅ Упрощенный тест завершен",
        description: "Токен получен из переменных окружения",
      })
      
    } catch (error) {
      console.error('❌ Ошибка упрощенного теста:', error)
      toast({
        title: "❌ Ошибка упрощенного теста",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setTestingSimple(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">🧪 Multilogin API Тестирование</h1>
        <p className="text-muted-foreground">Комплексное тестирование всех аспектов Multilogin API</p>
      </div>

      {/* Шаг 1: Проверка секретов */}
      <Card className="border-2">
        <CardHeader className="bg-muted/50">
          <CardTitle className="text-foreground flex items-center gap-2">
            <span className="text-2xl">1️⃣</span>
            Проверка секретов
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Первый шаг: убедитесь что все учетные данные настроены правильно
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Button 
            onClick={checkSecrets} 
            disabled={checkingSecrets}
            className="w-full"
            variant="outline"
            size="lg"
          >
            {checkingSecrets ? '🔄 Проверяем...' : '🔍 Проверить секреты Multilogin'}
          </Button>
        </CardContent>
      </Card>

      {/* Шаг 2: Получение токена через API */}
      <Card className="border-2">
        <CardHeader className="bg-muted/50">
          <CardTitle className="text-foreground flex items-center gap-2">
            <span className="text-2xl">2️⃣</span>
            Тест получения токена через API
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Проверка аутентификации через разные API endpoints с MD5 хешированием
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Button 
            onClick={testMultiloginAuth} 
            disabled={testingAuth}
            className="w-full"
            variant="default"
            size="lg"
          >
            {testingAuth ? '🔄 Тестируем API...' : '🚀 Тест получения токена через API'}
          </Button>
        </CardContent>
      </Card>

      {/* Шаг 3: Упрощенный тест */}
      <Card className="border-2">
        <CardHeader className="bg-muted/50">
          <CardTitle className="text-foreground flex items-center gap-2">
            <span className="text-2xl">3️⃣</span>
            Упрощенный тест (готовый токен)
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Проверка работы с уже имеющимся токеном из переменных окружения
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Button 
            onClick={testSimpleToken} 
            disabled={testingSimple}
            className="w-full"
            variant="secondary"
            size="lg"
          >
            {testingSimple ? '🔄 Проверяем...' : '⚡ Тест готового токена'}
          </Button>
        </CardContent>
      </Card>

      {/* Результаты проверки секретов */}
      {secretsResults && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-green-800 dark:text-green-200">🔐 Статус секретов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(secretsResults.secrets_status || {}).map(([key, info]: [string, any]) => (
                <div key={key} className="border rounded-lg p-4 bg-background">
                  <div className="font-semibold text-foreground">{key}</div>
                  <div className="text-sm mt-2 space-y-1">
                    <div className={info.configured ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {info.configured ? '✅ Настроен' : '❌ НЕ настроен'}
                    </div>
                    {info.configured && (
                      <div className="text-muted-foreground">
                        Значение: {info.value || info.first_3_chars || info.first_10_chars} (длина: {info.length})
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Результаты теста API */}
      {authResults && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-800 dark:text-blue-200">📊 Результаты теста API</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm bg-background p-3 rounded border">
                <strong className="text-foreground">Email:</strong> <span className="text-muted-foreground">{authResults.credentials?.email}</span><br />
                <strong className="text-foreground">Пароль:</strong> <span className="text-muted-foreground">{authResults.credentials?.password_length} символов</span><br />
                <strong className="text-foreground">Время:</strong> <span className="text-muted-foreground">{new Date(authResults.timestamp).toLocaleString()}</span>
              </div>
              
              <div className="space-y-3">
                {authResults.results?.map((result: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 bg-background">
                    <div className="font-semibold text-foreground mb-2">{result.endpoint}</div>
                    
                    {result.error ? (
                      <div className="text-red-600 dark:text-red-400 text-sm">
                        ❌ Ошибка: {result.error}
                      </div>
                    ) : (
                      <div className="text-sm space-y-2">
                        <div className={result.ok ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}>
                          {result.ok ? '✅' : '⚠️'} Статус: {result.status}
                        </div>
                        <div className="bg-muted p-3 rounded text-xs max-h-32 overflow-y-auto">
                          <strong className="text-foreground">Ответ:</strong>
                          <pre className="text-muted-foreground whitespace-pre-wrap mt-1">{result.response}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Результаты упрощенного теста */}
      {simpleResults && (
        <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="text-purple-800 dark:text-purple-200">⚡ Результаты упрощенного теста</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="bg-background p-4 rounded border">
                <div className="text-sm space-y-2">
                  <div><strong className="text-foreground">Статус:</strong> <span className="text-green-600 dark:text-green-400">{simpleResults.success ? '✅ Успешно' : '❌ Ошибка'}</span></div>
                  <div><strong className="text-foreground">Сообщение:</strong> <span className="text-muted-foreground">{simpleResults.message}</span></div>
                  {simpleResults.token && (
                    <div><strong className="text-foreground">Токен:</strong> <span className="text-muted-foreground font-mono">{simpleResults.token.substring(0, 50)}...</span></div>
                  )}
                  {simpleResults.note && (
                    <div><strong className="text-foreground">Примечание:</strong> <span className="text-muted-foreground">{simpleResults.note}</span></div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}