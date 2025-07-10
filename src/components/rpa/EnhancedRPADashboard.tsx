
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MultiloginTestButton } from '@/components/MultiloginTestButton';
import { TestRPAButton } from '@/components/TestRPAButton';
import { MultiloginStatus } from './MultiloginStatus';
import { CloudRPAStatus } from './CloudRPAStatus';
import { RPATaskMonitor } from './RPATaskMonitor';
import { APIKeysManager } from '@/components/rpa-visual/APIKeysManager';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Bot, 
  Shield, 
  Activity, 
  Settings,
  Zap,
  Target,
  RefreshCw
} from 'lucide-react';

export const EnhancedRPADashboard: React.FC = () => {
  const [rpaTasks, setRpaTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  // Проверяем авторизацию пользователя
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        setUser(user);
      } catch (error: any) {
        console.error('Ошибка проверки авторизации:', error);
      }
    };

    checkAuth();

    // Слушаем изменения авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRPATasks = async () => {
    if (!user) {
      setRpaTasks([]);
      return;
    }

    try {
      setLoading(true);
      
      // Загружаем задачи напрямую из таблицы rpa_tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('rpa_tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (tasksError) {
        console.error('Ошибка загрузки RPA задач:', tasksError);
        toast({
          title: "Ошибка загрузки RPA задач",
          description: tasksError.message,
          variant: "destructive"
        });
        return;
      }

      // Преобразуем данные в нужный формат
      const tasks = (tasksData || []).map((task: any) => ({
        id: task.id,
        taskId: task.task_id,
        status: task.status,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        result: task.result_data,
        task: task.task_data
      }));
      
      setRpaTasks(tasks);

    } catch (error: any) {
      console.error('Ошибка при загрузке RPA задач:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить RPA задачи",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRPATasks();
      
      // Обновляем каждые 10 секунд только если пользователь авторизован
      const interval = setInterval(fetchRPATasks, 10000);
      
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Bot className="h-8 w-8 text-blue-400" />
          <h1 className="text-3xl font-bold text-white">Enhanced RPA Dashboard</h1>
        </div>
        <div className="flex items-center gap-2 bg-green-900/30 px-3 py-1 rounded-full border border-green-500/30">
          <Zap className="h-4 w-4 text-green-400" />
          <span className="text-green-300 text-sm font-medium">Multilogin интегрирован</span>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800/50">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Обзор
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Тестирование
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Мониторинг
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Настройки
          </TabsTrigger>
        </TabsList>

        {/* Обзор */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Статус Multilogin */}
            <MultiloginStatus />
            
            {/* Статус RPA бота */}
            <CloudRPAStatus />
          </div>

          {/* Быстрый тест */}
          <Card className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-400" />
                Быстрый тест системы
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-white font-semibold">Возможности системы:</h3>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>✅ Антидетект браузеры через Multilogin</li>
                    <li>✅ Человекоподобное поведение</li>
                    <li>✅ Работа с Telegram, YouTube, Instagram</li>
                    <li>✅ Автоматизация лайков и взаимодействий</li>
                    <li>✅ Облачное выполнение на Railway</li>
                  </ul>
                </div>
                <div className="flex items-center justify-center">
                  <TestRPAButton />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Тестирование */}
        <TabsContent value="testing" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <TestRPAButton />
            <MultiloginTestButton />
            
            <Card className="bg-gray-800/50 border-gray-700 xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-white">Информация о тестировании</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-gray-300">
                  <div>
                    <h4 className="text-lg font-semibold mb-2">🔧 Доступные тесты:</h4>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li><strong>Базовый тест RPA:</strong> Проверка основных функций без входа в аккаунт</li>
                      <li><strong>Telegram лайк:</strong> Автоматическая постановка лайка в Telegram канале</li>
                      <li><strong>Multilogin тест:</strong> Полноценный тест с созданием профиля и входом в аккаунт</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold mb-2">🎯 Multilogin возможности:</h4>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Автоматическое создание браузерных профилей</li>
                      <li>Обход антидетекта и защиты платформ</li>
                      <li>Уникальные отпечатки браузера для каждого аккаунта</li>
                      <li>Управление прокси и геолокацией</li>
                      <li>Selenium интеграция для автоматизации</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Мониторинг */}
        <TabsContent value="monitoring" className="space-y-6">
          <RPATaskMonitor tasks={rpaTasks} onRefresh={fetchRPATasks} />
        </TabsContent>

        {/* Настройки */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <APIKeysManager />
            
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Настройки Multilogin</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Антидетект браузеры</span>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-400" />
                      <span className="text-green-400 text-sm">Активно</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Ротация профилей</span>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-400" />
                      <span className="text-green-400 text-sm">Активно</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Человекоподобность</span>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-400" />
                      <span className="text-green-400 text-sm">Активно</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-900/30 rounded-lg p-3 border border-green-500/30">
                  <p className="text-green-200 text-sm">
                    ✅ Все настройки антидетекта активны и работают через Multilogin
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
