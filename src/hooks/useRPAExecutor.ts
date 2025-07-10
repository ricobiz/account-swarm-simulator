import { useRPAService } from './useRPAService';
import { useProcessMonitorContext } from '@/components/ProcessMonitorProvider';
import { useToast } from '@/hooks/use-toast';
import { useMultilogin } from './useMultilogin';
import type { RPATask } from '@/types/rpa';

export const useRPAExecutor = () => {
  const { submitRPATask, waitForRPACompletion } = useRPAService();
  const { startProcess, updateProcess } = useProcessMonitorContext();
  const { getTokenStatus } = useMultilogin();
  const { toast } = useToast();

  const executeRPABlock = async (blockConfig: {
    url: string;
    actions: any[];
    accountId: string;
    scenarioId: string;
    blockId: string;
    timeout?: number;
  }): Promise<{ success: boolean; result?: any; error?: string }> => {
    const processId = `rpa_${blockConfig.blockId}_${Date.now()}`;
    
    try {
      // Проверяем статус токенов Multilogin
      const tokenStatus = await getTokenStatus();
      if (!tokenStatus.hasToken) {
        toast({
          title: "Внимание: Токены Multilogin",
          description: "Автоматические токены недоступны, будет использован резервный метод",
          variant: "destructive"
        });
      }

      // Создаем процесс мониторинга
      const processId = startProcess(
        'rpa_execution',
        `RPA Блок: ${blockConfig.url}`,
        `Выполнение ${blockConfig.actions.length} действий`
      );

      // Обновляем статус на "выполняется"
      updateProcess(processId, { 
        status: 'running',
        progress: 10
      });

      // Создаем RPA задачу с улучшенной конфигурацией
      const rpaTask: RPATask = {
        taskId: `rpa_task_${Date.now()}`,
        url: blockConfig.url,
        actions: blockConfig.actions.map(action => ({
          type: action.type || 'click',
          ...action
        })),
        accountId: blockConfig.accountId,
        scenarioId: blockConfig.scenarioId,
        blockId: blockConfig.blockId,
        timeout: blockConfig.timeout || 60000,
        metadata: {
          // Включаем автоматические токены Multilogin
          use_multilogin: true,
          use_auto_tokens: true,
          human_behavior: true,
          anti_detect: true
        }
      };

      updateProcess(processId, { 
        status: 'running',
        progress: 30,
        details: 'Отправка задачи на выполнение...'
      });

      // Отправляем задачу
      const submitResult = await submitRPATask(rpaTask);
      
      if (!submitResult.success) {
        updateProcess(processId, { 
          status: 'failed',
          error: submitResult.error 
        });
        return { success: false, error: submitResult.error };
      }

      updateProcess(processId, { 
        status: 'running',
        progress: 50,
        details: 'Ожидание выполнения...'
      });

      // Ждем завершения с увеличенным таймаутом
      const executionResult = await waitForRPACompletion(rpaTask.taskId, blockConfig.timeout || 120000);

      if (!executionResult) {
        updateProcess(processId, { 
          status: 'failed',
          error: 'Таймаут выполнения RPA задачи'
        });
        return { success: false, error: 'Таймаут выполнения' };
      }

      if (executionResult.success) {
        updateProcess(processId, { 
          status: 'completed',
          progress: 100,
          details: 'Выполнено успешно'
        });

        toast({
          title: "RPA блок выполнен",
          description: "Все действия выполнены успешно с автоматическими токенами"
        });

        return { 
          success: true, 
          result: executionResult.data 
        };
      } else {
        updateProcess(processId, { 
          status: 'failed',
          error: executionResult.error
        });
        return { 
          success: false, 
          error: executionResult.error 
        };
      }

    } catch (error: any) {
      const errorMessage = error.message || 'Неизвестная ошибка выполнения RPA блока';
      
      toast({
        title: "Ошибка выполнения RPA блока",
        description: errorMessage,
        variant: "destructive"
      });

      return { 
        success: false, 
        error: errorMessage 
      };
    }
  };

  return {
    executeRPABlock
  };
};