// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Roles that are allowed to access this route */
  allowedRoles: UserRole[];
}

const TUTOR_ROLES: UserRole[] = ['supervisor', 'admin', 'instructor'];
const TRAINEE_ROLES: UserRole[] = ['trainee'];

/**
 * ProtectedRoute guards a route by:
 *  1. Redirecting unauthenticated users to /login.
 *  2. Redirecting authenticated users whose role is NOT in `allowedRoles`
 *     to the correct dashboard for their role — so a trainee can never
 *     accidentally land on the tutor dashboard and vice-versa.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // 1. Not logged in → send to login, preserving the intended destination
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Logged in but wrong role
  if (!allowedRoles.includes(user.role)) {
    // Trainee trying to access a tutor-only route → redirect to trainee dashboard
    if (TRAINEE_ROLES.includes(user.role)) {
      return <Navigate to="/dashboard" replace />;
    }
    // Tutor/admin/supervisor trying to access trainee-only route → redirect to tutor dashboard
    if (TUTOR_ROLES.includes(user.role)) {
      return <Navigate to="/tutor/dashboard" replace />;
    }
    // Completely unknown role → back to login
    return <Navigate to="/login" replace />;
  }

  // 3. All checks passed
  return <>{children}</>;
};

export default ProtectedRoute;