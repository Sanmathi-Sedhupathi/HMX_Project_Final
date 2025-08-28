import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  verifyToken: () => Promise<boolean>;
  isLoading: boolean; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const verifyToken = async (): Promise<boolean> => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      return false;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      setIsAuthenticated(true);
        setIsLoading(false);
        return true;
      } else {
        // Token is invalid, clear it
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('token');
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      return false;
    }
  };

  useEffect(() => {
    verifyToken();
  }, []);

const login = async (email: string, password: string) => {
  setIsLoading(true); // Start loading
  try {
    const response = await authService.login({ email, password });
    if (response.token) {
      localStorage.setItem('token', response.token);
    }
    // Only set isAuthenticated after verifyToken
    const verified = await verifyToken();
    setIsAuthenticated(verified);
  } catch (error) {
    setIsAuthenticated(false);
    setUser(null);
    throw error;
  } finally {
    setIsLoading(false); // Done loading
  }
};

const register = async (data: any) => {
  try {
    const response = await authService.register(data);
    // Verify token and get user data
    const verified = await verifyToken();
    setIsAuthenticated(verified); // Only set true if verified
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
};

  const logout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
  };



  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, register, logout, verifyToken,isLoading }}>
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