
import { useState, useCallback } from 'react';

export interface ProcessStatus {
  id: string;
  type: 'scenario_save' | 'scenario_launch' | 'account_update' | 'template_create' | 'rpa_execution';
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stuck';
  progress: number;
  startTime: Date;
  lastUpdate: Date;
  details: string;
  error?: string;
  stuckStage?: string;
}

export const useProcessMonitor = () => {
  const [processes, setProcesses] = useState<ProcessStatus[]>([]);

  const startProcess = useCallback((
    type: ProcessStatus['type'],
    name: string,
    details: string = ''
  ): string => {
    const id = `${type}_${Date.now()}`;
    const newProcess: ProcessStatus = {
      id,
      type,
      name,
      status: 'pending',
      progress: 0,
      startTime: new Date(),
      lastUpdate: new Date(),
      details
    };
    
    setProcesses(prev => [...prev, newProcess]);
    console.log(`Process started: ${name} (${id})`);
    return id;
  }, []);

  const updateProcess = useCallback((
    id: string,
    updates: Partial<Pick<ProcessStatus, 'status' | 'progress' | 'details' | 'error' | 'stuckStage'>>
  ) => {
    setProcesses(prev => prev.map(process => 
      process.id === id 
        ? { ...process, ...updates, lastUpdate: new Date() }
        : process
    ));
    console.log(`Process updated: ${id}`, updates);
  }, []);

  const completeProcess = useCallback((id: string, details?: string) => {
    updateProcess(id, { 
      status: 'completed', 
      progress: 100,
      details: details || 'Процесс завершен успешно'
    });
  }, [updateProcess]);

  const failProcess = useCallback((id: string, error: string, details?: string) => {
    updateProcess(id, { 
      status: 'failed', 
      error,
      details: details || 'Процесс завершен с ошибкой'
    });
  }, [updateProcess]);

  const markStuck = useCallback((id: string, stuckStage: string, details?: string) => {
    updateProcess(id, { 
      status: 'stuck', 
      stuckStage,
      details: details || `Процесс застрял на этапе: ${stuckStage}`
    });
  }, [updateProcess]);

  const removeProcess = useCallback((id: string) => {
    setProcesses(prev => prev.filter(p => p.id !== id));
    console.log(`Process removed: ${id}`);
  }, []);

  const clearCompleted = useCallback(() => {
    setProcesses(prev => prev.filter(p => p.status !== 'completed' && p.status !== 'failed'));
  }, []);

  return {
    processes,
    startProcess,
    updateProcess,
    completeProcess,
    failProcess,
    markStuck,
    removeProcess,
    clearCompleted
  };
};
