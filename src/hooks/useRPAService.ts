
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { RPATask, RPATaskStatus, RPAResult } from '@/types/rpa';

export const useRPAService = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const submitRPATask = async (task: RPATask): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsProcessing(true);
      console.log('=== ОТПРАВКА RPA ЗАДАЧИ ===');
      console.log('Отправляемая задача:', task);

      // Получаем текущего пользователя
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      console.log('Пользователь:', { user: !!user, error: userError });
      
      if (userError || !user) {
        throw new Error('Пользователь не авторизован');
      }

      console.log('Сохранение задачи в базу данных...');

      // Сохраняем задачу в базу данных с user_id
      const { error: insertError } = await supabase
        .from('rpa_tasks')
        .insert({
          task_id: task.taskId,
          user_id: user.id,
          status: 'pending',
          task_data: task as any
        });

      console.log('Результат сохранения:', { insertError });

      if (insertError) {
        console.error('Ошибка сохранения RPA задачи:', insertError);
        throw new Error(`Не удалось сохранить задачу: ${insertError.message}`);
      }

      console.log('Отправка задачи через Edge Function...');

      // Отправляем задачу через Edge Function
      const { data, error } = await supabase.functions.invoke('rpa-task', {
        body: { task }
      });

      console.log('Результат Edge Function:', { data, error });

      if (error) {
        console.error('Ошибка отправки RPA задачи:', error);
        
        // Обновляем статус задачи на failed
        await supabase
          .from('rpa_tasks')
          .update({ 
            status: 'failed',
            result_data: { error: error.message, message: 'Ошибка отправки задачи' } as any
          })
          .eq('task_id', task.taskId);

        throw new Error(`Ошибка отправки: ${error.message}`);
      }

      console.log('RPA задача успешно отправлена:', data);
      
      toast({
        title: "RPA задача отправлена",
        description: `Задача ${task.taskId} отправлена на выполнение`,
      });

      return { success: true };

    } catch (error: any) {
      console.error('=== ОШИБКА SUBMITRPATASK ===');
      console.error('Тип ошибки:', typeof error);
      console.error('Сообщение ошибки:', error.message);
      console.error('Полная ошибка:', error);
      
      toast({
        title: "Ошибка отправки RPA задачи",
        description: error.message,
        variant: "destructive"
      });

      return { success: false, error: error.message };
    } finally {
      setIsProcessing(false);
    }
  };

  const getRPATaskStatus = async (taskId: string): Promise<RPATaskStatus | null> => {
    try {
      const { data } = await supabase.functions.invoke('rpa-status', {
        body: { taskId }
      });

      return data?.status || null;
    } catch (error) {
      console.error('Ошибка получения статуса RPA задачи:', error);
      return null;
    }
  };

  const waitForRPACompletion = async (taskId: string, timeout: number = 60000): Promise<RPAResult | null> => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        // Проверяем статус в локальной базе данных
        const { data: taskData, error } = await supabase
          .from('rpa_tasks')
          .select('status, result_data')
          .eq('task_id', taskId)
          .single();

        if (error) {
          console.error('Ошибка получения статуса задачи:', error);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        if (taskData.status === 'completed') {
          const resultData = taskData.result_data as any;
          return {
            success: true,
            message: resultData?.message || 'Задача выполнена успешно',
            data: resultData
          };
        }

        if (taskData.status === 'failed' || taskData.status === 'timeout') {
          const resultData = taskData.result_data as any;
          return {
            success: false,
            error: resultData?.error || 'Задача завершилась с ошибкой',
            data: resultData
          };
        }

        // Ждем 2 секунды перед следующей проверкой
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error('Ошибка ожидания выполнения RPA:', error);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Таймаут
    return {
      success: false,
      error: 'Таймаут ожидания выполнения RPA задачи'
    };
  };

  return {
    submitRPATask,
    getRPATaskStatus,
    waitForRPACompletion,
    isProcessing
  };
};
