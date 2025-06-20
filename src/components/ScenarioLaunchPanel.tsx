import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, User } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { useScenarios } from '@/hooks/useScenarios';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useAutomationService } from '@/hooks/useAutomationService';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import TemplateSelector from './scenario-launch/TemplateSelector';
import AccountSelector from './scenario-launch/AccountSelector';
import ActiveScenarios from './scenario-launch/ActiveScenarios';
import LaunchButton from './scenario-launch/LaunchButton';
import EmptyState from './scenario-launch/EmptyState';
import { ScenarioConfigModal } from './scenario-launch/ScenarioConfigModal';
import { Button } from '@/components/ui/button';

type ScenarioRow = Database['public']['Tables']['scenarios']['Row'];

interface ScenarioTemplate {
  id: string;
  name: string;
  platform: string;
  config?: {
    steps: any[];
    settings: any;
  } | null;
}

const ScenarioLaunchPanel = () => {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [templates, setTemplates] = useState<ScenarioTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [scenarioConfig, setScenarioConfig] = useState<any>(null);
  
  const { accounts } = useAccounts();
  const { scenarios, refetch: refetchScenarios } = useScenarios();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { launchScenario, stopScenario, isLaunching } = useAutomationService();

  // Load scenario templates only when user is authenticated
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!user) {
        console.log('Пользователь не авторизован, очищаем шаблоны');
        setTemplates([]);
        setLoadingTemplates(false);
        return;
      }

      try {
        setLoadingTemplates(true);
        console.log('Загрузка шаблонов для пользователя:', user.id);
        
        const { data, error } = await supabase
          .from('scenarios')
          .select('*')
          .eq('status', 'template')
          .eq('user_id', user.id)
          .not('config', 'is', null)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Ошибка загрузки шаблонов:', error);
          throw error;
        }
        
        const templatesData: ScenarioTemplate[] = (data || []).map((row: ScenarioRow) => ({
          id: row.id,
          name: row.name,
          platform: row.platform,
          config: row.config && typeof row.config === 'object' ? row.config as { steps: any[]; settings: any; } : null
        }));
        
        console.log('Загружено шаблонов:', templatesData.length);
        setTemplates(templatesData);
      } catch (error) {
        console.error('Ошибка загрузки шаблонов:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить шаблоны сценариев",
          variant: "destructive"
        });
        setTemplates([]);
      } finally {
        setLoadingTemplates(false);
      }
    };

    if (!authLoading) {
      fetchTemplates();
    }
  }, [user, authLoading, toast]);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-8 text-center">
            <div className="text-white">Проверка авторизации...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show auth required message if user is not logged in
  if (!user) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="h-5 w-5" />
              Необходима авторизация
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-gray-300">
              Для запуска сценариев необходимо войти в систему
            </div>
            <Button 
              onClick={() => window.location.href = '/auth'}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Войти в систему
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter accounts by selected template platform
  const getAvailableAccounts = () => {
    if (!selectedTemplate) return accounts;
    
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return accounts;
    
    return accounts.filter(account => 
      account.platform === template.platform && 
      (account.status === 'idle' || account.status === 'working')
    );
  };

  const handleAccountSelection = (accountId: string, checked: boolean) => {
    if (checked) {
      setSelectedAccounts(prev => [...prev, accountId]);
    } else {
      setSelectedAccounts(prev => prev.filter(id => id !== accountId));
    }
  };

  const selectAllAccounts = () => {
    const availableAccounts = getAvailableAccounts();
    setSelectedAccounts(availableAccounts.map(acc => acc.id));
  };

  const clearSelection = () => {
    setSelectedAccounts([]);
  };

  const handleLaunchScenario = async () => {
    if (!selectedTemplate || selectedAccounts.length === 0 || !user) return;

    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;

    setShowConfigModal(true);
  };

  const handleConfigSave = async (config: any) => {
    if (!selectedTemplate || selectedAccounts.length === 0 || !user) return;

    try {
      const result = await launchScenario({
        templateId: selectedTemplate,
        accountIds: selectedAccounts,
        userId: user.id,
        config: config
      });

      if (result.success) {
        toast({
          title: "Сценарии запущены",
          description: `${result.message} с настроенной конфигурацией`,
        });
        refetchScenarios();
        setSelectedAccounts([]);
        setSelectedTemplate('');
        setScenarioConfig(null);
      } else {
        toast({
          title: "Ошибка запуска",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Ошибка при запуске сценариев:', error);
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при запуске сценариев",
        variant: "destructive"
      });
    }
  };

  const handleStopScenario = async (scenarioId: string) => {
    const success = await stopScenario(scenarioId);
    if (success) {
      refetchScenarios();
    }
  };

  const availableAccounts = getAvailableAccounts();
  const runningScenarios = scenarios.filter(s => s.status === 'running' || s.status === 'waiting');
  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Play className="h-5 w-5" />
            Запуск сценариев
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <TemplateSelector
            templates={templates}
            selectedTemplate={selectedTemplate}
            onTemplateChange={setSelectedTemplate}
            loading={loadingTemplates}
          />

          {selectedTemplate && (
            <div className="space-y-4">
              <AccountSelector
                accounts={availableAccounts}
                selectedAccounts={selectedAccounts}
                onAccountSelection={handleAccountSelection}
                onSelectAll={selectAllAccounts}
                onClearSelection={clearSelection}
              />

              <LaunchButton
                selectedAccounts={selectedAccounts}
                isLaunching={isLaunching}
                onLaunch={handleLaunchScenario}
                buttonText="Настроить и запустить"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <ActiveScenarios
        scenarios={runningScenarios}
        onStopScenario={handleStopScenario}
      />

      {templates.length === 0 && !loadingTemplates && user && <EmptyState />}

      {showConfigModal && selectedTemplateData && (
        <ScenarioConfigModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          onSave={handleConfigSave}
          platform={selectedTemplateData.platform}
          templateName={selectedTemplateData.name}
        />
      )}
    </div>
  );
};

export default ScenarioLaunchPanel;
