import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, History, LogOut, User, Menu, X,
  Shield, Users, LayoutDashboard, ArrowDownCircle,
  ArrowUpCircle, ClipboardList,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

function NavLink({ to, icon: Icon, label, onClick, exact }) {
  const location = useLocation();
  const isActive = exact
    ? location.pathname === to
    : location.pathname === to || location.pathname.startsWith(to + '/');

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
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}

function NavSection({ title, children }) {
  return (
    <div className="space-y-1">
      {title && <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider px-4 pb-1 pt-3">{title}</p>}
      {children}
    </div>
  );
}

export default function Navbar() {
  const { user, userProfile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Détection du rôle : auth en priorité, sinon basé sur l'URL
  const authRole = userProfile?.role;
  const isAdminPath = location.pathname.startsWith('/admin');
  const isAgentPath = location.pathname.startsWith('/agent');
  // /admin a toujours la priorité (pas encore de login admin dédié)
  const role = isAdminPath ? 'admin' : (authRole || (isAgentPath ? 'agent' : 'client'));

  const displayName = userProfile?.name || user?.displayName || user?.phoneNumber || 'Utilisateur';
  const displayPhone = userProfile?.phone || '';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // ── Liens par rôle ────────────────────────────────────────────────────────
  const clientNav = (
    <NavSection>
      <NavLink to="/"        icon={Home}    label="Accueil"    exact />
      <NavLink to="/history" icon={History} label="Historique" />
    </NavSection>
  );

  const agentNav = (
    <NavSection>
      <NavLink to="/agent"             icon={LayoutDashboard} label="Tableau de bord" exact />
      <NavLink to="/agent/orders"      icon={ClipboardList}   label="Commandes"       />
    </NavSection>
  );

  const adminNav = (
    <>
      <NavSection title="Général">
        <NavLink to="/admin"              icon={LayoutDashboard}  label="Dashboard"     exact />
      </NavSection>
      <NavSection title="Activité">
        <NavLink to="/admin/transactions" icon={ClipboardList}    label="Transactions"  />
        <NavLink to="/admin/deposits"     icon={ArrowDownCircle}  label="Dépôts"        />
        <NavLink to="/admin/withdrawals"  icon={ArrowUpCircle}    label="Retraits"      />
      </NavSection>
      <NavSection title="Équipe">
        <NavLink to="/admin/agents"       icon={Users}            label="Agents"        />
      </NavSection>
    </>
  );

  const navContent = role === 'admin' ? adminNav : role === 'agent' ? agentNav : clientNav;

  const roleLabel = role === 'admin' ? 'Administration' : role === 'agent' ? 'Agent' : 'Client';

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">EasyPay BF</h1>
            <p className="text-gray-500 text-xs mt-0.5">{roleLabel}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto space-y-1">
        {navContent}
      </nav>

      {/* Profil + Déconnexion */}
      <div className="p-4 border-t border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm truncate">{displayName}</p>
            {displayPhone && <p className="text-gray-500 text-xs truncate">{displayPhone}</p>}
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
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-gray-900 border-r border-gray-800 min-h-screen fixed left-0 top-0 z-40">
        {sidebarContent}
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
        <div
          className="lg:hidden fixed inset-0 z-30 bg-gray-950/80 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute top-16 left-0 right-0 bg-gray-900 border-b border-gray-800 p-4 max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <nav className="space-y-1 mb-4" onClick={() => setMobileOpen(false)}>
              {navContent}
            </nav>
            <div className="border-t border-gray-800 pt-4">
              <div className="flex items-center gap-3 mb-3 px-2">
                <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{displayName}</p>
                  {displayPhone && <p className="text-gray-500 text-xs">{displayPhone}</p>}
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
