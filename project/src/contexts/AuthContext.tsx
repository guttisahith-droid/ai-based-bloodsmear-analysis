import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api from '../lib/api';

interface User {
  id: string;
  _id?: string; // MongoDB _id
  email: string;
  name?: string;
  role?: string;
}

interface Session {
  user: User;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name?: string, role?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await api.get('/api/me');
        setUser(response.data);
        setSession({ user: response.data });
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  };

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      const username = name || email.split('@')[0];
      console.log('Attempting registration with:', { username, email });

      const response = await api.post('/api/register', {
        username,
        email,
        password
      });

      console.log('Registration response:', response.data);

      const { token, user: userData } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      setSession({ user: userData });

      return { error: null };
    } catch (error: any) {
      console.error('Registration error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      let errorMessage = 'Registration failed';

      // Check for CORS errors
      if (
        error.message?.includes('CORS') ||
        error.message?.includes('Access-Control') ||
        (error.code === 'ERR_NETWORK' && !error.response)
      ) {
        errorMessage = 'CORS error: Backend is not allowing requests from this origin. Please check backend CORS configuration.';
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Cannot connect to server. Please ensure Flask backend is running on port 5001.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        if (error.response.data.details) {
          errorMessage += `: ${error.response.data.details}`;
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      return { error: new Error(errorMessage) };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await api.post('/api/login', { email, password });
      const { token, user: userData } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      setSession({ user: userData });

      return { error: null };
    } catch (error: any) {
      let errorMessage = 'Login failed';
      
      // Check for CORS errors
      if (
        error.message?.includes('CORS') ||
        error.message?.includes('Access-Control') ||
        (error.code === 'ERR_NETWORK' && !error.response)
      ) {
        errorMessage = 'CORS error: Backend is not allowing requests from this origin. Please check backend CORS configuration.';
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Cannot connect to server. Please ensure Flask backend is running on port 5001.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        if (error.response.data.details) {
          errorMessage += `: ${error.response.data.details}`;
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      return {
        error: new Error(errorMessage)
      };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error(
      'useAuth must be used within an AuthProvider. ' +
      'Make sure your app is wrapped with <AuthProvider> in your component tree.'
    );
  }
  return context;
}
