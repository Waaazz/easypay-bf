import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import Home from './pages/Home';
import Deposit from './pages/client/Deposit';
import Withdrawal from './pages/client/Withdrawal';
import History from './pages/client/History';
import AgentDashboard from './pages/agent/Dashboard';
import OrderDetail from './pages/agent/OrderDetail';
import AdminDashboard from './pages/admin/Dashboard';
import AdminTransactions from './pages/admin/Transactions';
import AdminAgents from './pages/admin/Agents';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home */}
        <Route path="/" element={<Home />} />

        {/* Client routes */}
        <Route path="/deposit" element={<Deposit />} />
        <Route path="/withdrawal" element={<Withdrawal />} />
        <Route path="/history" element={<History />} />

        {/* Agent routes */}
        <Route path="/agent" element={<AgentDashboard />} />
        <Route path="/agent/order/:id" element={<OrderDetail />} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/transactions" element={<AdminTransactions />} />
        <Route path="/admin/agents" element={<AdminAgents />} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
