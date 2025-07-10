
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ServerBasedRPARecorder } from './ServerBasedRPARecorder';
import { APIKeysManager } from './APIKeysManager';
import { MacroExecutor } from './MacroExecutor';
import { ScenarioManager } from './ScenarioManager';
import { ImprovedAdvancedScenarioBuilder } from '../scenario-flow/ImprovedAdvancedScenarioBuilder';
import { TestRPAButton } from '../TestRPAButton';
import { MultiloginTestButton } from '../MultiloginTestButton';
import { MultiloginStatusCard } from '../MultiloginStatusCard';
import { MultiloginTokenStatus } from '../MultiloginTokenStatus';
import { 
  Bot, 
  Settings, 
  Play, 
  Database,
  Server,
  ArrowLeft,
  Workflow,
  Home,
  TestTube
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Node, Edge } from '@xyflow/react';
import type { ServerRecordedAction, ServerSavedScenario } from '@/types/serverRPA';

export const VisualRPABuilder: React.FC = () => {
  const [activeTab, setActiveTab] = useState('constructor');
  const [savedScenarios, setSavedScenarios] = useState<ServerSavedScenario[]>([]);
  const [executingScenario, setExecutingScenario] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSaveScenario = useCallback((actions: ServerRecordedAction[]) => {
    if (actions.length === 0) {
      toast({
        title: "Нет действий",
        description: "Нельзя сохранить пустой сценарий",
        variant: "destructive"
      });
      return;
    }

    const scenarioName = prompt("Введите название сценария:");
    if (!scenarioName) return;

    const scenarioDescription = prompt("Введите описание сценария (опционально):") || "";
    const platform = prompt("Введите название платформы (например: instagram, youtube):") || "universal";

    const browserResolution = actions[0]?.browserResolution || { width: 1920, height: 1080 };

    const newScenario: ServerSavedScenario = {
      id: `scenario_${Date.now()}`,
      name: scenarioName,
      description: scenarioDescription,
      actions,
      created_at: new Date().toISOString(),
      platform,
      browserResolution
    };

    setSavedScenarios(prev => [...prev, newScenario]);
    
    localStorage.setItem('rpa_scenarios', JSON.stringify([...savedScenarios, newScenario]));

    toast({
      title: "Сценарий сохранен",
      description: `"${scenarioName}" сохранен с ${actions.length} действиями`
    });
  }, [savedScenarios, toast]);

  const handleSaveFromConstructor = useCallback((nodes: Node[], edges: Edge[]) => {
    const scenarioName = prompt("Введите название сценария:");
    if (!scenarioName) return;

    const scenarioDescription = prompt("Введите описание сценария (опционально):") || "";
    const platform = prompt("Введите название платформы:") || "universal";

    // Конвертируем узлы в действия с правильными типами
    const actions: ServerRecordedAction[] = nodes
      .filter(node => node.type === 'action')
      .map((node, index) => {
        const nodeData = node.data as any;
        const config = nodeData.config || {};
        
        // Определяем правильный тип действия
        let actionType: ServerRecordedAction['type'] = 'click';
        if (nodeData.type === 'navigate') actionType = 'navigate';
        else if (nodeData.type === 'type') actionType = 'type';
        else if (nodeData.type === 'wait') actionType = 'wait';
        else if (nodeData.type === 'scroll') actionType = 'scroll';
        else if (nodeData.type === 'screenshot') actionType = 'screenshot';

        return {
          id: node.id,
          type: actionType,
          timestamp: Date.now() + index * 1000,
          element: {
            selector: config.selector || '',
            text: config.text || '',
            coordinates: { x: 0, y: 0 }
          },
          url: config.url || '',
          delay: config.delay || 1000
        };
      });

    const newScenario: ServerSavedScenario = {
      id: `scenario_${Date.now()}`,
      name: scenarioName,
      description: scenarioDescription,
      actions,
      created_at: new Date().toISOString(),
      platform,
      browserResolution: { width: 1920, height: 1080 }
    };

    setSavedScenarios(prev => [...prev, newScenario]);
    localStorage.setItem('rpa_scenarios', JSON.stringify([...savedScenarios, newScenario]));

    toast({
      title: "Сценарий сохранен из конструктора",
      description: `"${scenarioName}" создан с ${actions.length} действиями`
    });

    // Переключаемся на вкладку сценариев
    setActiveTab('scenarios');
  }, [savedScenarios, toast]);

  const handleExecuteScenario = useCallback(async (scenario: ServerSavedScenario) => {
    if (executingScenario) {
      toast({
        title: "Выполнение уже запущено",
        description: "Дождитесь завершения текущего сценария",
        variant: "destructive"
      });
      return;
    }

    setExecutingScenario(scenario.id);
    
    toast({
      title: "Запуск сценария",
      description: `Выполняется "${scenario.name}"`
    });

    try {
      console.log('Executing scenario:', scenario);
      
      // Симуляция выполнения
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast({
        title: "Сценарий выполнен",
        description: `"${scenario.name}" успешно завершен`
      });
    } catch (error) {
      toast({
        title: "Ошибка выполнения",
        description: "Не удалось выполнить сценарий",
        variant: "destructive"
      });
    } finally {
      setExecutingScenario(null);
    }
  }, [executingScenario, toast]);

  const handleDeleteScenario = useCallback((id: string) => {
    setSavedScenarios(prev => {
      const updated = prev.filter(s => s.id !== id);
      localStorage.setItem('rpa_scenarios', JSON.stringify(updated));
      return updated;
    });
    
    toast({
      title: "Сценарий удален",
      description: "Сценарий успешно удален"
    });
  }, [toast]);

  React.useEffect(() => {
    const stored = localStorage.getItem('rpa_scenarios');
    if (stored) {
      try {
        setSavedScenarios(JSON.parse(stored));
      } catch (error) {
        console.warn('Failed to load saved scenarios:', error);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 p-2 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Адаптивная навигация для мобильных */}
        <div className="mb-4 sm:mb-8">
          {/* Мобильная версия навигации */}
          <div className="block sm:hidden space-y-3">
            <div className="flex items-center justify-between">
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Button>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => navigate('/accounts')}
                  variant="outline"
                  size="sm"
                  className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => navigate('/')}
                  variant="outline"
                  size="sm"
                  className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                >
                  <Home className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="text-center">
              <h1 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                <Bot className="h-6 w-6 text-purple-400" />
                RPA Конструктор
              </h1>
              <p className="text-gray-400 mt-1 text-sm">
                Создавайте автоматизированные сценарии
              </p>
            </div>
          </div>

          {/* Десктопная версия навигации */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Button>
              
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Bot className="h-8 w-8 text-purple-400" />
                  Визуальный RPA Конструктор
                </h1>
                <p className="text-gray-400 mt-2">
                  Создавайте автоматизированные сценарии с помощью визуального конструктора
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => navigate('/accounts')}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              >
                <Settings className="h-4 w-4" />
                Аккаунты
              </Button>
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              >
                <Home className="h-4 w-4" />
                Главная
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          {/* Адаптивные табы */}
          <div className="overflow-x-auto">
            <TabsList className="grid grid-cols-6 bg-gray-800 min-w-max sm:min-w-0 w-full sm:w-auto">
              <TabsTrigger value="constructor" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
                <Workflow className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Конструктор</span>
                <span className="sm:hidden">Блоки</span>
              </TabsTrigger>
              <TabsTrigger value="recorder" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
                <Server className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Рекордер</span>
                <span className="sm:hidden">Зап.</span>
              </TabsTrigger>
              <TabsTrigger value="scenarios" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
                <Database className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Сценарии</span>
                <span className="sm:hidden">Сцен.</span>
              </TabsTrigger>
              <TabsTrigger value="executor" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
                <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Выполнение</span>
                <span className="sm:hidden">Играть</span>
              </TabsTrigger>
              <TabsTrigger value="testing" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
                <TestTube className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Тестирование</span>
                <span className="sm:hidden">Тест</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
                <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Настройки</span>
                <span className="sm:hidden">Наст.</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="constructor">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Workflow className="h-5 w-5 text-blue-400" />
                      Визуальный конструктор сценариев
                    </CardTitle>
                    <p className="text-gray-400 mt-2 text-sm sm:text-base">
                      Перетаскивайте блоки и соединяйте их для создания сценариев автоматизации
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate('/')}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white self-start sm:self-center"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Вернуться в меню</span>
                    <span className="sm:hidden">Меню</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[400px] sm:h-[600px] lg:h-[800px]">
                  <ImprovedAdvancedScenarioBuilder onSave={handleSaveFromConstructor} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recorder">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Записывать действия</h2>
                <Button
                  onClick={() => navigate('/')}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Вернуться в меню
                </Button>
              </div>
              <ServerBasedRPARecorder onSaveScenario={handleSaveScenario} />
            </div>
          </TabsContent>

          <TabsContent value="scenarios">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Управление сценариями</h2>
                <Button
                  onClick={() => navigate('/')}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Вернуться в меню
                </Button>
              </div>
              <ScenarioManager
                scenarios={savedScenarios}
                onExecute={handleExecuteScenario}
                onDelete={handleDeleteScenario}
                isExecuting={executingScenario}
              />
            </div>
          </TabsContent>

          <TabsContent value="executor">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Выполнение макросов</h2>
                <Button
                  onClick={() => navigate('/')}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Вернуться в меню
                </Button>
              </div>
              <MacroExecutor
                scenarios={savedScenarios}
                onExecute={handleExecuteScenario}
                isExecuting={executingScenario}
              />
            </div>
          </TabsContent>

          <TabsContent value="testing">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Тестирование RPA системы</h2>
                <Button
                  onClick={() => navigate('/')}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Вернуться в меню
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                <TestRPAButton />
                <MultiloginTestButton />
                <MultiloginTokenStatus />
              </div>
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                <MultiloginStatusCard />
              </div>
              
              <Card className="bg-gray-800/50 border-gray-700">
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

          <TabsContent value="settings">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Настройки API</h2>
                <Button
                  onClick={() => navigate('/')}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Вернуться в меню
                </Button>
              </div>
              <APIKeysManager />
            </div>
          </TabsContent>
        </Tabs>

        {executingScenario && (
          <Card className="fixed bottom-4 right-4 bg-purple-900 border-purple-700 w-80">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 bg-purple-400 rounded-full animate-pulse"></div>
                <div>
                  <p className="text-white font-medium">Выполнение сценария</p>
                  <p className="text-purple-300 text-sm">
                    Сценарий выполняется...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
