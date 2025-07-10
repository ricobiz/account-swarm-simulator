
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProcessMonitorProvider } from './components/ProcessMonitorProvider';
import Auth from './pages/Auth';
import VisualRPA from './pages/VisualRPA';
import TestFunctionality from './pages/TestFunctionality';
import Index from './pages/Index';
import Accounts from './pages/Accounts';
import ScenarioLaunch from './pages/ScenarioLaunch';
import Monitoring from './pages/Monitoring';
import Proxies from './pages/Proxies';
import Admin from './pages/Admin';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-900">
        <AuthProvider>
          <ProcessMonitorProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/visual-rpa" element={<VisualRPA />} />
              <Route path="/test" element={<TestFunctionality />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/scenario-launch" element={<ScenarioLaunch />} />
              <Route path="/monitoring" element={<Monitoring />} />
              <Route path="/proxies" element={<Proxies />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/" element={<Index />} />
            </Routes>
          </ProcessMonitorProvider>
        </AuthProvider>
      </div>
    </Router>
  );
}

export default App;
