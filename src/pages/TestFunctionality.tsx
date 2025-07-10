import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { MultiloginTokenStatus } from '@/components/MultiloginTokenStatus';

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
      log('🤖 Тестирование RPA с токеном Multilogin...');
      
      // Сначала проверяем что токен есть
      const { data: tokenData } = await supabase
        .from('multilogin_tokens')
        .select('token, expires_at')
        .eq('is_active', true)
        .maybeSingle();

      if (!tokenData || new Date() > new Date(tokenData.expires_at)) {
        throw new Error('Токен недоступен или истек. Сначала получите/обновите токен.');
      }

      log('✅ Токен найден, запускаем RPA задачу...');
      
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

      log(`✅ RPA задача выполнена с токеном!`, 'success');
      setRpaResult({
        success: true,
        message: 'RPA задача выполнена успешно с использованием токена Multilogin!',
        data: data
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
    </div>
  );
}