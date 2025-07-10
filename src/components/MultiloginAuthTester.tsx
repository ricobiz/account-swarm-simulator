import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

export const MultiloginAuthTester = () => {
  const [testing, setTesting] = useState(false)
  const [checkingSecrets, setCheckingSecrets] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [secretsResults, setSecretsResults] = useState<any>(null)
  const { toast } = useToast()

  const testMultiloginAuth = async () => {
    setTesting(true)
    try {
      console.log('🔄 Запуск теста Multilogin API...')
      
      const { data, error } = await supabase.functions.invoke('test-multilogin-auth', {
        body: {},
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (error) {
        throw error
      }
      
      setResults(data)
      console.log('📋 Результаты теста:', data)
      
      toast({
        title: "Тест завершен",
        description: "Проверьте результаты ниже",
      })
      
    } catch (error) {
      console.error('❌ Ошибка теста:', error)
      toast({
        title: "Ошибка теста",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setTesting(false)
    }
  }

  const checkSecrets = async () => {
    setCheckingSecrets(true)
    try {
      console.log('🔄 Проверка секретов Multilogin...')
      
      const { data, error } = await supabase.functions.invoke('check-multilogin-secrets', {
        body: {},
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (error) {
        throw error
      }
      
      setSecretsResults(data)
      console.log('📋 Статус секретов:', data)
      
      toast({
        title: "Проверка секретов завершена",
        description: "Проверьте результаты ниже",
      })
      
    } catch (error) {
      console.error('❌ Ошибка проверки секретов:', error)
      toast({
        title: "Ошибка проверки секретов",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setCheckingSecrets(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>🔧 Проверка секретов</CardTitle>
          <CardDescription>
            Сначала проверьте, правильно ли настроены учетные данные Multilogin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={checkSecrets} 
            disabled={checkingSecrets}
            className="w-full mb-4"
            variant="secondary"
          >
            {checkingSecrets ? '🔄 Проверка...' : '🔍 Проверить секреты'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🧪 Тест Multilogin API</CardTitle>
          <CardDescription>
            Проверка разных вариантов API endpoints для аутентификации
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={testMultiloginAuth} 
            disabled={testing}
            className="w-full"
          >
            {testing ? '🔄 Тестирование...' : '🚀 Запустить тест API'}
          </Button>
        </CardContent>
      </Card>

      {secretsResults && (
        <Card>
          <CardHeader>
            <CardTitle>🔐 Статус секретов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(secretsResults.secrets_status || {}).map(([key, info]: [string, any]) => (
                <div key={key} className="border rounded p-3">
                  <div className="font-medium">{key}</div>
                  <div className="text-sm mt-1 space-y-1">
                    <div className={info.configured ? 'text-green-600' : 'text-red-600'}>
                      {info.configured ? '✅ Настроен' : '❌ НЕ настроен'}
                    </div>
                    {info.configured && (
                      <div className="text-gray-600">
                        Значение: {info.value || info.first_3_chars || info.first_10_chars} (длина: {info.length})
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {secretsResults.recommendations && (
                <div className="bg-blue-50 p-3 rounded mt-4">
                  <strong>Рекомендации:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {secretsResults.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="text-sm">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Результаты теста</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm">
                <strong>Email:</strong> {results.credentials?.email}
                <br />
                <strong>Пароль:</strong> {results.credentials?.password_length} символов
                <br />
                <strong>Время:</strong> {new Date(results.timestamp).toLocaleString()}
              </div>
              
              <div className="space-y-3">
                {results.results?.map((result: any, index: number) => (
                  <div key={index} className="border rounded p-3">
                    <div className="font-medium">{result.endpoint}</div>
                    
                    {result.error ? (
                      <div className="text-red-600 text-sm mt-1">
                        ❌ Ошибка: {result.error}
                      </div>
                    ) : (
                      <div className="text-sm mt-1 space-y-1">
                        <div className={result.ok ? 'text-green-600' : 'text-orange-600'}>
                          {result.ok ? '✅' : '⚠️'} Статус: {result.status}
                        </div>
                        <div className="bg-gray-100 p-2 rounded text-xs max-h-32 overflow-y-auto">
                          <strong>Ответ:</strong>
                          <pre>{result.response}</pre>
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
    </div>
  )
}