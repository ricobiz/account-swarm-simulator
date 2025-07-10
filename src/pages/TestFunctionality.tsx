import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { MultiloginAuthTester } from '@/components/MultiloginAuthTester';
import { MultiloginProfileManager } from '@/components/MultiloginProfileManager';

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
}

export default function TestFunctionality() {
  const [multiloginResult, setMultiloginResult] = useState<TestResult | null>(null);
  const [profileResult, setProfileResult] = useState<TestResult | null>(null);
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
    setLoading(prev => ({ ...prev, multilogin: true }));
    try {
      log('🚀 Получение токенов Multilogin...');
      
      const { data, error } = await supabase.functions.invoke('multilogin-token-manager', {
        body: {}
      });

      if (error) {
        throw new Error(error.message);
      }

      log(`✅ Токены получены: ${JSON.stringify(data, null, 2)}`, 'success');
      setMultiloginResult({
        success: true,
        message: 'Токены получены успешно!',
        data: data
      });
    } catch (error: any) {
      log(`❌ Ошибка получения токенов: ${error.message}`, 'error');
      setMultiloginResult({
        success: false,
        message: error.message
      });
    } finally {
      setLoading(prev => ({ ...prev, multilogin: false }));
    }
  };

  const testMultiloginProfile = async () => {
    setLoading(prev => ({ ...prev, profile: true }));
    try {
      log('🚀 Создание Multilogin профиля...');
      
      const { data, error } = await supabase.functions.invoke('multilogin-api', {
        body: {
          platform: 'instagram',
          username: `test_user_${Date.now()}`,
          password: 'test_password'
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      log(`✅ Профиль создан: ${JSON.stringify(data, null, 2)}`, 'success');
      setProfileResult({
        success: true,
        message: 'Профиль создан успешно!',
        data: data
      });
    } catch (error: any) {
      log(`❌ Ошибка создания профиля: ${error.message}`, 'error');
      setProfileResult({
        success: false,
        message: error.message
      });
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
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

  const testSimpleMultilogin = async () => {
    setLoading(prev => ({ ...prev, simple: true }));
    try {
      log('🧪 Тестирование упрощенной Multilogin функции...');
      
      const { data, error } = await supabase.functions.invoke('multilogin-simple', {
        body: {}
      });

      if (error) {
        throw new Error(error.message);
      }

      log(`✅ Упрощенный тест завершен: ${JSON.stringify(data, null, 2)}`, 'success');
      setMultiloginResult({
        success: data.success,
        message: data.success ? 'Упрощенная функция работает!' : data.error,
        data: data
      });
    } catch (error: any) {
      log(`❌ Ошибка упрощенной функции: ${error.message}`, 'error');
      setMultiloginResult({
        success: false,
        message: error.message
      });
    } finally {
      setLoading(prev => ({ ...prev, simple: false }));
    }
  };

  React.useEffect(() => {
    log('🎯 Система тестирования запущена');
    log('📋 Готова к тестированию реальной функциональности');
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">🧪 Тест реальной функциональности RPA</h1>
        <p className="text-muted-foreground">Проверка интеграции с Multilogin API и Railway RPA Bot</p>
      </div>

      {/* Основное тестирование Multilogin API */}
      <MultiloginAuthTester />

      {/* Управление профилями Multilogin */}
      <MultiloginProfileManager />

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {/* Тест создания профиля */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              👤 Multilogin профиль
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testMultiloginProfile}
              disabled={loading.profile}
              className="w-full"
            >
              {loading.profile ? 'Создание...' : 'Создать профиль'}
            </Button>
            {profileResult && (
              <div className={`p-3 rounded ${profileResult.success ? 'bg-green-50 text-green-800 dark:bg-green-950/20 dark:text-green-200' : 'bg-red-50 text-red-800 dark:bg-red-950/20 dark:text-red-200'}`}>
                <Badge variant={profileResult.success ? 'default' : 'destructive'} className="mb-2">
                  {profileResult.success ? '✅ Успешно' : '❌ Ошибка'}
                </Badge>
                <p className="text-sm">{profileResult.message}</p>
                {profileResult.data?.profile_id && (
                  <p className="text-xs mt-1">ID: {profileResult.data.profile_id}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Тест RPA задачи */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              🤖 RPA задача
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testRPATask}
              disabled={loading.rpa}
              className="w-full"
            >
              {loading.rpa ? 'Выполнение...' : 'Выполнить задачу'}
            </Button>
            {rpaResult && (
              <div className={`p-3 rounded ${rpaResult.success ? 'bg-green-50 text-green-800 dark:bg-green-950/20 dark:text-green-200' : 'bg-red-50 text-red-800 dark:bg-red-950/20 dark:text-red-200'}`}>
                <Badge variant={rpaResult.success ? 'default' : 'destructive'} className="mb-2">
                  {rpaResult.success ? '✅ Успешно' : '❌ Ошибка'}
                </Badge>
                <p className="text-sm">{rpaResult.message}</p>
                {rpaResult.data?.taskId && (
                  <p className="text-xs mt-1">Task ID: {rpaResult.data.taskId}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Логи */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Логи выполнения</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64 w-full rounded border p-4 bg-slate-950 text-green-400 font-mono text-sm">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}