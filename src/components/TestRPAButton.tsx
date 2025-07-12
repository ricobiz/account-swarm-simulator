import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRPAService } from '@/hooks/useRPAService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PlayCircle, Loader2, Heart, TestTube, Settings } from 'lucide-react';
import type { RPATask } from '@/types/rpa';

export const TestRPAButton: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testLog, setTestLog] = useState<string[]>([]);
  const { submitRPATask, waitForRPACompletion } = useRPAService();
  const { toast } = useToast();

  const addLog = (message: string) => {
    console.log(`[RPA TEST] ${message}`);
    setTestLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runTelegramLikeTest = async () => {
    setIsRunning(true);
    setTestLog([]);
    
    try {
      addLog('🚀 Начинаем тест лайка в Telegram');
      
      // Создаем задачу для лайка поста в Telegram
      const testTask: RPATask = {
        taskId: `telegram_like_${Date.now()}`,
        url: 'https://t.me/attheheight/530',
        actions: [
          {
            type: 'navigate',
            url: 'https://t.me/attheheight/530'
          },
          {
            type: 'wait',
            duration: 4000
          },
          {
            type: 'telegram_like',
            emoji: '👍',
            selector: '//button[.//*[contains(text(), "👍")]]'
          },
          {
            type: 'wait',
            duration: 2000
          },
          {
            type: 'check_element',
            selector: '.ReactionButton--chosen',
            description: 'Проверка активного лайка'
          }
        ],
        accountId: 'telegram-test-account',
        scenarioId: 'telegram-like-scenario',
        blockId: 'telegram-like-block',
        timeout: 45000,
        metadata: {
          platform: 'telegram',
          action: 'like',
          emoji: '👍',
          postUrl: 'https://t.me/attheheight/530'
        }
      };

      addLog(`📝 Создана задача лайка Telegram: ${testTask.taskId}`);
      addLog(`🎯 Целевой пост: https://t.me/attheheight/530`);
      addLog(`❤️ Реакция: 👍`);

      toast({
        title: "🚀 Запуск теста лайка Telegram",
        description: "Отправляем задачу RPA-боту для лайка поста..."
      });

      addLog('📤 Отправляем задачу RPA-боту...');

      // Отправляем задачу
      const submitResult = await submitRPATask(testTask);
      
      addLog(`📊 Результат отправки: ${JSON.stringify(submitResult)}`);
      
      if (!submitResult.success) {
        throw new Error(submitResult.error || 'Ошибка отправки задачи лайка');
      }

      addLog('✅ Задача успешно отправлена, ждем выполнения лайка...');

      toast({
        title: "📤 Задача отправлена",
        description: "RPA-бот ставит лайк в Telegram..."
      });

      // Ждем результат с подробным логированием
      addLog('⏳ Начинаем ожидание результата лайка (таймаут 45 секунд)...');
      const result = await waitForRPACompletion(testTask.taskId, 45000);

      addLog(`📋 Получен результат: ${JSON.stringify(result)}`);

      if (result?.success) {
        addLog('🎉 Тест лайка завершен успешно!');
        toast({
          title: "🎉 Лайк поставлен успешно!",
          description: "RPA-бот успешно поставил лайк в Telegram",
        });
      } else {
        addLog(`❌ Тест лайка завершился с ошибкой: ${result?.error || 'Неизвестная ошибка'}`);
        toast({
          title: "❌ Ошибка постановки лайка",
          description: result?.error || 'Не удалось поставить лайк в Telegram',
          variant: "destructive"
        });
      }

    } catch (error: any) {
      addLog(`💥 Критическая ошибка лайка: ${error.message}`);
      console.error('Полная ошибка теста лайка Telegram:', error);
      
      toast({
        title: "Ошибка теста лайка",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runBasicTest = async () => {
    setIsRunning(true);
    setTestLog([]);
    
    try {
      addLog('🚀 Начинаем базовый тест RPA системы');
      
      // Сначала проверяем статус Railway бота
      addLog('📡 Проверяем статус Railway бота...');
      try {
        const { data: statusData, error: statusError } = await supabase.functions.invoke('rpa-bot-status');
        addLog(`📊 Статус Railway: ${JSON.stringify(statusData)}`);
        if (statusError) {
          addLog(`❌ Ошибка проверки Railway: ${JSON.stringify(statusError)}`);
        }
      } catch (error: any) {
        addLog(`💥 Критическая ошибка проверки Railway: ${error.message}`);
      }
      
      // Проверяем автоматические токены
      addLog('🔑 Проверяем автоматические токены...');
      try {
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('multilogin-token-manager');
        addLog(`🎫 Статус токенов: ${JSON.stringify(tokenData)}`);
        if (tokenError) {
          addLog(`❌ Ошибка проверки токенов: ${JSON.stringify(tokenError)}`);
        }
      } catch (error: any) {
        addLog(`💥 Критическая ошибка проверки токенов: ${error.message}`);
      }
      
      // Создаем простую тестовую задачу
      const testTask: RPATask = {
        taskId: `test_${Date.now()}`,
        url: 'https://httpbin.org/get',
        actions: [
          {
            type: 'navigate',
            url: 'https://httpbin.org/get'
          },
          {
            type: 'wait',
            duration: 2000
          },
          {
            type: 'scroll',
            x: 0,
            y: 100
          },
          {
            type: 'wait',
            duration: 1000
          }
        ],
        accountId: 'test-account',
        scenarioId: 'test-scenario',
        blockId: 'test-block',
        timeout: 30000
      };

      addLog(`Создана тестовая задача: ${testTask.taskId}`);

      toast({
        title: "Запуск тестовой RPA задачи",
        description: "Отправляем задачу RPA-боту..."
      });

      addLog('📤 Отправляем задачу RPA-боту...');

      // Отправляем задачу
      const submitResult = await submitRPATask(testTask);
      
      addLog(`📥 Результат отправки: ${JSON.stringify(submitResult)}`);
      
      if (!submitResult.success) {
        throw new Error(submitResult.error || 'Ошибка отправки задачи');
      }

      addLog('✅ Задача успешно отправлена, ждем выполнения...');

      toast({
        title: "📤 Задача отправлена",
        description: "Ожидаем выполнения RPA-ботом..."
      });

      // Ждем результат с подробным логированием
      addLog('⏳ Начинаем ожидание результата (таймаут 30 секунд)...');
      const result = await waitForRPACompletion(testTask.taskId, 30000);

      addLog(`📋 Получен результат: ${JSON.stringify(result)}`);

      if (result?.success) {
        addLog('🎉 Тест завершен успешно!');
        toast({
          title: "🎉 RPA тест прошел успешно!",
          description: result.message || 'Задача выполнена. Проверьте логи для подробностей.'
        });
      } else {
        addLog(`❌ Тест завершился с ошибкой: ${result?.error || 'Неизвестная ошибка'}`);
        toast({
          title: "❌ RPA тест завершился с ошибкой",
          description: result?.error || 'Неизвестная ошибка',
          variant: "destructive"
        });
      }

    } catch (error: any) {
      addLog(`💥 Критическая ошибка: ${error.message}`);
      console.error('💥 Полная ошибка теста RPA:', error);
      
      toast({
        title: "💥 Ошибка выполнения теста",
        description: `${error.message}. Проверьте логи выше для диагностики.`,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="bg-gradient-to-r from-purple-800/50 to-blue-800/50 border-purple-500/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <PlayCircle className="h-5 w-5" />
          Тест RPA системы
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-300 text-sm">
          Тестирование RPA-бота с реальными задачами
        </p>
        
        <div className="space-y-3">
          <Button
            onClick={runTelegramLikeTest}
            disabled={isRunning}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Ставим лайк...
              </>
            ) : (
              <>
                <Heart className="h-4 w-4 mr-2" />
                Тест лайка в Telegram
              </>
            )}
          </Button>

          <Button
            onClick={async () => {
              setIsRunning(true);
              setTestLog([]);
              addLog('🔍 Запускаем прямую проверку RPA бота...');
              
              try {
                const { data, error } = await supabase.functions.invoke('test-rpa-direct');
                
                if (error) {
                  addLog(`❌ Ошибка вызова функции: ${error.message}`);
                  toast({
                    title: "Ошибка",
                    description: `Не удалось вызвать функцию: ${error.message}`,
                    variant: "destructive",
                  });
                  return;
                }
                
                addLog('📊 Результат прямой проверки:');
                addLog(`🌐 RPA Endpoint: ${data.rpa_endpoint}`);
                addLog(`💚 Health Check: ${data.health_check?.status || 'ERROR'}`);
                addLog(`🧪 RPA Test Success: ${data.rpa_test?.success || false}`);
                addLog(`🔗 Multilogin Connected: ${data.multilogin_status?.connected || false}`);
                
                if (data.rpa_test?.screenshot) {
                  addLog('📸 Скриншот получен!');
                } else {
                  addLog('❌ Скриншот не получен');
                }
                
                if (data.rpa_test?.error) {
                  addLog(`❌ RPA Error: ${data.rpa_test.error}`);
                }
                
                toast({
                  title: data.success ? "Проверка завершена" : "Ошибка проверки",
                  description: data.success ? "Проверка RPA бота выполнена" : "Произошла ошибка при проверке",
                  variant: data.success ? "default" : "destructive",
                });
                
              } catch (error: any) {
                addLog(`❌ Критическая ошибка: ${error.message}`);
                toast({
                  title: "Критическая ошибка",
                  description: `${error.message}`,
                  variant: "destructive",
                });
              } finally {
                setIsRunning(false);
              }
            }}
            disabled={isRunning}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Проверяем...
              </>
            ) : (
              <>
                <Settings className="h-4 w-4 mr-2" />
                Прямая проверка RPA бота
              </>
            )}
          </Button>

          <Button
            onClick={runBasicTest}
            disabled={isRunning}
            variant="outline"
            className="w-full border-purple-500 text-purple-300 hover:bg-purple-800"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Выполняется...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4 mr-2" />
                Базовый тест RPA
              </>
            )}
          </Button>
        </div>
        
        <div className="text-xs text-gray-400">
          <p className="font-semibold mb-2">🎯 Тест лайка Telegram:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>Переход на пост t.me/attheheight/530</li>
            <li>Поиск кнопки реакции 👍</li>
            <li>Клик по лайку</li>
            <li>Подтверждение постановки лайка</li>
          </ul>
          
          <p className="font-semibold mb-2 mt-3">⚡ Базовый тест:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>Переход на httpbin.org/get</li>
            <li>Базовые действия браузера</li>
            <li>Проверка работоспособности</li>
          </ul>
        </div>

        {/* Лог выполнения теста */}
        {testLog.length > 0 && (
          <div className="mt-4 p-3 bg-gray-900 rounded-lg">
            <p className="text-xs text-gray-400 mb-2">📋 Лог выполнения:</p>
            <div className="text-xs text-gray-300 space-y-1 max-h-40 overflow-y-auto">
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
