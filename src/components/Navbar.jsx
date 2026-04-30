import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  History,
  LogOut,
  User,
  ChevronDown,
  Menu,
  X,
  Shield,
  Users,
} from 'lucide-react';
function NavLink({ to, icon: Icon, label, onClick }) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
        ${isActive
          ? 'bg-primary-600 text-white'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </Link>
  );
}

export default function Navbar() {
  const userProfile = { name: 'Démo Client', role: 'client' };
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {};

  const role = userProfile?.role || 'client';

  const clientLinks = [
    { to: '/dashboard', icon: Home, label: 'Tableau de bord' },
    { to: '/history', icon: History, label: 'Historique' },
  ];

  const agentLinks = [
    { to: '/agent', icon: Home, label: 'Tableau de bord' },
  ];

  const adminLinks = [
    { to: '/admin', icon: Shield, label: 'Dashboard' },
    { to: '/admin/transactions', icon: History, label: 'Transactions' },
    { to: '/admin/agents', icon: Users, label: 'Agents' },
  ];

  const links = role === 'admin' ? adminLinks : role === 'agent' ? agentLinks : clientLinks;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-gray-900 border-r border-gray-800 min-h-screen fixed left-0 top-0 z-40">
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-none">EasyPay BF</h1>
              <p className="text-gray-500 text-xs mt-0.5">
                {role === 'admin' ? 'Administration' : role === 'agent' ? 'Agent' : 'Client'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {links.map((link) => (
            <NavLink key={link.to} {...link} />
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">
                {userProfile?.name || 'Utilisateur'}
              </p>
              <p className="text-gray-500 text-xs truncate">
                {userProfile?.phone}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">E</span>
            </div>
            <span className="text-white font-bold">EasyPay BF</span>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-gray-400 hover:text-white"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-gray-950/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute top-16 left-0 right-0 bg-gray-900 border-b border-gray-800 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="space-y-1 mb-4">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  {...link}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </nav>
            <div className="border-t border-gray-800 pt-4">
              <div className="flex items-center gap-3 mb-3 px-2">
                <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{userProfile?.name || 'Utilisateur'}</p>
                  <p className="text-gray-500 text-xs">{userProfile?.phone}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-400/5 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
