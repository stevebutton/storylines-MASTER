import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

const ROLE_RANK = { viewer: 1, user: 2, admin: 3 };

export default function ProtectedRoute({ children, requiredRole = 'user' }) {
  const { isAuthenticated, isLoadingAuth, profile } = useAuth();

  if (isLoadingAuth) return null;
  if (!isAuthenticated) return <Navigate to="/Login" replace />;
  if (profile && ROLE_RANK[profile.role] < ROLE_RANK[requiredRole]) {
    return <Navigate to="/" replace />;
  }

  return children;
}
