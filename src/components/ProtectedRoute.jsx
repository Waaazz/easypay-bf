import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  // Une session anonyme (auto-créée pour le flux invité) ne compte pas
  // comme authentifiée pour les routes protégées.
  if (!user || (allowedRoles && user.isAnonymous)) {
    const loginPath = allowedRoles?.includes('admin')
      ? '/admin/login'
      : allowedRoles?.includes('agent')
        ? '/agent/login'
        : '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (allowedRoles && userProfile && !allowedRoles.includes(userProfile.role)) {
    // Redirect to appropriate dashboard based on role
    const role = userProfile.role;
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'agent') return <Navigate to="/agent" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
