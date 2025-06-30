
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TestRPAButton } from '@/components/TestRPAButton';
import { MultiloginStatus } from './MultiloginStatus';
import { CloudRPAStatus } from './CloudRPAStatus';
import { RPATaskMonitor } from './RPATaskMonitor';
import { APIKeysManager } from '@/components/rpa-visual/APIKeysManager';
import { 
  Bot, 
  Shield, 
  Activity, 
  Settings,
  Zap,
  Target
} from 'lucide-react';

export const EnhancedRPADashboard: React.FC = () => {
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
            
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Тестовые сценарии</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-500/30">
                    <h4 className="text-blue-200 font-medium">🎯 Telegram лайки</h4>
                    <p className="text-blue-300 text-sm">Автоматическая постановка реакций в Telegram каналах</p>
                  </div>
                  
                  <div className="bg-red-900/30 rounded-lg p-3 border border-red-500/30">
                    <h4 className="text-red-200 font-medium">📺 YouTube взаимодействия</h4>
                    <p className="text-red-300 text-sm">Лайки, подписки, комментарии на YouTube</p>
                  </div>
                  
                  <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-500/30">
                    <h4 className="text-purple-200 font-medium">📸 Instagram активность</h4>
                    <p className="text-purple-300 text-sm">Лайки постов, подписки, просмотры Stories</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Мониторинг */}
        <TabsContent value="monitoring" className="space-y-6">
          <RPATaskMonitor />
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
