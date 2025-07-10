import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMultilogin } from '@/hooks/useMultilogin';
import { useToast } from '@/hooks/use-toast';
import { 
  Globe, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Users, 
  Activity,
  Zap,
  Clock
} from 'lucide-react';

interface MultiloginStatus {
  connected: boolean;
  profilesCount: number;
  activeProfiles: number;
  lastCheck: string;
  version?: string;
  error?: string;
}

export const MultiloginStatusCard: React.FC = () => {
  const { 
    isConnected, 
    totalCount, 
    activeCount, 
    isLoading, 
    error, 
    refresh 
  } = useMultilogin();

  return (
    <Card className="bg-gradient-to-r from-blue-800/50 to-purple-800/50 border-blue-500/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Multilogin Status
          </div>
          <Button
            onClick={refresh}
            disabled={isLoading}
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Статус подключения */}
        <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <CheckCircle className="h-5 w-5 text-green-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400" />
            )}
            <span className="text-white font-medium">
              {isConnected ? 'Подключено' : 'Не подключено'}
            </span>
          </div>
          <Badge 
            variant={isConnected ? "default" : "destructive"}
            className={isConnected ? "bg-green-600" : "bg-red-600"}
          >
            {isConnected ? 'ONLINE' : 'OFFLINE'}
          </Badge>
        </div>

        {/* Статистика профилей */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-900/50 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-400" />
              <span className="text-2xl font-bold text-white">{totalCount}</span>
            </div>
            <span className="text-xs text-gray-400">Всего профилей</span>
          </div>
          
          <div className="p-3 bg-gray-900/50 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-green-400" />
              <span className="text-2xl font-bold text-white">{activeCount}</span>
            </div>
            <span className="text-xs text-gray-400">Активных</span>
          </div>
        </div>

        {/* Дополнительная информация */}
        <div className="space-y-2 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3" />
            <span>Версия: 2.0.0-multilogin</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>
              Обновлено: {new Date().toLocaleTimeString()}
            </span>
          </div>

          {error && (
            <div className="p-2 bg-red-900/20 border border-red-500/30 rounded text-red-300">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3" />
                <span className="font-medium">Ошибка:</span>
              </div>
              <span className="text-xs">{error}</span>
            </div>
          )}
        </div>

        {/* Действия */}
        <div className="pt-2 border-t border-gray-700">
          <div className="text-xs text-gray-400">
            <p className="font-semibold mb-1">🎯 Возможности:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Автоматическое создание профилей</li>
              <li>Антидетект браузеры</li>
              <li>Управление прокси</li>
              <li>Selenium интеграция</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};