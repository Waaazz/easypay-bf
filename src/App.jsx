import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import InstallPrompt from './components/InstallPrompt';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ClientDashboard from './pages/client/Dashboard';
import Deposit from './pages/client/Deposit';
import Withdrawal from './pages/client/Withdrawal';
import CanalPlus from './pages/client/CanalPlus';
import History from './pages/client/History';
import AgentLogin from './pages/agent/Login';
import AgentDashboard from './pages/agent/Dashboard';
import AgentOrders from './pages/agent/Orders';
import OrderDetail from './pages/agent/OrderDetail';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminTransactions from './pages/admin/Transactions';
import AdminAgents from './pages/admin/Agents';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/agent/login" element={<AgentLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Client routes */}
        <Route path="/deposit"    element={<Deposit />} />
        <Route path="/withdrawal" element={<Withdrawal />} />
        <Route path="/canal-plus" element={<CanalPlus />} />
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['client']}>
            <ClientDashboard />
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute allowedRoles={['client']}>
            <History />
          </ProtectedRoute>
        } />

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

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <InstallPrompt />
    </BrowserRouter>
  );
}
