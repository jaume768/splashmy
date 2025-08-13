import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { fetchUserProfile } from '../../utils/api';

export default function OAuthCallback() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!router.isReady) return;
    const { token, next } = router.query || {};
    const dest = typeof next === 'string' && next ? next : '/dashboard';

    if (!token || typeof token !== 'string') {
      setError('No se recibió el token de autenticación.');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        // Persist token so api.js includes it in Authorization header
        if (typeof window !== 'undefined') {
          localStorage.setItem('authToken', token);
        }
        // Fetch user profile and hydrate auth context
        const user = await fetchUserProfile();
        login(user, token);
        router.replace(dest);
      } catch (e) {
        console.error('OAuth callback error:', e);
        setError('No se pudo completar el inicio de sesión con Google.');
      } finally {
        setLoading(false);
      }
    })();
  }, [router.isReady]);

  return (
    <div style={{minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12}}>
      {loading ? (
        <>
          <svg width="32" height="32" viewBox="0 0 24 24" style={{animation: 'spin 1s linear infinite'}}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
            <path fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.75"/>
          </svg>
          <p>Conectando con Google...</p>
          <style jsx>{`
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          `}</style>
        </>
      ) : error ? (
        <>
          <h3>Algo salió mal</h3>
          <p style={{color: '#e11d48'}}>{error}</p>
          <button onClick={() => router.replace('/login')} style={{padding: '8px 14px'}}>Volver al inicio de sesión</button>
        </>
      ) : (
        <p>Redirigiendo...</p>
      )}
    </div>
  );
}
