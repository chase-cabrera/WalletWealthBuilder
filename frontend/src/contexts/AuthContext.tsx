import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import authService, { User, LoginCredentials, RegisterData } from '../services/authService';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (user: User | string, isAuthenticated?: boolean) => void;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<User>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('Initializing auth context');
        
        // Check if user is already logged in
        const currentUser = authService.getCurrentUser();
        
        if (currentUser) {
          console.log('User found in localStorage:', currentUser);
          setIsAuthenticated(true);
          setUser(currentUser);
          
          // Optionally refresh user data from server
          try {
            const refreshedUser = await authService.refreshUserData();
            if (refreshedUser) {
              console.log('User data refreshed:', refreshedUser);
              setUser(refreshedUser);
            }
          } catch (refreshError) {
            console.error('Error refreshing user data:', refreshError);
          }
        } else {
          console.log('No user found in localStorage');
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError('Failed to initialize authentication');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Updated login function to accept either a User object or email string
  const login = (userOrEmail: User | string, isAuth: boolean = true) => {
    if (typeof userOrEmail === 'string') {
      // If it's a string, assume it's an email and try to login
      setLoading(true);
      setError(null);
      
      authService.login({ email: userOrEmail as string, password: '' })
        .then(user => {
          setIsAuthenticated(true);
          setUser(user);
        })
        .catch(err => {
          console.error('Login error:', err);
          setError('Login failed');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // If it's a User object, just set it directly
      setIsAuthenticated(isAuth);
      setUser(userOrEmail as User);
    }
  };

  const register = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      console.log('AuthContext: Attempting registration');
      // Generate a username from the email (before the @ symbol)
      const username = email.split('@')[0];
      const registeredUser = await authService.register({ 
        username, 
        email, 
        password, 
        firstName, 
        lastName 
      });
      console.log('AuthContext: Registration successful:', registeredUser);
      setIsAuthenticated(true);
      setUser(registeredUser);
      return registeredUser;
    } catch (error) {
      console.error('AuthContext: Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    console.log('AuthContext: Logging out');
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  const value = {
    isAuthenticated,
    user,
    login,
    register,
    logout,
    loading,
    error
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext; 