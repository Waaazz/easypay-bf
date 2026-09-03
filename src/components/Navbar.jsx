import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, History, LogOut, User, Menu, X,
  Shield, Users, LayoutDashboard, ArrowDownCircle,
  ArrowUpCircle, ClipboardList, Sun, Moon, UserCog, Settings,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { setAgentAvailability } from '../hooks/useTransactions';

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
          ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/40'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/80'
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
      {title && <p className="text-gray-500 dark:text-gray-600 text-xs font-semibold uppercase tracking-wider px-4 pb-1 pt-3">{title}</p>}
      {children}
    </div>
  );
}

export default function Navbar() {
  const { user, userProfile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Détection du rôle : auth en priorité, sinon basé sur l'URL. Layout/Navbar
  // ne servent plus qu'à l'admin, l'agent et le SuperAgent — le client a sa
  // propre coquille légère (ClientHeader + ClientBottomNav), sans sidebar.
  const authRole = userProfile?.role;
  const isAdminPath = location.pathname.startsWith('/admin');
  const isAgentPath = location.pathname.startsWith('/agent');
  const isSuperAgentPath = location.pathname.startsWith('/superagent');
  // /admin a toujours la priorité pour l'affichage de la sidebar (le contrôle d'accès réel est fait par ProtectedRoute)
  const role = isAdminPath ? 'admin' : (authRole || (isAgentPath ? 'agent' : isSuperAgentPath ? 'superagent' : 'client'));

  // Un admin adjoint (isPrincipal === false) n'a pas accès au Dashboard ni à
  // la gestion des autres admins — cohérent avec les règles Firestore.
  const isPrincipalAdmin = userProfile?.isPrincipal !== false;

  const displayName = userProfile?.name || user?.displayName || user?.phoneNumber || 'Utilisateur';
  const displayPhone = userProfile?.phone || '';

  const roleLoginPath = { agent: '/agent/login', admin: '/admin/login', superagent: '/superagent/login' };

  const handleLogout = async () => {
    // Si c'est un agent : le retirer des actifs avant de déconnecter
    if (role === 'agent' && userProfile) {
      const ops = userProfile.operators || {};
      if (Object.keys(ops).length > 0) {
        try {
          await setAgentAvailability(userProfile.uid, false);
        } catch (_) {}
      }
    }
    await logout();
    navigate(roleLoginPath[role] || '/');
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
      <NavLink to="/agent"        icon={LayoutDashboard} label="Tableau de bord" exact />
      <NavLink to="/agent/orders" icon={ClipboardList}   label="Commandes"       />
    </NavSection>
  );

  const superAgentNav = (
    <NavSection>
      <NavLink to="/superagent" icon={Users} label="Mon équipe" exact />
    </NavSection>
  );

  const adminNav = (
    <>
      {isPrincipalAdmin && (
        <NavSection title="Général">
          <NavLink to="/admin"              icon={LayoutDashboard}  label="Dashboard"     exact />
        </NavSection>
      )}
      <NavSection title="Activité">
        <NavLink to="/admin/transactions" icon={ClipboardList}    label="Transactions"  />
        <NavLink to="/admin/deposits"     icon={ArrowDownCircle}  label="Dépôts"        />
        <NavLink to="/admin/withdrawals"  icon={ArrowUpCircle}    label="Retraits"      />
      </NavSection>
      <NavSection title="Équipe">
        <NavLink to="/admin/superagents"  icon={UserCog}          label="Superviseurs"  />
        <NavLink to="/admin/agents"       icon={Users}            label="Agents"        />
        <NavLink to="/admin/caissiers"    icon={Users}            label="Caissiers"     />
      </NavSection>
      {isPrincipalAdmin && (
        <NavSection title="Administration">
          <NavLink to="/admin/admins" icon={Shield} label="Admins" />
        </NavSection>
      )}
      <NavSection title="Compte">
        <NavLink to="/admin/account" icon={Settings} label="Mon compte" />
      </NavSection>
    </>
  );

  const navContent = role === 'admin' ? adminNav
    : role === 'agent' ? agentNav
    : role === 'superagent' ? superAgentNav
    : clientNav;

  const roleLabel = role === 'admin' ? (isPrincipalAdmin ? 'Administration' : 'Admin adjoint')
    : role === 'agent' ? 'Agent'
    : role === 'superagent' ? 'Superviseur'
    : 'Client';

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-gradient-to-b from-gray-50 dark:from-gray-900 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow-lg shadow-primary-900/50 ring-1 ring-white/10">
            <img src="/icon-192.png" alt="ApollonPay" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-gray-900 dark:text-white font-bold text-lg leading-none">ApollonPay</h1>
            <span className="inline-block mt-1.5 text-primary-600 dark:text-primary-400 text-[10px] font-semibold uppercase tracking-wider bg-primary-500/10 border border-primary-500/20 rounded-full px-2 py-0.5">
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto space-y-1">
        {navContent}
      </nav>

      {/* Profil + Déconnexion */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 dark:text-white font-medium text-sm truncate">{displayName}</p>
            {displayPhone && <p className="text-gray-500 text-xs truncate">{displayPhone}</p>}
          </div>
        </div>

        {role === 'admin' && (
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 mb-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/80 rounded-lg transition-all duration-200"
          >
            <span className="flex items-center gap-2 text-sm">
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              Mode {theme === 'dark' ? 'sombre' : 'clair'}
            </span>
            <span className="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full bg-gray-300 dark:bg-gray-700 transition-colors">
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </span>
          </button>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/5 rounded-lg transition-all duration-200"
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
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-screen fixed left-0 top-0 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/icon-192.png" alt="ApollonPay" className="w-full h-full object-cover" />
            </div>
            <span className="text-gray-900 dark:text-white font-bold">ApollonPay</span>
          </div>
          <div className="flex items-center gap-1">
            {role === 'admin' && (
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/40 dark:bg-gray-950/80 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute top-16 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <nav className="space-y-1 mb-4" onClick={() => setMobileOpen(false)}>
              {navContent}
            </nav>
            <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
              <div className="flex items-center gap-3 mb-3 px-2">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-gray-900 dark:text-white text-sm font-medium">{displayName}</p>
                  {displayPhone && <p className="text-gray-500 text-xs">{displayPhone}</p>}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/5 rounded-lg"
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
