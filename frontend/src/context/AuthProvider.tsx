// src/context/AuthProvider.tsx
import React, { useState, type ReactNode } from 'react';
import { AuthContext } from './AuthContext';
import type { User } from '../types/auth';
import { login as apiLogin, logout as apiLogout } from '../services/authService';

interface Props {
  children: ReactNode;
}

const getInitialUser = (): User | null => {
  try {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');
    if (storedUser && token) {
      return JSON.parse(storedUser);
    }
  } catch {
    localStorage.removeItem('user');
  }
  return null;
};

export const AuthProvider: React.FC<Props> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getInitialUser);

  // login now accepts identifier (email or username) and password
  const login = async (identifier: string, password: string): Promise<User> => {
    const data = await apiLogin({ identifier, password });
    setUser(data.user);
    return data.user;
  };

  const logout = async (): Promise<void> => {
    await apiLogout();
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  };

  const updateUser = (updatedData: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updatedData };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const value = {
    user,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isSupervisor: user?.role === 'supervisor',
    isInstructor: user?.role === 'instructor',
    isTrainee: user?.role === 'trainee',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};