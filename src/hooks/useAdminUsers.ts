
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface AdminUserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'premium' | 'basic';
  subscription_status: 'active' | 'inactive' | 'trial' | 'expired';
  subscription_tier: string | null;
  subscription_end: string | null;
  trial_end: string | null;
  accounts_limit: number;
  scenarios_limit: number;
  created_at: string;
  updated_at: string;
}

export const useAdminUsers = () => {
  const [users, setUsers] = useState<AdminUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchUsers = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить пользователей",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'premium' | 'basic') => {
    try {
      // Use secure edge function for admin operations
      const { data: result, error } = await supabase.functions.invoke('secure-admin-actions', {
        body: {
          action: 'UPDATE_ROLE',
          targetUserId: userId,
          newRole: newRole
        }
      });

      if (error) throw error;

      if (!result.success) {
        throw new Error(result.error || 'Failed to update role');
      }
      
      setUsers(prev => prev.map(u => u.id === userId ? result.data : u));
      
      toast({
        title: "Успешно",
        description: `Роль пользователя изменена на ${newRole}`
      });
      
      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось изменить роль пользователя",
        variant: "destructive"
      });
      return { data: null, error };
    }
  };

  const updateUserLimits = async (userId: string, accountsLimit: number, scenariosLimit: number) => {
    try {
      // Use secure edge function for admin operations
      const { data: result, error } = await supabase.functions.invoke('secure-admin-actions', {
        body: {
          action: 'UPDATE_LIMITS',
          targetUserId: userId,
          accountsLimit,
          scenariosLimit
        }
      });

      if (error) throw error;

      if (!result.success) {
        throw new Error(result.error || 'Failed to update limits');
      }
      
      setUsers(prev => prev.map(u => u.id === userId ? result.data : u));
      
      toast({
        title: "Успешно",
        description: "Лимиты пользователя обновлены"
      });
      
      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Error updating user limits:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить лимиты пользователя",
        variant: "destructive"
      });
      return { data: null, error };
    }
  };

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  return {
    users,
    loading,
    updateUserRole,
    updateUserLimits,
    refetch: fetchUsers
  };
};
