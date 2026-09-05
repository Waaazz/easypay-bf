import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import InstallPrompt from './components/InstallPrompt';
import ProtectedRoute from './components/ProtectedRoute';
import { useTheme } from './contexts/ThemeContext';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Terms from './pages/Terms';
import ClientDashboard from './pages/client/Dashboard';
import Deposit from './pages/client/Deposit';
import Withdrawal from './pages/client/Withdrawal';
import CanalPlus from './pages/client/CanalPlus';
import Canalbox from './pages/client/Canalbox';
import History from './pages/client/History';
import AgentLogin from './pages/agent/Login';
import AgentDashboard from './pages/agent/Dashboard';
import AgentOrders from './pages/agent/Orders';
import OrderDetail from './pages/agent/OrderDetail';
import AgentAccount from './pages/agent/Account';
import CaissierLogin from './pages/caissier/Login';
import CaissierDashboard from './pages/caissier/Dashboard';
import CaissierHistory from './pages/caissier/History';
import CaissierAccount from './pages/caissier/Account';
import SuperAgentLogin from './pages/superagent/Login';
import SuperAgentDashboard from './pages/superagent/Dashboard';
import SuperAgentAccount from './pages/superagent/Account';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminTransactions from './pages/admin/Transactions';
import AdminAgents from './pages/admin/Agents';
import AdminCaissiers from './pages/admin/Caissiers';
import AdminSuperAgents from './pages/admin/SuperAgents';
import AdminAdmins from './pages/admin/Admins';
import AdminAccount from './pages/admin/Account';

// Le choix clair/sombre appartient aux espaces internes (admin/agent/
// superagent), chacun avec son propre toggle dans la sidebar. Les pages
// client-facing (accueil, historique, compte...) sont claires en permanence.
function ThemeSync() {
  const { theme } = useTheme();
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    const isStaffRoute = path.startsWith('/admin') || path.startsWith('/agent') || path.startsWith('/superagent');
    const dark = isStaffRoute && theme === 'dark';
    document.documentElement.classList.toggle('dark', dark);
  }, [theme, location.pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeSync />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/cgu" element={<Terms />} />
        <Route path="/agent/login" element={<AgentLogin />} />
        <Route path="/caissier/login" element={<CaissierLogin />} />
        <Route path="/superagent/login" element={<SuperAgentLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Client routes — accessibles en invité (session anonyme), le
            contenu s'adapte lui-même selon que le visiteur est inscrit ou non */}
        <Route path="/deposit"    element={<Deposit />} />
        <Route path="/withdrawal" element={<Withdrawal />} />
        <Route path="/canal-plus" element={<CanalPlus />} />
        <Route path="/canalbox" element={<Canalbox />} />
        <Route path="/dashboard" element={<ClientDashboard />} />
        <Route path="/history"   element={<History />} />

        {/* Agent routes — réservé aux agents */}
        <Route path="/agent" element={
          <ProtectedRoute allowedRoles={['agent']}>
            <AgentDashboard />
          </ProtectedRoute>
        } />
        <Route path="/agent/orders" element={
          <ProtectedRoute allowedRoles={['agent']}>
            <AgentOrders />
          </ProtectedRoute>
        } />
        <Route path="/agent/order/:id" element={
          <ProtectedRoute allowedRoles={['agent']}>
            <OrderDetail />
          </ProtectedRoute>
        } />
        <Route path="/agent/compte" element={
          <ProtectedRoute allowedRoles={['agent']}>
            <AgentAccount />
          </ProtectedRoute>
        } />

        {/* Caissier routes — réservé aux caissiers */}
        <Route path="/caissier" element={
          <ProtectedRoute allowedRoles={['caissier']}>
            <CaissierDashboard />
          </ProtectedRoute>
        } />
        <Route path="/caissier/historique" element={
          <ProtectedRoute allowedRoles={['caissier']}>
            <CaissierHistory />
          </ProtectedRoute>
        } />
        <Route path="/caissier/compte" element={
          <ProtectedRoute allowedRoles={['caissier']}>
            <CaissierAccount />
          </ProtectedRoute>
        } />

        {/* SuperAgent routes — réservé aux SuperAgents, lecture seule sur leur équipe */}
        <Route path="/superagent" element={
          <ProtectedRoute allowedRoles={['superagent']}>
            <SuperAgentDashboard />
          </ProtectedRoute>
        } />
        <Route path="/superagent/compte" element={
          <ProtectedRoute allowedRoles={['superagent']}>
            <SuperAgentAccount />
          </ProtectedRoute>
        } />

        {/* Admin routes — réservé aux admins */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/transactions" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminTransactions />
          </ProtectedRoute>
        } />
        <Route path="/admin/deposits" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminTransactions initialType="deposit" />
          </ProtectedRoute>
        } />
        <Route path="/admin/withdrawals" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminTransactions initialType="withdrawal" />
          </ProtectedRoute>
        } />
        <Route path="/admin/agents" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminAgents />
          </ProtectedRoute>
        } />
        <Route path="/admin/caissiers" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminCaissiers />
          </ProtectedRoute>
        } />
        <Route path="/admin/superagents" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminSuperAgents />
          </ProtectedRoute>
        } />
        <Route path="/admin/admins" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminAdmins />
          </ProtectedRoute>
        } />
        <Route path="/admin/account" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminAccount />
          </ProtectedRoute>
        } />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <InstallPrompt />
    </BrowserRouter>
  );
}
