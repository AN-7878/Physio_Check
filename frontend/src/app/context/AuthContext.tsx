
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'patient' | 'physiotherapist';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  physio_id?: string | null;
  onboarded?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, rememberMe?: boolean, ) => Promise<void>;
  signup: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  updateProfile: (name: string, email: string) => Promise<void>;
  linkPhysio: (physioId: string) => void;
  setOnboarded: (onboarded: boolean) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const signup = async (name: string, email: string, password: string, role: UserRole) => {
    try {
      const response = await fetch('https://physio-check.onrender.com/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      const newUser: User = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role,
        physio_id: data.user.physio_id,
        onboarded: data.user.onboarded || false
      };
      
      // Store user data
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string, rememberMe = false) => {
    try {
      const response = await fetch('https://physio-check.onrender.com/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      const loggedInUser: User = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role as UserRole,
        physio_id: data.user.physio_id ?? null,
        onboarded: data.user.onboarded || false
      };
      
      setUser(loggedInUser);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }
    } catch (error) {
       console.error('Login error:', error);
       throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    setUser(null);
  };

  const updateProfile = async (name: string, email: string) => {
    if (!user) return;

    try {
      const response = await fetch('https://physio-check.onrender.com/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: user.id, name, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Profile update failed');
      }

      const updatedUser: User = {
        ...user,
        name: data.user.name,
        email: data.user.email,
        physio_id: data.user.physio_id,
        onboarded: data.user.onboarded
      };

      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const linkPhysio = (physioId: string) => {
    if (!user) return;
    const updatedUser = { ...user, physio_id: physioId };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const setOnboarded = (onboarded: boolean) => {
    if (!user) return;
    const updatedUser = { ...user, onboarded };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        updateProfile,
        linkPhysio,
        setOnboarded,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}