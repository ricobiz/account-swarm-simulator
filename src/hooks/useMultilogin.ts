import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MultiloginProfile {
  id: string;
  name: string;
  platform: string;
  username: string;
  status: 'created' | 'running' | 'stopped';
  created_at: string;
}

interface MultiloginAPI {
  isConnected: boolean;
  profiles: MultiloginProfile[];
  activeCount: number;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
}

export const useMultilogin = () => {
  const [apiState, setApiState] = useState<MultiloginAPI>({
    isConnected: false,
    profiles: [],
    activeCount: 0,
    totalCount: 0,
    isLoading: false,
    error: null
  });

  const { toast } = useToast();

  const checkConnection = async (): Promise<boolean> => {
    try {
      setApiState(prev => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase.functions.invoke('multilogin-api', {
        body: { action: 'health' }
      });

      if (error) throw error;

      const isConnected = data?.multilogin_connected || false;
      
      setApiState(prev => ({ 
        ...prev, 
        isConnected,
        error: isConnected ? null : 'Multilogin API недоступен'
      }));

      return isConnected;
    } catch (error: any) {
      const errorMessage = error.message || 'Ошибка подключения к Multilogin';
      setApiState(prev => ({ 
        ...prev, 
        isConnected: false, 
        error: errorMessage 
      }));
      
      console.error('Ошибка проверки Multilogin:', error);
      return false;
    } finally {
      setApiState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const getProfiles = async (): Promise<MultiloginProfile[]> => {
    try {
      setApiState(prev => ({ ...prev, isLoading: true }));

      const { data, error } = await supabase.functions.invoke('multilogin-api', {
        body: { action: 'get_profiles' }
      });

      if (error) throw error;

      const profiles = data?.profiles || [];
      const activeCount = profiles.filter((p: MultiloginProfile) => p.status === 'running').length;

      setApiState(prev => ({
        ...prev,
        profiles,
        activeCount,
        totalCount: profiles.length,
        error: null
      }));

      return profiles;
    } catch (error: any) {
      const errorMessage = error.message || 'Ошибка получения профилей';
      setApiState(prev => ({ ...prev, error: errorMessage }));
      console.error('Ошибка получения профилей:', error);
      return [];
    } finally {
      setApiState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const createProfile = async (accountData: {
    platform: string;
    username: string;
    password: string;
    email?: string;
  }): Promise<string | null> => {
    try {
      setApiState(prev => ({ ...prev, isLoading: true }));

      // Используем новую систему автоматических токенов
      const { data, error } = await supabase.functions.invoke('multilogin-api', {
        body: { 
          action: 'create_profile',
          use_auto_tokens: true, // Включаем автоматические токены
          ...accountData 
        }
      });

      if (error) throw error;

      const profileId = data?.profile_id;
      
      if (profileId) {
        toast({
          title: "Профиль создан с автоматическими токенами",
          description: `Multilogin профиль ${profileId} создан с обновленной системой токенов`
        });

        // Обновляем список профилей
        await getProfiles();
      }

      return profileId;
    } catch (error: any) {
      const errorMessage = error.message || 'Ошибка создания профиля';
      setApiState(prev => ({ ...prev, error: errorMessage }));
      
      toast({
        title: "Ошибка создания профиля",
        description: errorMessage,
        variant: "destructive"
      });

      console.error('Ошибка создания профиля:', error);
      return null;
    } finally {
      setApiState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const startProfile = async (profileId: string): Promise<boolean> => {
    try {
      setApiState(prev => ({ ...prev, isLoading: true }));

      // Используем новую систему автоматических токенов
      const { data, error } = await supabase.functions.invoke('multilogin-api', {
        body: { 
          action: 'start_profile',
          profile_id: profileId,
          use_auto_tokens: true // Включаем автоматические токены
        }
      });

      if (error) throw error;

      const success = data?.success || false;
      
      if (success) {
        toast({
          title: "Профиль запущен с автоматическими токенами",
          description: `Multilogin профиль ${profileId} запущен с обновленной системой`
        });

        // Обновляем список профилей
        await getProfiles();
      }

      return success;
    } catch (error: any) {
      const errorMessage = error.message || 'Ошибка запуска профиля';
      setApiState(prev => ({ ...prev, error: errorMessage }));
      
      toast({
        title: "Ошибка запуска профиля",
        description: errorMessage,
        variant: "destructive"
      });

      console.error('Ошибка запуска профиля:', error);
      return false;
    } finally {
      setApiState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const stopProfile = async (profileId: string): Promise<boolean> => {
    try {
      setApiState(prev => ({ ...prev, isLoading: true }));

      const { data, error } = await supabase.functions.invoke('multilogin-api', {
        body: { 
          action: 'stop_profile',
          profile_id: profileId 
        }
      });

      if (error) throw error;

      const success = data?.success || false;
      
      if (success) {
        toast({
          title: "Профиль остановлен",
          description: `Multilogin профиль ${profileId} остановлен`
        });

        // Обновляем список профилей
        await getProfiles();
      }

      return success;
    } catch (error: any) {
      const errorMessage = error.message || 'Ошибка остановки профиля';
      setApiState(prev => ({ ...prev, error: errorMessage }));
      
      toast({
        title: "Ошибка остановки профиля",
        description: errorMessage,
        variant: "destructive"
      });

      console.error('Ошибка остановки профиля:', error);
      return false;
    } finally {
      setApiState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Автоматическая проверка подключения при загрузке
  useEffect(() => {
    checkConnection();
  }, []);

  // Новая функция для получения статуса токенов
  const getTokenStatus = async (): Promise<{ hasToken: boolean; isExpired?: boolean; message?: string }> => {
    try {
      // Получаем активный токен из базы данных
      const { data, error } = await supabase
        .from('multilogin_tokens')
        .select('token, expires_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking token status:', error);
        return { hasToken: false, message: 'Ошибка проверки токена' };
      }

      if (!data) {
        return { hasToken: false, message: 'Токен не найден в базе данных' };
      }

      const isExpired = new Date() > new Date(data.expires_at);
      
      return { 
        hasToken: true,
        isExpired,
        message: isExpired ? 'Токен истек, требуется обновление' : 'Токен активен'
      };
    } catch (error) {
      console.error('Error in getTokenStatus:', error);
      return { hasToken: false, message: 'Ошибка подключения' };
    }
  };

  // Новая функция для принудительного обновления токена
  const refreshToken = async (): Promise<boolean> => {
    try {
      setApiState(prev => ({ ...prev, isLoading: true }));
      
      const { data, error } = await supabase.functions.invoke('multilogin-token-manager', {
        method: 'POST'
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: "Токен обновлен",
          description: "Multilogin токен успешно обновлен и готов к работе"
        });
        return true;
      }
      
      return false;
    } catch (error: any) {
      toast({
        title: "Ошибка обновления токена",
        description: error.message,
        variant: "destructive"
      });
      return false;
    } finally {
      setApiState(prev => ({ ...prev, isLoading: false }));
    }
  };

  return {
    ...apiState,
    checkConnection,
    getProfiles,
    createProfile,
    startProfile,
    stopProfile,
    getTokenStatus,
    refreshToken,
    refresh: async () => {
      await checkConnection();
      if (apiState.isConnected) {
        await getProfiles();
      }
    }
  };
};