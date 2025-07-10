import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRPAService } from '@/hooks/useRPAService';
import { useToast } from '@/hooks/use-toast';
import { PlayCircle, Loader2, Lock, Globe, CheckCircle, AlertCircle } from 'lucide-react';
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
  
  const { submitRPATask, waitForRPACompletion } = useRPAService();
  const { toast } = useToast();

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : '📝';
    const logMessage = `${emoji} ${new Date().toLocaleTimeString()}: ${message}`;
    console.log(`[MULTILOGIN TEST] ${logMessage}`);
    setTestLog(prev => [...prev, logMessage]);
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
      addLog('🚀 Начинаем тест Multilogin с входом в аккаунт');
      addLog(`👤 Тестируемый аккаунт: ${accountData.username} (${accountData.platform})`);
      
      // Создаем специальную задачу для Multilogin
      const testTask: RPATask = {
        taskId: `multilogin_test_${Date.now()}`,
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
        accountId: `multilogin_${accountData.platform}_${accountData.username}`,
        scenarioId: 'multilogin-login-test',
        blockId: 'multilogin-login-block',
        timeout: 120000, // 2 минуты
        metadata: {
          platform: accountData.platform,
          action: 'login_test',
          multilogin: true,
          test_type: 'account_verification',
          account: {
            platform: accountData.platform,
            username: accountData.username,
            password: accountData.password,
            email: accountData.email
          }
        }
      };

      addLog(`📝 Создана задача Multilogin: ${testTask.taskId}`);
      addLog(`🎯 Платформа: ${accountData.platform.toUpperCase()}`);

      toast({
        title: "🚀 Запуск теста Multilogin",
        description: `Тестируем вход в ${accountData.platform} через Multilogin...`
      });

      addLog('📤 Отправляем задачу RPA-боту с Multilogin...', 'info');

      // Отправляем задачу
      const submitResult = await submitRPATask(testTask);
      
      addLog(`📊 Результат отправки: ${submitResult.success ? 'Успех' : 'Ошибка'}`, submitResult.success ? 'success' : 'error');
      
      if (!submitResult.success) {
        throw new Error(submitResult.error || 'Ошибка отправки задачи Multilogin');
      }

      addLog('✅ Задача отправлена, создаем Multilogin профиль и выполняем вход...', 'success');

      toast({
        title: "📤 Задача отправлена", 
        description: "Multilogin создает профиль и выполняет тест..."
      });

      // Ждем результат с увеличенным таймаутом
      addLog('⏳ Ожидание результата теста (таймаут 2 минуты)...', 'info');
      const result = await waitForRPACompletion(testTask.taskId, 120000);

      if (result?.success) {
        addLog('🎉 Тест Multilogin завершен успешно!', 'success');
        addLog(`✅ Профиль создан: ${result.data?.multilogin_profile || 'profile_created'}`, 'success');
        addLog(`⚡ Время выполнения: ${result.executionTime || 'N/A'}ms`, 'info');
        
        if (result.data?.screenshot_urls) {
          addLog(`📸 Создано скриншотов: ${result.data.screenshot_urls.length}`, 'info');
        }
        
        toast({
          title: "🎉 Multilogin тест успешен!",
          description: "Профиль создан и тест выполнен успешно",
        });
      } else {
        addLog(`❌ Тест завершился с ошибкой: ${result?.error || 'Неизвестная ошибка'}`, 'error');
        addLog(`⚠️ Время выполнения: ${result?.executionTime || 'N/A'}ms`, 'info');
        
        toast({
          title: "❌ Ошибка теста Multilogin",
          description: result?.error || 'Не удалось выполнить тест через Multilogin',
          variant: "destructive"
        });
      }

    } catch (error: any) {
      addLog(`💥 Критическая ошибка: ${error.message}`, 'error');
      console.error('Полная ошибка теста Multilogin:', error);
      
      toast({
        title: "Ошибка теста Multilogin",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="bg-gradient-to-r from-green-800/50 to-teal-800/50 border-green-500/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Тест Multilogin (Реальный аккаунт)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-300 text-sm">
          Полноценный тест с созданием Multilogin профиля и входом в аккаунт
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
              Multilogin выполняет тест...
            </>
          ) : (
            <>
              <PlayCircle className="h-4 w-4 mr-2" />
              Запустить Multilogin тест
            </>
          )}
        </Button>
        
        <div className="text-xs text-gray-400 bg-gray-900/30 p-3 rounded">
          <p className="font-semibold mb-2 text-green-400">🔐 Что тестируется:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>Создание уникального Multilogin профиля</li>
            <li>Запуск антидетект браузера</li>
            <li>Переход на страницу входа платформы</li>
            <li>Автоматический ввод данных аккаунта</li>
            <li>Попытка входа в систему</li>
            <li>Создание скриншотов процесса</li>
          </ul>
          
          <p className="font-semibold mb-2 mt-3 text-yellow-400">⚠️ Важные моменты:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>Используйте только тестовые аккаунты</li>
            <li>Токен Multilogin действует ограниченное время</li>
            <li>Процесс может занять 1-2 минуты</li>
            <li>Все данные обрабатываются в облаке</li>
          </ul>
        </div>

        {/* Лог выполнения теста */}
        {testLog.length > 0 && (
          <div className="mt-4 p-3 bg-gray-900 rounded-lg border border-green-500/20">
            <p className="text-xs text-gray-400 mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              📋 Лог выполнения Multilogin теста:
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
  );
};