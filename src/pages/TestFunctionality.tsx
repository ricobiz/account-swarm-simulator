import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { MultiloginProfileManager } from '@/components/MultiloginProfileManager';
import { MultiloginTokenStatus } from '@/components/MultiloginTokenStatus';

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
}

export default function TestFunctionality() {
  const [tokenResult, setTokenResult] = useState<TestResult | null>(null);
  const [rpaResult, setRpaResult] = useState<TestResult | null>(null);
  const [secretsResult, setSecretsResult] = useState<TestResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});

  const log = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, logMessage]);
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  const testMultiloginTokens = async () => {
    setLoading(prev => ({ ...prev, tokens: true }));
    try {
      log('🚀 Тестирование токенов Multilogin из базы данных...');
      
      // Проверяем токены напрямую из базы данных
      const { data: tokenData, error: tokenError } = await supabase
        .from('multilogin_tokens')
        .select('token, expires_at, is_active, email')
        .eq('is_active', true)
        .maybeSingle();

      if (tokenError) {
        throw new Error(`Ошибка базы данных: ${tokenError.message}`);
      }

      if (!tokenData) {
        log('❌ Токен не найден в базе данных', 'error');
        setTokenResult({
          success: false,
          message: 'Токен не найден в базе данных. Нужно получить новый токен.'
        });
        return;
      }

      const isExpired = new Date() > new Date(tokenData.expires_at);
      
      if (isExpired) {
        log('⚠️ Токен истек, требуется обновление', 'error');
        setTokenResult({
          success: false,
          message: 'Токен истек. Используйте кнопку "Обновить токен" в статусе токенов.'
        });
        return;
      }

      log(`✅ Токен активен! Email: ${tokenData.email}`, 'success');
      log(`📅 Действителен до: ${new Date(tokenData.expires_at).toLocaleString()}`, 'info');
      
      // Тестируем использование токена для получения профилей
      const { data: profilesData, error: profilesError } = await supabase.functions.invoke('multilogin-profiles', {
        body: {}
      });

      if (profilesError) {
        log(`⚠️ Ошибка получения профилей: ${profilesError.message}`, 'error');
      } else {
        log(`✅ Профили получены: ${profilesData?.profiles?.length || 0} профилей`, 'success');
      }

      setTokenResult({
        success: true,
        message: 'Токен активен и работает!',
        data: {
          token_valid: true,
          email: tokenData.email,
          expires_at: tokenData.expires_at,
          profiles_test: profilesData
        }
      });
    } catch (error: any) {
      log(`❌ Ошибка тестирования токенов: ${error.message}`, 'error');
      setTokenResult({
        success: false,
        message: error.message
      });
    } finally {
      setLoading(prev => ({ ...prev, tokens: false }));
    }
  };

  const testRPATask = async () => {
    setLoading(prev => ({ ...prev, rpa: true }));
    try {
      log('🚀 Выполнение RPA задачи...');
      
      const taskId = `test_${Date.now()}`;
      const task = {
        taskId: taskId,
        url: 'https://httpbin.org/get',
        actions: [
          { type: 'navigate', url: 'https://httpbin.org/get' },
          { type: 'wait', duration: 2000 },
          { type: 'screenshot' }
        ],
        metadata: {
          platform: 'test',
          account: { username: 'test_user' }
        },
        timeout: 30
      };
      
      const { data, error } = await supabase.functions.invoke('rpa-task', {
        body: { task }
      });

      if (error) {
        throw new Error(error.message);
      }

      log(`✅ RPA задача выполнена: ${JSON.stringify(data, null, 2)}`, 'success');
      setRpaResult({
        success: true,
        message: 'RPA задача выполнена успешно!',
        data: data
      });
    } catch (error: any) {
      log(`❌ Ошибка выполнения RPA: ${error.message}`, 'error');
      setRpaResult({
        success: false,
        message: error.message
      });
    } finally {
      setLoading(prev => ({ ...prev, rpa: false }));
    }
  };

  const testSecrets = async () => {
    setLoading(prev => ({ ...prev, secrets: true }));
    try {
      log('🔍 Тестирование секретов и Edge Function...');
      
      const { data, error } = await supabase.functions.invoke('test-secrets', {
        body: {}
      });

      if (error) {
        throw new Error(error.message);
      }

      log(`✅ Тест секретов выполнен: ${JSON.stringify(data, null, 2)}`, 'success');
      setSecretsResult({
        success: true,
        message: 'Тест секретов выполнен успешно!',
        data: data
      });
    } catch (error: any) {
      log(`❌ Ошибка тестирования секретов: ${error.message}`, 'error');
      setSecretsResult({
        success: false,
        message: error.message
      });
    } finally {
      setLoading(prev => ({ ...prev, secrets: false }));
    }
  };

  const clearLogs = () => {
    setLogs([]);
    log('📋 Логи очищены');
  };

  React.useEffect(() => {
    log('🎯 Система тестирования запущена');
    log('📋 Готова к тестированию функциональности');
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">🧪 Панель тестирования RPA системы</h1>
        <p className="text-muted-foreground">
          Централизованное управление и тестирование всех компонентов RPA системы
        </p>
      </div>

      <Tabs defaultValue="multilogin" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="multilogin">🔐 Multilogin</TabsTrigger>
          <TabsTrigger value="rpa">🤖 RPA Tasks</TabsTrigger>
          <TabsTrigger value="system">⚙️ System</TabsTrigger>
          <TabsTrigger value="logs">📋 Logs</TabsTrigger>
        </TabsList>

        {/* Multilogin вкладка */}
        <TabsContent value="multilogin" className="space-y-6">
          <div className="grid gap-6">
            {/* Статус токенов */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🔑 Статус токенов Multilogin
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <MultiloginTokenStatus />
                  
                  <div className="border-t pt-4">
                    <Button 
                      onClick={testMultiloginTokens}
                      disabled={loading.tokens}
                      className="w-full"
                      variant="outline"
                    >
                      {loading.tokens ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                          Тестирование токенов...
                        </div>
                      ) : (
                        '🔍 Ручное тестирование токенов'
                      )}
                    </Button>

                    {tokenResult && (
                      <div className={`mt-4 p-4 rounded-lg border ${
                        tokenResult.success 
                          ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                          : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={tokenResult.success ? 'default' : 'destructive'}>
                            {tokenResult.success ? '✅ Успешно' : '❌ Ошибка'}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">{tokenResult.message}</p>
                        {tokenResult.data && (
                          <details className="mt-3">
                            <summary className="text-xs cursor-pointer text-muted-foreground">
                              Показать детали ответа
                            </summary>
                            <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto">
                              {JSON.stringify(tokenResult.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Управление профилями */}
            <MultiloginProfileManager />
          </div>
        </TabsContent>

        {/* RPA Tasks вкладка */}
        <TabsContent value="rpa" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🤖 Тестирование RPA задач
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Button 
                  onClick={testRPATask}
                  disabled={loading.rpa}
                  size="lg"
                  className="h-16"
                >
                  {loading.rpa ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Выполнение задачи...
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-lg">🚀 Запустить тест RPA</div>
                      <div className="text-xs opacity-75">Тестирование базовой RPA задачи</div>
                    </div>
                  )}
                </Button>

                <div className="space-y-2">
                  <h4 className="font-medium">Что тестируется:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Создание RPA задачи</li>
                    <li>• Навигация по URL</li>
                    <li>• Ожидание загрузки</li>
                    <li>• Создание скриншота</li>
                  </ul>
                </div>
              </div>

              {rpaResult && (
                <div className={`p-4 rounded-lg border ${
                  rpaResult.success 
                    ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                    : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={rpaResult.success ? 'default' : 'destructive'}>
                      {rpaResult.success ? '✅ Успешно' : '❌ Ошибка'}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{rpaResult.message}</p>
                  {rpaResult.data?.taskId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Task ID: {rpaResult.data.taskId}
                    </p>
                  )}
                  {rpaResult.data && (
                    <details className="mt-3">
                      <summary className="text-xs cursor-pointer text-muted-foreground">
                        Показать детали ответа
                      </summary>
                      <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto">
                        {JSON.stringify(rpaResult.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System вкладка */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ⚙️ Системные тесты
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Button 
                  onClick={testSecrets}
                  disabled={loading.secrets}
                  size="lg"
                  variant="outline"
                  className="h-16"
                >
                  {loading.secrets ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      Проверка секретов...
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-lg">🔍 Тест секретов</div>
                      <div className="text-xs opacity-75">Проверка Edge Functions и секретов</div>
                    </div>
                  )}
                </Button>

                <div className="space-y-2">
                  <h4 className="font-medium">Что проверяется:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Доступность секретов</li>
                    <li>• Работа Edge Functions</li>
                    <li>• Конфигурация переменных</li>
                    <li>• Связи с внешними API</li>
                  </ul>
                </div>
              </div>

              {secretsResult && (
                <div className={`p-4 rounded-lg border ${
                  secretsResult.success 
                    ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                    : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={secretsResult.success ? 'default' : 'destructive'}>
                      {secretsResult.success ? '✅ Успешно' : '❌ Ошибка'}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{secretsResult.message}</p>
                  {secretsResult.data && (
                    <details className="mt-3">
                      <summary className="text-xs cursor-pointer text-muted-foreground">
                        Показать детали ответа
                      </summary>
                      <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto">
                        {JSON.stringify(secretsResult.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs вкладка */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>📋 Логи выполнения</CardTitle>
              <Button onClick={clearLogs} variant="outline" size="sm">
                Очистить логи
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full rounded border p-4 bg-slate-950 text-green-400 font-mono text-sm">
                {logs.length === 0 ? (
                  <div className="text-muted-foreground text-center py-8">
                    Логи пусты. Выполните любой тест для появления логов.
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1 break-words">
                      {log}
                    </div>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}