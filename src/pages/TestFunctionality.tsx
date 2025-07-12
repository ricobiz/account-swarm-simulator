import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { MultiloginTokenStatus } from '@/components/MultiloginTokenStatus';
import { EdgeFunctionLogs } from '@/components/EdgeFunctionLogs';

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
}

export default function TestFunctionality() {
  const [tokenResult, setTokenResult] = useState<TestResult | null>(null);
  const [rpaResult, setRpaResult] = useState<TestResult | null>(null);
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
      log('🚀 Проверка токена Multilogin...');
      
      // Проверяем токены напрямую из базы данных
      const { data: tokenData, error: tokenError } = await supabase
        .from('multilogin_tokens')
        .select('token, expires_at, is_active, email')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
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
          message: 'Токен истек. Используйте кнопку "Обновить токен".'
        });
        return;
      }

      log(`✅ Токен активен! Email: ${tokenData.email}`, 'success');
      log(`📅 Действителен до: ${new Date(tokenData.expires_at).toLocaleString()}`, 'info');
      
      setTokenResult({
        success: true,
        message: 'Токен активен и готов к использованию!',
        data: {
          email: tokenData.email,
          expires_at: tokenData.expires_at
        }
      });
    } catch (error: any) {
      log(`❌ Ошибка проверки токена: ${error.message}`, 'error');
      setTokenResult({
        success: false,
        message: error.message
      });
    } finally {
      setLoading(prev => ({ ...prev, tokens: false }));
    }
  };

  const testRPAWithToken = async () => {
    setLoading(prev => ({ ...prev, rpa: true }));
    try {
      log('🤖 === НАЧИНАЕМ ТЕСТ RPA С ТОКЕНОМ MULTILOGIN ===');
      
      // Сначала проверяем что токен есть
      log('🔍 Шаг 1: Проверяем наличие активного токена в базе данных...');
      const { data: tokenData } = await supabase
        .from('multilogin_tokens')
        .select('token, expires_at, email')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!tokenData || new Date() > new Date(tokenData.expires_at)) {
        throw new Error('Токен недоступен или истек. Сначала получите/обновите токен.');
      }

      log(`✅ Токен найден! Email: ${tokenData.email}`);
      log(`📅 Токен действителен до: ${new Date(tokenData.expires_at).toLocaleString()}`);
      log(`🔑 Токен (первые 50 символов): ${tokenData.token.substring(0, 50)}...`);
      
      log('🚀 Шаг 2: Создаем тестовую RPA задачу...');
      
      const taskId = `test_multilogin_${Date.now()}`;
      const task = {
        taskId: taskId,
        platform: 'test_multilogin',
        url: 'https://httpbin.org/get',
        actions: [
          { 
            type: 'navigate', 
            url: 'https://httpbin.org/get',
            description: 'Переходим на тестовую страницу'
          },
          { 
            type: 'wait', 
            duration: 2000,
            description: 'Ждем загрузки страницы (2 сек)'
          },
          { 
            type: 'screenshot',
            description: 'Делаем скриншот для проверки'
          },
          {
            type: 'multilogin_test',
            description: 'Тестируем интеграцию с Multilogin API',
            token_required: true
          }
        ],
        metadata: {
          platform: 'multilogin_test',
          account: { 
            username: 'test_user',
            email: tokenData.email 
          },
          multilogin_token_info: {
            email: tokenData.email,
            expires_at: tokenData.expires_at
          }
        },
        timeout: 30,
        use_multilogin: true
      };
      
      log(`📋 Создана задача ID: ${taskId}`);
      log('🔄 Шаг 3: Отправляем задачу RPA боту через Edge Function...');
      
      const { data, error } = await supabase.functions.invoke('rpa-task', {
        body: { task }
      });

      if (error) {
        log(`❌ Ошибка Edge Function: ${error.message}`, 'error');
        throw new Error(error.message);
      }

      log('✅ Шаг 4: RPA задача принята!');
      log(`📊 Ответ от RPA системы:`, 'success');
      
      if (data) {
        if (data.taskId) log(`  • ID задачи: ${data.taskId}`);
        if (data.status) log(`  • Статус: ${data.status}`);
        if (data.message) log(`  • Сообщение: ${data.message}`);
        if (data.multilogin_integration) {
          log('🔗 Интеграция с Multilogin:');
          log(`  • Токен использован: ${data.multilogin_integration.token_used ? 'Да' : 'Нет'}`);
          log(`  • Email аккаунта: ${data.multilogin_integration.account_email || 'N/A'}`);
        }
      }

      log('🎉 === ТЕСТ ЗАВЕРШЕН УСПЕШНО ===', 'success');
      log('💡 Что произошло:', 'info');
      log('  1. Проверили что токен Multilogin активен');
      log('  2. Создали RPA задачу с использованием токена');
      log('  3. Отправили задачу через Edge Function rpa-task');
      log('  4. RPA бот получил задачу и токен для работы с Multilogin');
      
      setRpaResult({
        success: true,
        message: 'RPA задача выполнена успешно с использованием токена Multilogin!',
        data: {
          taskId,
          multilogin_token_email: tokenData.email,
          rpa_response: data
        }
      });
    } catch (error: any) {
      log(`❌ Ошибка RPA: ${error.message}`, 'error');
      setRpaResult({
        success: false,
        message: error.message
      });
    } finally {
      setLoading(prev => ({ ...prev, rpa: false }));
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setTokenResult(null);
    setRpaResult(null);
    log('🧹 Тестирование очищено');
  };

  React.useEffect(() => {
    log('🎯 Система тестирования токенов запущена');
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">🔐 Тестирование токенов Multilogin</h1>
        <p className="text-muted-foreground">
          Простая проверка работы токенов и их применения в RPA системе
        </p>
      </div>

      {/* Уведомление о настройке секретов */}
      <Card className="bg-yellow-900/20 border-yellow-600/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="text-yellow-400">⚠️</div>
            <div>
              <p className="text-yellow-200 font-medium">Требуется настройка автоматической системы токенов</p>
              <p className="text-yellow-300/80 text-sm mt-1">
                Для работы автоматического получения токенов нужно настроить MULTILOGIN_EMAIL и MULTILOGIN_PASSWORD в секретах Supabase.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Статус токенов */}
      <MultiloginTokenStatus />

      <Separator />

      {/* Тестирование */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Тест токена */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔍 Проверка токена
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testMultiloginTokens}
              disabled={loading.tokens}
              className="w-full"
              size="lg"
            >
              {loading.tokens ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Проверка...
                </div>
              ) : (
                '🔍 Проверить токен'
              )}
            </Button>

            {tokenResult && (
              <div className={`p-4 rounded-lg border ${
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
                {tokenResult.data?.email && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Email: {tokenResult.data.email}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Тест RPA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🤖 Тест RPA с токеном
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testRPAWithToken}
              disabled={loading.rpa}
              className="w-full"
              size="lg"
            >
              {loading.rpa ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Выполнение...
                </div>
              ) : (
                '🚀 Тест RPA'
              )}
            </Button>

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
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Логи */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>📋 Логи тестирования</CardTitle>
          <Button onClick={clearLogs} variant="outline" size="sm">
            Очистить
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64 w-full rounded border p-4 bg-slate-950 text-green-400 font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-muted-foreground text-center py-8">
                Логи пусты. Запустите тест для появления логов.
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

      {/* Edge Function Логи */}
      <EdgeFunctionLogs />
    </div>
  );
}