import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  login: (username: string, passwordOrOtp: string, role?: UserRole) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (username: string, passwordOrOtp: string, role: UserRole = 'student'): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Secret Admin Backdoor (Simulates User/Pass: 123/123)
        // If specific admin credentials match, force admin role regardless of selected role
        if (username === '123' && passwordOrOtp === '123') {
          setUser({
            id: 'admin-001',
            name: 'God View Admin',
            role: 'admin',
          });
          resolve(true);
          return;
        }

        // Standard Simulation
        if (username && passwordOrOtp) {
          setUser({
            id: 'user-' + Math.random().toString(36).substr(2, 9),
            name: role === 'merchant' ? 'Merchant User' : 'Student User',
            role: role,
            phone: username
          });
          resolve(true);
        } else {
            resolve(false);
        }
      }, 800);
    });
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
