import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { User, UserRole, Category } from '../types';

interface AuthContextType {
  user: User | null;
  login: (username: string, passwordOrOtp: string, role?: UserRole, university?: string, category?: Category) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  updateUserUniversity: (university: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize from localStorage if available
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('unimonday_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (
    username: string,
    passwordOrOtp: string,
    role: UserRole = 'student',
    university: string = 'UDSM',
    category?: Category
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Secret Admin Backdoor (Simulates User/Pass: 123/123)
        // If specific admin credentials match, force admin role regardless of selected role
        if (username === '123' && passwordOrOtp === '123') {
          const adminUser: User = {
            id: 'admin-001',
            name: 'God View Admin',
            role: 'admin',
          };
          setUser(adminUser);
          localStorage.setItem('unimonday_user', JSON.stringify(adminUser));
          resolve(true);
          return;
        }

        // Test Student Account
        if (username === 'student@unimonday.com' && passwordOrOtp === 'password123') {
           const studentUser: User = {
             id: 'student-test-001',
             name: 'Test Student',
             role: 'student',
             phone: '0700000000',
             university: 'UDSM',
           };
           setUser(studentUser);
           localStorage.setItem('unimonday_user', JSON.stringify(studentUser));
           resolve(true);
           return;
        }

        // Test Vendor Account
        if (username === 'vendor@unimonday.com' && passwordOrOtp === 'password123') {
           const vendorUser: User = {
             id: 'vendor-test-001',
             name: "Mama Shavu's Kitchen",
             role: 'merchant',
             phone: '0700000001',
             university: 'UDSM',
             businessId: '1' // Linking to Mama Shavu
           };
           setUser(vendorUser);
           localStorage.setItem('unimonday_user', JSON.stringify(vendorUser));
           resolve(true);
           return;
        }

        // Standard Simulation
        if (username && passwordOrOtp) {
          const newUser = {
            id: 'user-' + Math.random().toString(36).substr(2, 9),
            name: role === 'merchant' ? 'Merchant User' : 'Student User',
            role: role,
            phone: username,
            university: university,
            category: category
          };
          console.log('AuthContext: Logging in user:', newUser);
          setUser(newUser);
          localStorage.setItem('unimonday_user', JSON.stringify(newUser));
          resolve(true);
        } else {
            console.log('AuthContext: Login failed for', username);
            resolve(false);
        }
      }, 800);
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('unimonday_user');
  };

  const updateUserUniversity = (university: string) => {
    if (user) {
      const updatedUser = { ...user, university };
      setUser(updatedUser);
      localStorage.setItem('unimonday_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, updateUserUniversity }}>
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
