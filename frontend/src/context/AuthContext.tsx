// src/context/AuthContext.tsx
import { createContext } from 'react';
import type { User } from '../types/auth';

export interface AuthContextType {
  user: User | null;
  login: (identifier: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (updatedData: Partial<User>) => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSupervisor: boolean;
  isInstructor: boolean;
  isTrainee: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);