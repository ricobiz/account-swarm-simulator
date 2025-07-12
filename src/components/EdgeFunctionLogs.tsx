import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Terminal, AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EdgeFunctionLog {
  id: string;
  timestamp: string;
  event_message: string;
  metadata?: any;
  function_id?: string;
  level?: string;
  status_code?: number;
}

export const EdgeFunctionLogs: React.FC = () => {
  const [logs, setLogs] = useState<EdgeFunctionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState<string>('multilogin-token-manager');

  const edgeFunctions = [
    'multilogin-token-manager',
    'multilogin-api', 
    'multilogin-profiles',
    'multilogin-cron',
    'rpa-task',
    'rpa-bot-status',
    'test-multilogin-auth'
  ];

  const fetchEdgeFunctionLogs = async () => {
    setLoading(true);
    try {
      console.log(`🔍 Тестируем Edge Function: ${selectedFunction}`);
      
      // Тестируем функцию чтобы вызвать её и увидеть логи в консоли
      let testResponse;
      
      switch (selectedFunction) {
        case 'multilogin-token-manager':
          testResponse = await supabase.functions.invoke('multilogin-token-manager', {
            method: 'POST'
          });
          break;
        case 'multilogin-api':
          testResponse = await supabase.functions.invoke('multilogin-api', {
            body: { action: 'health' }
          });
          break;
        case 'rpa-task':
          testResponse = await supabase.functions.invoke('rpa-task', {
            body: { 
              task: {
                taskId: `test_${Date.now()}`,
                url: 'https://httpbin.org/get',
                actions: [{ type: 'test' }]
              }
            }
          });
          break;
        default:
          testResponse = await supabase.functions.invoke(selectedFunction);
      }

      console.log(`✅ Результат тестирования ${selectedFunction}:`, testResponse);
      
      // Создаем фейковые логи для демонстрации
      const mockLogs: EdgeFunctionLog[] = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          event_message: `🔄 ${selectedFunction}: Функция вызвана для тестирования`,
          level: 'info'
        },
        {
          id: '2', 
          timestamp: new Date(Date.now() - 1000).toISOString(),
          event_message: testResponse.error ? `❌ Ошибка: ${testResponse.error.message}` : `✅ Функция выполнена успешно`,
          level: testResponse.error ? 'error' : 'success',
          status_code: testResponse.error ? 500 : 200
        }
      ];
      
      setLogs(mockLogs);
      
    } catch (error: any) {
      console.error('❌ Ошибка в fetchEdgeFunctionLogs:', error);
      
      const errorLog: EdgeFunctionLog = {
        id: 'error',
        timestamp: new Date().toISOString(),
        event_message: `❌ Ошибка тестирования ${selectedFunction}: ${error.message}`,
        level: 'error',
        status_code: 500
      };
      
      setLogs([errorLog]);
    } finally {
      setLoading(false);
    }
  };

  const getLogIcon = (level: string, message: string) => {
    if (message.includes('❌') || level === 'error') return <XCircle className="h-4 w-4 text-red-400" />;
    if (message.includes('✅') || level === 'success') return <CheckCircle className="h-4 w-4 text-green-400" />;
    if (message.includes('⚠️') || level === 'warning') return <AlertCircle className="h-4 w-4 text-yellow-400" />;
    return <Info className="h-4 w-4 text-blue-400" />;
  };

  const getLogColor = (level: string, message: string) => {
    if (message.includes('❌') || level === 'error') return 'text-red-300';
    if (message.includes('✅') || level === 'success') return 'text-green-300';
    if (message.includes('⚠️') || level === 'warning') return 'text-yellow-300';
    return 'text-blue-300';
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString('ru-RU');
    } catch {
      return timestamp;
    }
  };

  React.useEffect(() => {
    if (selectedFunction) {
      fetchEdgeFunctionLogs();
    }
  }, [selectedFunction]);

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Terminal className="h-5 w-5 text-green-400" />
          Тестирование Edge Functions
          <Badge variant="outline" className="text-xs">Консольные логи в DevTools</Badge>
        </CardTitle>
        <div className="flex items-center gap-4">
          <Select value={selectedFunction} onValueChange={setSelectedFunction}>
            <SelectTrigger className="w-64 bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Выберите функцию" />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              {edgeFunctions.map((func) => (
                <SelectItem key={func} value={func} className="text-white hover:bg-gray-600">
                  {func}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            onClick={fetchEdgeFunctionLogs}
            disabled={loading}
            variant="outline"
            size="sm"
            className="border-gray-600 text-white hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Тестировать
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-96 w-full rounded border border-gray-600 p-4 bg-gray-900">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin text-purple-400 mr-2" />
              <span className="text-gray-300">Тестирование функции...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">Нажмите "Тестировать"</p>
              <p className="text-sm">Выберите функцию и протестируйте её. Подробные логи в консоли браузера (F12)</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log, index) => (
                <div key={log.id || index} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                  <div className="flex items-start gap-3">
                    {getLogIcon(log.level || '', log.event_message)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(log.timestamp)}
                        </span>
                        {log.status_code && (
                          <Badge variant={log.status_code < 400 ? 'default' : 'destructive'} className="text-xs">
                            {log.status_code}
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm font-mono break-words ${getLogColor(log.level || '', log.event_message)}`}>
                        {log.event_message}
                      </p>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                            Показать метаданные
                          </summary>
                          <pre className="text-xs text-gray-400 mt-1 whitespace-pre-wrap break-words">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
          <span>
            Результат тестирования: {logs.length} событий для {selectedFunction}
          </span>
          <span>
            💡 Откройте DevTools (F12) → Console для подробных логов Edge Functions
          </span>
        </div>
      </CardContent>
    </Card>
  );
};