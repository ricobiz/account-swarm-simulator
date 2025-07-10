import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRPAService } from '@/hooks/useRPAService';
import { useToast } from '@/hooks/use-toast';
import { PlayCircle, Loader2, Lock, User, Globe } from 'lucide-react';
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

  const addLog = (message: string) => {
    console.log(`[MULTILOGIN TEST] ${message}`);
    setTestLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runMultiloginTest = async () => {
    if (!accountData.username || !accountData.password) {
      toast({
        title: "❌ Ошибка",
        description: "Введите username и пароль для тестирования",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setTestLog([]);
    
    try {
      addLog('🚀 Начинаем тест Multilogin с входом в аккаунт');
      addLog(`👤 Аккаунт: ${accountData.username}`);
      addLog(`📱 Платформа: ${accountData.platform}`);
      
      // Создаем задачу для тестирования Multilogin
      const testTask: RPATask = {
        taskId: `multilogin_test_${Date.now()}`,
        url: accountData.platform === 'telegram' ? 'https://web.telegram.org' : 'https://instagram.com',
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
      addLog(`🎯 Тестируем вход на ${accountData.platform}`);

      toast({
        title: "🚀 Запуск теста Multilogin",
        description: `Тестируем вход в ${accountData.platform} через Multilogin...`
      });

      addLog('📤 Отправляем задачу RPA-боту с Multilogin...');

      // Отправляем задачу
      const submitResult = await submitRPATask(testTask);
      
      addLog(`📊 Результат отправки: ${JSON.stringify(submitResult)}`);
      
      if (!submitResult.success) {
        throw new Error(submitResult.error || 'Ошибка отправки задачи Multilogin');
      }

      addLog('✅ Задача отправлена, Multilogin создает профиль и входит в аккаунт...');

      toast({
        title: "📤 Задача отправлена", 
        description: "Multilogin создает профиль и выполняет вход..."
      });

      // Ждем результат с увеличенным таймаутом
      addLog('⏳ Ожидание результата теста Multilogin (таймаут 2 минуты)...');
      const result = await waitForRPACompletion(testTask.taskId, 120000);

      addLog(`📋 Получен результат: ${JSON.stringify(result)}`);

      if (result?.success) {
        addLog('🎉 Тест Multilogin завершен успешно!');
        addLog('✅ Профиль создан, вход выполнен');
        toast({
          title: "🎉 Multilogin тест успешен!",
          description: "Профиль создан и вход в аккаунт выполнен",
        });
      } else {
        addLog(`❌ Тест Multilogin завершился с ошибкой: ${result?.error || 'Неизвестная ошибка'}`);
        toast({
          title: "❌ Ошибка теста Multilogin",
          description: result?.error || 'Не удалось выполнить вход через Multilogin',
          variant: "destructive"
        });
      }

    } catch (error: any) {
      addLog(`💥 Критическая ошибка Multilogin: ${error.message}`);
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
          Тест Multilogin (Вход в аккаунт)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-300 text-sm">
          Реальный тест с входом в аккаунт через Multilogin
        </p>
        
        {/* Форма для ввода данных аккаунта */}
        <div className="grid grid-cols-1 gap-4 p-4 bg-gray-900/50 rounded-lg">
          <div>
            <Label htmlFor="platform" className="text-gray-300">Платформа</Label>
            <select
              id="platform"
              className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white"
              value={accountData.platform}
              onChange={(e) => setAccountData(prev => ({ ...prev, platform: e.target.value }))}
            >
              <option value="telegram">Telegram</option>
              <option value="instagram">Instagram</option>
            </select>
          </div>
          
          <div>
            <Label htmlFor="username" className="text-gray-300">
              {accountData.platform === 'telegram' ? 'Номер телефона' : 'Username'}
            </Label>
            <Input
              id="username"
              type="text"
              placeholder={accountData.platform === 'telegram' ? '+7900...' : 'username'}
              value={accountData.username}
              onChange={(e) => setAccountData(prev => ({ ...prev, username: e.target.value }))}
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-gray-300">Пароль</Label>
            <Input
              id="password"
              type="password"
              placeholder="Пароль от аккаунта"
              value={accountData.password}
              onChange={(e) => setAccountData(prev => ({ ...prev, password: e.target.value }))}
              className="bg-gray-800 border-gray-600 text-white"
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
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>
        </div>
        
        <Button
          onClick={runMultiloginTest}
          disabled={isRunning || !accountData.username || !accountData.password}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Multilogin тестируется...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Тест входа через Multilogin
            </>
          )}
        </Button>
        
        <div className="text-xs text-gray-400">
          <p className="font-semibold mb-2">🔐 Что тестируется:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>Создание Multilogin профиля для аккаунта</li>
            <li>Запуск браузера через Multilogin API</li>
            <li>Переход на страницу входа</li>
            <li>Ввод данных аккаунта</li>
            <li>Попытка входа в аккаунт</li>
            <li>Создание скриншотов процесса</li>
          </ul>
          
          <p className="font-semibold mb-2 mt-3 text-yellow-400">⚠️ Важно:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>Используйте тестовые аккаунты</li>
            <li>Данные передаются в Multilogin API</li>
            <li>Процесс займет 1-2 минуты</li>
          </ul>
        </div>

        {/* Лог выполнения теста */}
        {testLog.length > 0 && (
          <div className="mt-4 p-3 bg-gray-900 rounded-lg">
            <p className="text-xs text-gray-400 mb-2">📋 Лог выполнения Multilogin:</p>
            <div className="text-xs text-gray-300 space-y-1 max-h-48 overflow-y-auto">
              {testLog.map((log, index) => (
                <div key={index} className="font-mono">{log}</div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};