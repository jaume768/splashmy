import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  isAuthenticated, 
  getCurrentUser, 
  getAuthToken, 
  logoutUser, 
  fetchUserProfile 
} from '../utils/api';

// Create the authentication context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// AuthProvider component to wrap the app
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const router = useRouter();

  // Initialize authentication state on component mount
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const authToken = getAuthToken();
        const currentUser = getCurrentUser();
        
        if (authToken && currentUser) {
          setToken(authToken);
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear invalid data
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = (userData, authToken) => {
    try {
      setUser(userData);
      setToken(authToken);
      
      // Store in localStorage
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout API to invalidate token on server
      await logoutUser();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Always clear local state and storage
      setUser(null);
      setToken(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      
      // Redirect to login page
      router.push('/login');
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      if (!token) return false;
      
      const updatedUser = await fetchUserProfile();
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return true;
    } catch (error) {
      console.error('Error refreshing user:', error);
      // If refresh fails, might be an invalid token
      logout();
      return false;
    }
  };

  // Check if user is authenticated
  const authenticated = isAuthenticated() && !!user && !!token;

  // Context value
  const value = {
    user,
    token,
    loading,
    authenticated,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
