import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useRPAService } from '@/hooks/useRPAService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PlayCircle, Loader2, Lock, Globe, CheckCircle, AlertCircle, Shield, RefreshCw, XCircle } from 'lucide-react';
import type { RPATask } from '@/types/rpa';

export const MultiloginTestButton: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testLog, setTestLog] = useState<string[]>([]);
  const [accountData, setAccountData] = useState({
    platform: 'telegram',
    username: '',
    password: '',
    email: ''
  });
  
  // Состояние для автоматических токенов
  const [tokenStatus, setTokenStatus] = useState<any>(null);
  const [isTestingTokens, setIsTestingTokens] = useState(false);
  
  const { submitRPATask, waitForRPACompletion } = useRPAService();
  const { toast } = useToast();

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : '📝';
    const logMessage = `${emoji} ${new Date().toLocaleTimeString()}: ${message}`;
    console.log(`[MULTILOGIN TEST] ${logMessage}`);
    setTestLog(prev => [...prev, logMessage]);
  };

  // Тестирование автоматической системы токенов
  const testTokenSystem = async () => {
    setIsTestingTokens(true);
    try {
      addLog('🔄 Тестируем автоматическую систему токенов Multilogin...', 'info');
      
      // Проверяем есть ли актуальный токен
      const { data: currentToken, error: getError } = await supabase.functions.invoke('multilogin-token-manager');
      
      if (currentToken?.success) {
        setTokenStatus({
          hasToken: true,
          token: currentToken.token.substring(0, 50) + '...',
          message: 'Актуальный токен найден в системе',
          source: 'cache'
        });
        addLog('✅ Найден актуальный токен в системе', 'success');
      } else {
        addLog('🔄 Актуального токена нет, получаем новый...', 'info');
        
        // Принудительно получаем новый токен
        const { data: newToken, error: refreshError } = await supabase.functions.invoke('multilogin-token-manager', {
          body: { action: 'refresh' }
        });
        
        if (newToken?.success) {
          setTokenStatus({
            hasToken: true,
            token: newToken.token.substring(0, 50) + '...',
            message: 'Новый токен успешно получен автоматически!',
            expiresIn: '25 минут',
            source: 'fresh'
          });
          addLog('✅ Новый токен успешно получен и сохранен в базе', 'success');
        } else {
          throw new Error(refreshError?.message || 'Ошибка получения автоматического токена');
        }
      }
      
      // Тестируем Multilogin API с полученным токеном
      addLog('🧪 Тестируем Multilogin API с полученным токеном...', 'info');
      const { data: apiTest, error: apiError } = await supabase.functions.invoke('multilogin-api', {
        body: { endpoint: '/health' }
      });
      
      if (apiTest?.success) {
        addLog('✅ Multilogin API успешно отвечает с автоматическим токеном', 'success');
        setTokenStatus(prev => ({ ...prev, apiConnected: true }));
      } else {
        addLog('⚠️ Multilogin API недоступен, но токен получен корректно', 'info');
        setTokenStatus(prev => ({ ...prev, apiConnected: false }));
      }
      
      toast({
        title: "✅ Система автоматических токенов работает!",
        description: "Multilogin токены получены и готовы к использованию",
      });
      
    } catch (error: any) {
      console.error('❌ Ошибка тестирования автоматических токенов:', error);
      setTokenStatus({
        hasToken: false,
        error: error.message
      });
      addLog(`❌ Ошибка системы токенов: ${error.message}`, 'error');
      
      toast({
        title: "❌ Ошибка системы автоматических токенов",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsTestingTokens(false);
    }
  };

  const runMultiloginTest = async () => {
    if (!accountData.username || !accountData.password) {
      toast({
        title: "❌ Ошибка валидации",
        description: "Введите username и пароль для тестирования",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setTestLog([]);
    
    try {
      addLog('🚀 Начинаем тест Multilogin с автоматическими токенами', 'info');
      addLog(`👤 Тестируемый аккаунт: ${accountData.username} (${accountData.platform})`, 'info');
      
      // Создаем специальную задачу для Multilogin с автоматическими токенами
      const testTask: RPATask = {
        taskId: `multilogin_auto_test_${Date.now()}`,
        url: accountData.platform === 'telegram' ? 'https://web.telegram.org/a/' : 'https://instagram.com/accounts/login/',
        actions: [
          {
            type: 'navigate',
            url: accountData.platform === 'telegram' ? 'https://web.telegram.org/a/' : 'https://instagram.com/accounts/login/'
          },
          {
            type: 'wait',
            duration: 5000
          },
          ...(accountData.platform === 'telegram' ? [
            {
              type: 'click' as const,
              selector: 'input[name="phone_number"], input#sign-in-phone-number, input[type="tel"]'
            },
            {
              type: 'key' as const,
              text: accountData.username
            }
          ] : [
            {
              type: 'click' as const,
              selector: 'input[name="username"], input[placeholder*="username"], input[aria-label*="username"]'
            },
            {
              type: 'key' as const,
              text: accountData.username
            },
            {
              type: 'click' as const,
              selector: 'input[name="password"], input[type="password"]'
            },
            {
              type: 'key' as const,
              text: accountData.password
            }
          ]),
          {
            type: 'wait',
            duration: 2000
          },
          {
            type: 'click',
            selector: accountData.platform === 'telegram' ? 
              'button[type="submit"], .btn-primary, button:contains("Next")' :
              'button[type="submit"], button:contains("Log In"), button[class*="login"]'
          },
          {
            type: 'wait',
            duration: 8000
          }
        ],
        accountId: `multilogin_auto_${accountData.platform}_${accountData.username}`,
        scenarioId: 'multilogin-auto-token-test',
        blockId: 'multilogin-auto-block',
        timeout: 120000, // 2 минуты
        metadata: {
          platform: accountData.platform,
          action: 'login_test_with_auto_tokens',
          multilogin: {
            enabled: true,
            useAutomaticTokens: true,
            createProfile: true,
            antiDetection: true
          },
          test_type: 'automatic_token_integration',
          account: {
            platform: accountData.platform,
            username: accountData.username,
            password: accountData.password,
            email: accountData.email
          }
        }
      };

      addLog(`📝 Создана задача с автоматическими токенами: ${testTask.taskId}`, 'info');
      addLog(`🎯 Платформа: ${accountData.platform.toUpperCase()}`, 'info');
      addLog('🔑 Используются автоматически обновляемые Multilogin токены', 'info');

      toast({
        title: "🚀 Запуск теста с автоматическими токенами",
        description: `Тестируем ${accountData.platform} через Multilogin с автообновлением токенов...`
      });

      addLog('📤 Отправляем задачу RPA-боту с автоматическими Multilogin токенами...', 'info');

      // Отправляем задачу
      const submitResult = await submitRPATask(testTask);
      
      addLog(`📊 Результат отправки: ${submitResult.success ? 'Успех' : 'Ошибка'}`, submitResult.success ? 'success' : 'error');
      
      if (!submitResult.success) {
        throw new Error(submitResult.error || 'Ошибка отправки задачи с автоматическими токенами');
      }

      addLog('✅ Задача отправлена, система создает Multilogin профиль с актуальными токенами...', 'success');

      toast({
        title: "📤 Задача отправлена", 
        description: "Multilogin использует автоматические токены для создания профиля..."
      });

      // Ждем результат с увеличенным таймаутом
      addLog('⏳ Ожидание результата теста с автоматическими токенами (таймаут 2 минуты)...', 'info');
      const result = await waitForRPACompletion(testTask.taskId, 120000);

      if (result?.success) {
        addLog('🎉 Тест с автоматическими токенами Multilogin завершен успешно!', 'success');
        addLog(`✅ Профиль создан: ${result.data?.multilogin_profile || 'profile_auto_created'}`, 'success');
        addLog(`🔑 Токены обновлены автоматически: ${result.data?.multilogin_integrated ? 'Да' : 'Нет'}`, 'success');
        addLog(`⚡ Время выполнения: ${result.executionTime || 'N/A'}ms`, 'info');
        
        if (result.data?.screenshot_urls) {
          addLog(`📸 Создано скриншотов: ${result.data.screenshot_urls.length}`, 'info');
        }
        
        if (result.data?.browser_fingerprint) {
          addLog(`🖱️ Применен браузерный отпечаток: ${result.data.browser_fingerprint.user_agent.substring(0, 50)}...`, 'info');
        }
        
        toast({
          title: "🎉 Тест с автоматическими токенами успешен!",
          description: "Профиль создан с автообновляемыми токенами Multilogin",
        });
      } else {
        addLog(`❌ Тест завершился с ошибкой: ${result?.error || 'Неизвестная ошибка'}`, 'error');
        addLog(`⚠️ Время выполнения: ${result?.executionTime || 'N/A'}ms`, 'info');
        
        toast({
          title: "❌ Ошибка теста с автоматическими токенами",
          description: result?.error || 'Не удалось выполнить тест через автоматические токены Multilogin',
          variant: "destructive"
        });
      }

    } catch (error: any) {
      addLog(`💥 Критическая ошибка: ${error.message}`, 'error');
      console.error('Полная ошибка теста Multilogin с автоматическими токенами:', error);
      
      toast({
        title: "Ошибка теста с автоматическими токенами",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Система автоматических токенов */}
      <Card className="bg-gradient-to-r from-purple-800/50 to-indigo-800/50 border-purple-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-white">
            <Shield className="h-5 w-5 text-purple-400" />
            Автоматическая система токенов Multilogin
            {tokenStatus?.hasToken && (
              <Badge variant="default" className="bg-green-600">Активна</Badge>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-gray-300 text-sm">
            Автоматическое получение и обновление токенов Multilogin каждые 25 минут
          </p>
          
          {tokenStatus && (
            <div className="bg-gray-900 p-4 rounded-lg border border-purple-500/20">
              <div className="flex items-start gap-3">
                {tokenStatus.hasToken ? (
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-sm text-gray-300 mb-2">{tokenStatus.message}</p>
                  {tokenStatus.token && (
                    <p className="text-xs text-gray-500 font-mono mb-1">Токен: {tokenStatus.token}</p>
                  )}
                  {tokenStatus.expiresIn && (
                    <p className="text-xs text-gray-500">Истекает через: {tokenStatus.expiresIn}</p>
                  )}
                  {tokenStatus.source && (
                    <Badge variant="outline" className="text-xs mt-2">
                      {tokenStatus.source === 'cache' ? 'Из кеша' : 'Свежий токен'}
                    </Badge>
                  )}
                  {tokenStatus.apiConnected !== undefined && (
                    <Badge variant={tokenStatus.apiConnected ? "default" : "destructive"} className="text-xs mt-2 ml-2">
                      API: {tokenStatus.apiConnected ? 'Подключен' : 'Недоступен'}
                    </Badge>
                  )}
                  {tokenStatus.error && (
                    <p className="text-xs text-red-400 mt-2">Ошибка: {tokenStatus.error}</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <Button 
            onClick={testTokenSystem}
            disabled={isTestingTokens}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isTestingTokens ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Тестирование автоматических токенов...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Тест автоматических токенов
              </>
            )}
          </Button>
          
          <div className="text-xs text-gray-400 bg-gray-900/30 p-3 rounded">
            <p className="font-semibold mb-2 text-purple-400">🔑 Что тестируется:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Автоматическое получение Multilogin токенов</li>
              <li>Сохранение токенов в базе данных</li>
              <li>Проверка валидности и времени жизни</li>
              <li>Тестирование Multilogin API подключения</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Основной Multilogin тест */}
      <Card className="bg-gradient-to-r from-green-800/50 to-teal-800/50 border-green-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Тест Multilogin с автоматическими токенами
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-300 text-sm">
            Полноценный тест с автоматическими токенами, созданием профиля и входом в аккаунт
          </p>
          
          {/* Форма для ввода данных аккаунта */}
          <div className="grid grid-cols-1 gap-4 p-4 bg-gray-900/50 rounded-lg border border-green-500/20">
            <div>
              <Label htmlFor="platform" className="text-gray-300 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Платформа
              </Label>
              <select
                id="platform"
                className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:border-green-500 transition-colors"
                value={accountData.platform}
                onChange={(e) => setAccountData(prev => ({ ...prev, platform: e.target.value }))}
              >
                <option value="telegram">Telegram Web</option>
                <option value="instagram">Instagram</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="username" className="text-gray-300 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {accountData.platform === 'telegram' ? 'Номер телефона' : 'Username'}
              </Label>
              <Input
                id="username"
                type="text"
                placeholder={accountData.platform === 'telegram' ? '+7900...' : 'username'}
                value={accountData.username}
                onChange={(e) => setAccountData(prev => ({ ...prev, username: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white focus:border-green-500"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-300 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Пароль
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Пароль от аккаунта"
                value={accountData.password}
                onChange={(e) => setAccountData(prev => ({ ...prev, password: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white focus:border-green-500"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-gray-300">Email (опционально)</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={accountData.email}
                onChange={(e) => setAccountData(prev => ({ ...prev, email: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white focus:border-green-500"
              />
            </div>
          </div>
          
          <Button
            onClick={runMultiloginTest}
            disabled={isRunning || !accountData.username || !accountData.password}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Multilogin с автотокенами выполняет тест...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 mr-2" />
                Запустить тест с автоматическими токенами
              </>
            )}
          </Button>
          
          <div className="text-xs text-gray-400 bg-gray-900/30 p-3 rounded">
            <p className="font-semibold mb-2 text-green-400">🔐 Что тестируется:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Использование автоматически обновляемых токенов</li>
              <li>Создание уникального Multilogin профиля</li>
              <li>Запуск антидетект браузера с актуальными токенами</li>
              <li>Переход на страницу входа платформы</li>
              <li>Автоматический ввод данных аккаунта</li>
              <li>Попытка входа в систему через Multilogin</li>
              <li>Создание скриншотов процесса</li>
            </ul>
            
            <p className="font-semibold mb-2 mt-3 text-yellow-400">⚠️ Преимущества автотокенов:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Токены обновляются автоматически каждые 25 минут</li>
              <li>Нет риска использования истекших токенов</li>
              <li>Система работает в фоновом режиме</li>
              <li>Токены сохраняются в защищенной базе данных</li>
            </ul>
          </div>

          {/* Лог выполнения теста */}
          {testLog.length > 0 && (
            <div className="mt-4 p-3 bg-gray-900 rounded-lg border border-green-500/20">
              <p className="text-xs text-gray-400 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                📋 Лог выполнения теста с автоматическими токенами:
              </p>
              <div className="text-xs text-gray-300 space-y-1 max-h-48 overflow-y-auto">
                {testLog.map((log, index) => (
                  <div 
                    key={index} 
                    className={`font-mono p-1 rounded ${
                      log.includes('✅') ? 'bg-green-900/20' : 
                      log.includes('❌') ? 'bg-red-900/20' : 
                      'bg-gray-800/30'
                    }`}
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};