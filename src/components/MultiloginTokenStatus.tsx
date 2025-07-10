import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMultilogin } from '@/hooks/useMultilogin';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Clock,
  Key
} from 'lucide-react';

export const MultiloginTokenStatus: React.FC = () => {
  const [tokenStatus, setTokenStatus] = useState<{
    hasToken: boolean;
    isExpired?: boolean;
    message?: string;
  }>({ hasToken: false });
  const [loading, setLoading] = useState(false);
  
  const { getTokenStatus, refreshToken } = useMultilogin();
  const { toast } = useToast();

  const checkTokenStatus = async () => {
    setLoading(true);
    try {
      const status = await getTokenStatus();
      setTokenStatus(status);
    } catch (error) {
      setTokenStatus({ hasToken: false, message: 'Ошибка проверки токена' });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    setLoading(true);
    try {
      console.log('🔄 Начинаем обновление токена...');
      const success = await refreshToken();
      console.log('🔄 Результат обновления токена:', success);
      
      if (success) {
        console.log('✅ Токен обновлен, ждем 1 секунду и проверяем статус...');
        // Небольшая задержка чтобы база данных успела обновиться
        setTimeout(async () => {
          await checkTokenStatus();
        }, 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkTokenStatus();
    
    // Автоматическая проверка каждые 5 минут
    const interval = setInterval(checkTokenStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Key className="h-5 w-5 text-purple-400" />
          Статус Multilogin токенов
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {tokenStatus.hasToken ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-green-400 font-medium">Токен активен</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-red-400" />
                <span className="text-red-400 font-medium">Токен недоступен</span>
              </>
            )}
          </div>
          
          <Badge 
            variant={tokenStatus.hasToken ? "default" : "destructive"}
            className={tokenStatus.hasToken ? "bg-green-900 text-green-100" : "bg-red-900 text-red-100"}
          >
            {tokenStatus.hasToken ? "Готов к работе" : "Требует обновления"}
          </Badge>
        </div>

        {tokenStatus.message && (
          <div className="bg-gray-900/50 rounded-lg p-3">
            <p className="text-gray-300 text-sm">{tokenStatus.message}</p>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock className="h-4 w-4" />
            <span>Автоматическое обновление каждые 25 минут</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Shield className="h-4 w-4" />
            <span>Безопасное хранение в базе данных</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={checkTokenStatus}
            disabled={loading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Проверить
          </Button>
          
          <Button
            onClick={() => {
              console.log('🔴 КНОПКА ОБНОВИТЬ ТОКЕН НАЖАТА! loading =', loading);
              console.log('🔴 refreshToken функция =', typeof refreshToken);
              handleRefreshToken();
            }}
            disabled={loading}
            size="sm"
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            <Key className="h-4 w-4" />
            {loading ? 'Обновляется...' : 'Обновить токен'}
          </Button>
        </div>

        <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-500/30">
          <p className="text-purple-200 text-sm">
            💡 <strong>Новая система:</strong> Токены автоматически получаются и обновляются. 
            Больше не нужно вручную добавлять MULTILOGIN_TOKEN!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};