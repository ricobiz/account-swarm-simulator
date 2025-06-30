
import React from 'react';
import { EnhancedRPADashboard } from '@/components/rpa/EnhancedRPADashboard';

const RPA = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <EnhancedRPADashboard />
      </div>
    </div>
  );
};

export default RPA;
