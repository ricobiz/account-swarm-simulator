
import { useContext } from 'react';
import { AuthContext } from '@/components/AuthProvider';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthProvider } from '@/components/AuthProvider';
