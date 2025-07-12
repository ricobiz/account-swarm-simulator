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

  const getMultiloginInfo = (taskData: any) => {
    if (!taskData) return null;
    return {
      use_multilogin: taskData.use_multilogin || false,
      email: taskData.metadata?.multilogin_token_info?.email || 'N/A',
      expires_at: taskData.metadata?.multilogin_token_info?.expires_at || 'N/A'
    };
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-400" />
              Монитор RPA задач
            </div>
            <Button
              onClick={fetchTasks}
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-gray-600 text-white hover:bg-gray-700"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
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
                      className="bg-gray-900 rounded-lg p-4 border border-gray-700 cursor-pointer hover:border-gray-600"
                      onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(task.status)}
                          <span className="text-white font-mono text-sm">
                            {task.task_id || 'Неизвестная задача'}
                          </span>
                          <Badge className={getStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                          {multiloginInfo?.use_multilogin && (
                            <Badge variant="outline" className="border-purple-500 text-purple-300">
                              Multilogin
                            </Badge>
                          )}
                        </div>
                        <span className="text-gray-400 text-xs">
                          {new Date(task.created_at).toLocaleString()}
                        </span>
                      </div>
                      
                      {selectedTask?.id === task.id && (
                        <div className="mt-4 space-y-3 border-t border-gray-700 pt-3">
                          <div>
                            <h4 className="text-white font-medium mb-2">Действия задачи:</h4>
                            <pre className="text-xs text-gray-300 bg-gray-800 p-2 rounded whitespace-pre-wrap">
                              {formatTaskActions(task.task_data)}
                            </pre>
                          </div>
                          
                          {multiloginInfo && (
                            <div>
                              <h4 className="text-white font-medium mb-2">Multilogin интеграция:</h4>
                              <div className="text-xs text-gray-300 space-y-1">
                                <div>Использован: {multiloginInfo.use_multilogin ? '✅ Да' : '❌ Нет'}</div>
                                <div>Email: {multiloginInfo.email}</div>
                                <div>Истекает: {new Date(multiloginInfo.expires_at).toLocaleString()}</div>
                              </div>
                            </div>
                          )}
                          
                          {task.result_data && (
                            <div>
                              <h4 className="text-white font-medium mb-2">Результат:</h4>
                              <pre className="text-xs text-gray-300 bg-gray-800 p-2 rounded whitespace-pre-wrap max-h-40 overflow-y-auto">
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
    </div>
  );
};