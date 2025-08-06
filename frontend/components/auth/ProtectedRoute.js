import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

// Loading spinner component
const LoadingSpinner = () => (
  <div className="loading-container">
    <div className="spinner">
      <svg viewBox="0 0 24 24" className="spinner-svg">
        <circle 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4" 
          fill="none" 
          opacity="0.25"
        />
        <path 
          fill="currentColor" 
          d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" 
          opacity="0.75"
        />
      </svg>
      <p>Verificando autenticación...</p>
    </div>
    
    <style jsx>{`
      .loading-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
      }
      
      .spinner {
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
      }
      
      .spinner-svg {
        width: 40px;
        height: 40px;
        color: #00A6FB;
        animation: spin 1s linear infinite;
      }
      
      .spinner p {
        color: #6c757d;
        font-size: 0.875rem;
        margin: 0;
      }
      
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    `}</style>
  </div>
);

// Higher Order Component for protected routes
const ProtectedRoute = ({ children, redirectTo = '/login', requireAuth = true }) => {
  const { authenticated, loading } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Wait for auth context to finish loading
    if (loading) return;

    const checkAuth = () => {
      if (requireAuth && !authenticated) {
        // User needs to be authenticated but isn't
        router.replace(redirectTo);
        return;
      }
      
      if (!requireAuth && authenticated) {
        // User shouldn't be authenticated but is (e.g., login page when already logged in)
        router.replace('/dashboard');
        return;
      }
      
      // All checks passed
      setIsChecking(false);
    };

    // Small delay to prevent flash
    const timeoutId = setTimeout(checkAuth, 100);
    return () => clearTimeout(timeoutId);
  }, [authenticated, loading, requireAuth, router, redirectTo]);

  // Show loading while checking authentication
  if (loading || isChecking) {
    return <LoadingSpinner />;
  }

  // If we're here, auth check passed
  return children;
};

export default ProtectedRoute;

// Convenience components for common use cases
export const RequireAuth = ({ children, redirectTo }) => (
  <ProtectedRoute requireAuth={true} redirectTo={redirectTo}>
    {children}
  </ProtectedRoute>
);

export const RequireGuest = ({ children }) => (
  <ProtectedRoute requireAuth={false}>
    {children}
  </ProtectedRoute>
);
