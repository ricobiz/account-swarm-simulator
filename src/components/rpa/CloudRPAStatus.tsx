
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Cloud, Activity, CheckCircle, XCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CloudBotStatus {
  online: boolean;
  version?: string;
  environment?: string;
  capabilities?: string[];
  lastCheck?: string;
  url?: string;
}

export const CloudRPAStatus: React.FC = () => {
  const [status, setStatus] = useState<CloudBotStatus>({ online: false });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkCloudBot = async () => {
    setLoading(true);
    
    try {
      // Используем встроенный RPA health check
      const { data, error } = await supabase.functions.invoke('rpa-health');
      
      if (error) {
        throw new Error(error.message);
      }
      
      setStatus({
        online: data.online,
        version: data.version,
        environment: data.service,
        capabilities: Object.keys(data.components || {}),
        lastCheck: new Date().toLocaleString(),
        url: undefined
      });
      
      toast({
        title: "Встроенный RPA сервис",
        description: `Статус: ${data.status}, Версия: ${data.version}`,
      });
      
    } catch (error: any) {
      setStatus({
        online: false,
        lastCheck: new Date().toLocaleString()
      });
      
      toast({
        title: "Ошибка RPA сервиса",
        description: error.message || "Сервис временно недоступен",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkCloudBot();
    
    // Автопроверка каждые 30 секунд
    const interval = setInterval(checkCloudBot, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-white">
          <Activity className="h-5 w-5 text-green-400" />
          Встроенный RPA сервис
          <Badge variant={status.online ? "default" : "destructive"} className="ml-auto">
            {status.online ? "Онлайн" : "Офлайн"}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status.online ? (
              <CheckCircle className="h-4 w-4 text-green-400" />
            ) : (
              <XCircle className="h-4 w-4 text-red-400" />
            )}
            <span className="text-sm text-gray-300">
              {status.online ? "Готов к выполнению задач" : "Недоступен"}
            </span>
          </div>
          
          <Button
            onClick={checkCloudBot}
            disabled={loading}
            size="sm"
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Проверить
          </Button>
        </div>

        {status.version && (
          <div className="text-sm text-gray-400">
            <p>Версия: {status.version}</p>
            <p>Среда: {status.environment}</p>
          </div>
        )}

        {status.capabilities && status.capabilities.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-300 mb-2">Возможности:</p>
            <div className="flex flex-wrap gap-1">
              {status.capabilities.map((capability, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {capability}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {status.lastCheck && (
          <p className="text-xs text-gray-500">
            Последняя проверка: {status.lastCheck}
          </p>
        )}

        {status.url && (
          <Button
            onClick={() => window.open(status.url, '_blank')}
            size="sm"
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Открыть панель управления
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
