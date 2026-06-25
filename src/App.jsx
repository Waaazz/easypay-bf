import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import InstallPrompt from './components/InstallPrompt';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Deposit from './pages/client/Deposit';
import Withdrawal from './pages/client/Withdrawal';
import History from './pages/client/History';
import AgentLogin from './pages/agent/Login';
import AgentDashboard from './pages/agent/Dashboard';
import AgentOrders from './pages/agent/Orders';
import OrderDetail from './pages/agent/OrderDetail';
import AdminDashboard from './pages/admin/Dashboard';
import AdminTransactions from './pages/admin/Transactions';
import AdminAgents from './pages/admin/Agents';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home & Auth */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        {/* Client routes */}
        <Route path="/deposit" element={<Deposit />} />
        <Route path="/withdrawal" element={<Withdrawal />} />
        <Route path="/history" element={<History />} />

        {/* Agent routes */}
        <Route path="/agent/login" element={<AgentLogin />} />
        <Route path="/agent" element={<AgentDashboard />} />
        <Route path="/agent/orders" element={<AgentOrders />} />
        <Route path="/agent/order/:id" element={<OrderDetail />} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/transactions" element={<AdminTransactions />} />
        <Route path="/admin/deposits"     element={<AdminTransactions initialType="deposit" />} />
        <Route path="/admin/withdrawals"  element={<AdminTransactions initialType="withdrawal" />} />
        <Route path="/admin/agents" element={<AdminAgents />} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <InstallPrompt />
    </BrowserRouter>
  );
}
