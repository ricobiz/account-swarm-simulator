import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Eye, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface RPATask {
  id: string;
  task_id: string;
  task_data: any;
  result_data: any;
  status: string;
  created_at: string;
  updated_at: string;
}

export const RPATaskMonitor: React.FC = () => {
  const [tasks, setTasks] = useState<RPATask[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<RPATask | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rpa_tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Ошибка загрузки задач:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // Автообновление каждые 10 секунд
    const interval = setInterval(fetchTasks, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-400" />;
      case 'running': return <Clock className="h-4 w-4 text-blue-400 animate-spin" />;
      default: return <AlertCircle className="h-4 w-4 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'running': return 'bg-blue-500';
      default: return 'bg-yellow-500';
    }
  };

  const formatTaskActions = (taskData: any) => {
    if (!taskData?.actions) return 'Нет действий';
    return taskData.actions.map((action: any, index: number) => 
      `${index + 1}. ${action.type}${action.description ? ` - ${action.description}` : ''}`
    ).join('\n');
  };

  const getTaskDisplayName = (task: RPATask) => {
    const taskData = task.task_data;
    
    // Если есть url, определяем по нему
    if (taskData?.url) {
      if (taskData.url.includes('google.com')) {
        return 'Тест: получение скриншота Google';
      }
      if (taskData.url.includes('httpbin.org')) {
        return 'Тест: проверка соединения';
      }
      // Для других URL показываем домен
      try {
        const domain = new URL(taskData.url).hostname;
        return `Автоматизация: ${domain}`;
      } catch {
        return 'Автоматизация: неизвестный сайт';
      }
    }
    
    // Если есть действия, определяем по типу
    if (taskData?.actions?.length > 0) {
      const hasScreenshot = taskData.actions.some((action: any) => action.type === 'screenshot');
      const hasNavigation = taskData.actions.some((action: any) => action.type === 'navigate');
      
      if (hasScreenshot && hasNavigation) {
        return 'Задача: навигация и скриншот';
      } else if (hasScreenshot) {
        return 'Задача: получение скриншота';
      } else if (hasNavigation) {
        return 'Задача: навигация по сайту';
      }
    }
    
    // Если есть platform из metadata
    if (taskData?.metadata?.platform) {
      return `Автоматизация: ${taskData.metadata.platform}`;
    }
    
    // Fallback к task_id если ничего не подошло
    return task.task_id || 'Неизвестная задача';
  };

  const clearAllTasks = async () => {
    try {
      // Удаляем все задачи текущего пользователя
      const { error } = await supabase
        .from('rpa_tasks')
        .delete()
        .not('id', 'is', null); // удаляем все существующие записи
      
      if (error) throw error;
      setTasks([]); // очищаем локальный state
      console.log('✅ Все задачи очищены');
    } catch (error) {
      console.error('❌ Ошибка очистки задач:', error);
    }
  };

  const getMultiloginInfo = (taskData: any) => {
    if (!taskData) return null;
    return {
      use_multilogin: taskData.use_multilogin || false,
      email: taskData.metadata?.multilogin_token_info?.email || 'N/A',
      expires_at: taskData.metadata?.multilogin_token_info?.expires_at || 'N/A'
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Монитор RPA задач
          </div>
          <div className="flex gap-2">
            <Button
              onClick={clearAllTasks}
              variant="destructive"
              size="sm"
            >
              🗑️ Очистить всё
            </Button>
            <Button
              onClick={fetchTasks}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Задачи не найдены</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const multiloginInfo = getMultiloginInfo(task.task_data);
                return (
                  <div
                    key={task.id}
                    className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <span className="font-medium text-sm">
                          {getTaskDisplayName(task)}
                        </span>
                        <Badge className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                        {multiloginInfo?.use_multilogin && (
                          <Badge variant="outline">
                            Multilogin
                          </Badge>
                        )}
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {new Date(task.created_at).toLocaleString()}
                      </span>
                    </div>
                    
                    {selectedTask?.id === task.id && (
                      <div className="mt-4 space-y-3 border-t pt-3">
                        <div>
                          <h4 className="font-medium mb-2">Действия задачи:</h4>
                          <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap">
                            {formatTaskActions(task.task_data)}
                          </pre>
                        </div>
                        
                        {multiloginInfo && (
                          <div>
                            <h4 className="font-medium mb-2">Multilogin интеграция:</h4>
                             <div className="text-xs space-y-1">
                               <div>Использован: {multiloginInfo.use_multilogin ? '✅ Да' : '❌ Нет'}</div>
                               <div>Email: {multiloginInfo.email}</div>
                               <div>Истекает: {
                                 multiloginInfo.expires_at && multiloginInfo.expires_at !== 'N/A' 
                                   ? new Date(multiloginInfo.expires_at).toLocaleString() 
                                   : 'Нет данных'
                               }</div>
                             </div>
                          </div>
                        )}
                        
                        {/* Скриншот если есть */}
                        {task.result_data?.screenshot && (
                          <div>
                            <h4 className="font-medium mb-2">📸 Скриншот результата:</h4>
                            <div className="bg-muted p-2 rounded border">
                              <img 
                                src={task.result_data.screenshot} 
                                alt="RPA Task Screenshot"
                                className="max-w-full h-auto rounded border"
                                style={{ maxHeight: '300px' }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Отладка - показываем все поля result_data */}
                        {task.result_data && (
                          <div>
                            <h4 className="font-medium mb-2">🔍 Отладка result_data:</h4>
                            <div className="text-xs bg-muted p-2 rounded">
                              <div>• screenshot: {task.result_data.screenshot ? '✅ Есть' : '❌ Нет'}</div>
                              <div>• success: {task.result_data.success ? '✅ Да' : '❌ Нет'}</div>
                              <div>• message: {task.result_data.message || 'Нет'}</div>
                              <div>• data.screenshot_urls: {task.result_data.data?.screenshot_urls ? `${task.result_data.data.screenshot_urls.length} шт.` : 'Нет'}</div>
                              <div>• Все ключи: {Object.keys(task.result_data).join(', ')}</div>
                            </div>
                          </div>
                        )}

                        {task.result_data && (
                          <div>
                            <h4 className="font-medium mb-2">Результат:</h4>
                            <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap max-h-40 overflow-y-auto">
                              {JSON.stringify(task.result_data, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};