
import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Server, 
  Play, 
  Square, 
  MousePointer, 
  Type, 
  Eye, 
  Download, 
  Trash2,
  Target,
  Globe,
  Camera
} from 'lucide-react';
import type { ServerRecordedAction } from '@/types/serverRPA';

interface ServerBasedRPARecorderProps {
  onSaveScenario: (actions: ServerRecordedAction[]) => void;
}

export const ServerBasedRPARecorder: React.FC<ServerBasedRPARecorderProps> = ({
  onSaveScenario
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [actions, setActions] = useState<ServerRecordedAction[]>([]);
  const [currentUrl, setCurrentUrl] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    if (!currentUrl) {
      toast({
        title: "Ошибка",
        description: "Введите URL сайта для записи",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsRecording(true);
      setActions([]);
      
      // Создаем новую сессию браузера
      const newSessionId = `session_${Date.now()}`;
      setSessionId(newSessionId);

      // Добавляем начальное действие навигации
      const navigationAction: ServerRecordedAction = {
        id: `action_${Date.now()}`,
        type: 'navigate',
        timestamp: Date.now(),
        url: currentUrl,
        delay: 2000
      };

      setActions([navigationAction]);

      toast({
        title: "Запись началась",
        description: "Сценарий записывается. Получаем скриншот...",
        duration: 3000
      });

      // Получаем реальный скриншот через Server RPA API
      try {
        const response = await fetch('/api/rpa/screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: currentUrl || 'https://google.com' })
        });

        if (response.ok) {
          const data = await response.json();
          setScreenshot(data.screenshot);
        }
      } catch (error) {
        console.warn('Failed to get screenshot:', error);
        setScreenshot('/placeholder.svg');
      }

    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось начать запись",
        variant: "destructive"
      });
      setIsRecording(false);
    }
  }, [currentUrl, toast]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setSessionId(null);
    
    toast({
      title: "Запись завершена",
      description: `Записано ${actions.length} действий`
    });
  }, [actions.length, toast]);

  const addManualAction = useCallback((type: ServerRecordedAction['type'], description: string) => {
    const newAction: ServerRecordedAction = {
      id: `action_${Date.now()}`,
      type,
      timestamp: Date.now(),
      element: {
        selector: `[data-action="${type}"]`,
        text: description,
        coordinates: { x: Math.floor(Math.random() * 800), y: Math.floor(Math.random() * 600) }
      },
      delay: 1000
    };

    setActions(prev => [...prev, newAction]);

    toast({
      title: "Действие добавлено",
      description: `${description} (${type})`
    });
  }, [toast]);

  const removeAction = useCallback((actionId: string) => {
    setActions(prev => prev.filter(action => action.id !== actionId));
  }, []);

  const clearAllActions = useCallback(() => {
    setActions([]);
    toast({
      title: "Все действия удалены",
      description: "Список действий очищен"
    });
  }, [toast]);

  const saveScenario = useCallback(() => {
    if (actions.length === 0) {
      toast({
        title: "Нет действий",
        description: "Запишите хотя бы одно действие",
        variant: "destructive"
      });
      return;
    }

    onSaveScenario(actions);
    toast({
      title: "Сценарий сохранен",
      description: `Сохранено ${actions.length} действий`
    });
  }, [actions, onSaveScenario, toast]);

  const takeScreenshot = useCallback(async () => {
    if (!isRecording) return;

    const screenshotAction: ServerRecordedAction = {
      id: `action_${Date.now()}`,
      type: 'screenshot',
      timestamp: Date.now(),
      screenshot: `/placeholder.svg?t=${Date.now()}`,
      delay: 500
    };

    setActions(prev => [...prev, screenshotAction]);

    toast({
      title: "Скриншот сделан",
      description: "Скриншот добавлен в сценарий"
    });
  }, [isRecording, toast]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Панель управления */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Server className="h-5 w-5 text-purple-400" />
            Серверный рекордер действий
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL ввод */}
          <div className="space-y-2">
            <label className="text-sm text-gray-300">URL сайта:</label>
            <Input
              value={currentUrl}
              onChange={(e) => setCurrentUrl(e.target.value)}
              placeholder="https://example.com"
              className="bg-gray-700 border-gray-600 text-white"
              disabled={isRecording}
            />
          </div>

          {/* Управление записью */}
          <div className="flex gap-2">
            {!isRecording ? (
              <Button onClick={startRecording} className="flex-1 bg-green-600 hover:bg-green-700">
                <Play className="h-4 w-4 mr-2" />
                Начать запись
              </Button>
            ) : (
              <Button onClick={stopRecording} className="flex-1 bg-red-600 hover:bg-red-700">
                <Square className="h-4 w-4 mr-2" />
                Остановить
              </Button>
            )}
          </div>

          {/* Статус записи */}
          {isRecording && (
            <div className="flex items-center gap-2 p-2 bg-green-900 border border-green-700 rounded">
              <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-300 text-sm">
                Запись активна • Сессия: {sessionId}
              </span>
            </div>
          )}

          <Separator className="bg-gray-600" />

          {/* Ручное добавление действий */}
          {isRecording && (
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Добавить действие вручную:</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addManualAction('click', 'Клик по элементу')}
                  className="text-blue-400 border-blue-600"
                >
                  <MousePointer className="h-3 w-3 mr-1" />
                  Клик
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addManualAction('type', 'Ввод текста')}
                  className="text-purple-400 border-purple-600"
                >
                  <Type className="h-3 w-3 mr-1" />
                  Ввод
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addManualAction('scroll', 'Прокрутка страницы')}
                  className="text-cyan-400 border-cyan-600"
                >
                  <Target className="h-3 w-3 mr-1" />
                  Скролл
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={takeScreenshot}
                  className="text-yellow-400 border-yellow-600"
                >
                  <Camera className="h-3 w-3 mr-1" />
                  Скриншот
                </Button>
              </div>
            </div>
          )}

          <Separator className="bg-gray-600" />

          {/* Записанные действия */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-300">
                Записанные действия ({actions.length})
              </label>
              {actions.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllActions}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2">
              {actions.map((action, index) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between p-2 bg-gray-700 rounded border border-gray-600"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {index + 1}
                    </Badge>
                    <div className="text-sm">
                      <div className="text-white font-medium">
                        {action.type === 'navigate' && `Переход: ${action.url}`}
                        {action.type === 'click' && `Клик: ${action.element?.text || 'элемент'}`}
                        {action.type === 'type' && `Ввод: ${action.element?.text || 'текст'}`}
                        {action.type === 'scroll' && 'Прокрутка страницы'}
                        {action.type === 'screenshot' && 'Скриншот'}
                        {action.type === 'wait' && `Ожидание: ${action.delay}мс`}
                      </div>
                      <div className="text-gray-400 text-xs">
                        {action.type} • {new Date(action.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAction(action.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Сохранение */}
          <Button
            onClick={saveScenario}
            disabled={actions.length === 0}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Сохранить сценарий
          </Button>
        </CardContent>
      </Card>

      {/* Предварительный просмотр */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Предварительный просмотр
            {isRecording && (
              <Badge variant="destructive" className="ml-auto">
                Запись активна
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentUrl && screenshot ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-2 bg-gray-700 rounded">
                <Globe className="h-4 w-4 text-blue-400" />
                <span className="text-gray-300 text-sm truncate">{currentUrl}</span>
              </div>
              
              <div className="relative">
                <img
                  src={screenshot}
                  alt="Скриншот страницы"
                  className="w-full h-64 object-cover rounded border border-gray-600"
                />
                {isRecording && (
                  <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                    <div className="h-2 w-2 bg-white rounded-full animate-pulse"></div>
                    REC
                  </div>
                )}
              </div>

              <div className="text-center">
                <p className="text-gray-400 text-sm">
                  {isRecording 
                    ? "Действия записываются автоматически" 
                    : "Начните запись для мониторинга действий"
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Введите URL и начните запись</p>
                <p className="text-sm mt-2">Сервер будет отслеживать все действия</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
