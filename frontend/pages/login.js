import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/components/auth/Login.module.css";
import { loginUser } from "../utils/api";
import { useAuth } from "../contexts/AuthContext";
import { RequireGuest } from "../components/auth/ProtectedRoute";

function LoginPage() {
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear previous errors when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await loginUser(formData);
      
      // Update auth context with user data and token
      const loginSuccess = login(response.user, response.token);
      
      if (loginSuccess) {
        setSuccess('¡Inicio de sesión exitoso! Redirigiendo...');
        
        // Redirect to dashboard after successful login
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        setError('Error al procesar el inicio de sesión. Inténtalo de nuevo.');
      }
      
    } catch (error) {
      console.error('Login error:', error);
      
      try {
        const errorData = JSON.parse(error.message);
        
        // Handle specific error types
        if (errorData.errors?.non_field_errors) {
          setError(errorData.errors.non_field_errors[0]);
        } else if (errorData.errors?.detail) {
          setError(errorData.errors.detail);
        } else if (errorData.status === 400) {
          setError('Credenciales inválidas. Verifica tu email/usuario y contraseña.');
        } else {
          setError('Error al iniciar sesión. Inténtalo de nuevo.');
        }
      } catch {
        setError('Error al iniciar sesión. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <RequireGuest>
      <Head>
        <title>Iniciar Sesión - SplashMy</title>
        <meta name="description" content="Inicia sesión en SplashMy para acceder a tus herramientas de IA" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          {/* Logo */}
          <div className={styles.logo}>
            <Link href="/">
              <h1>SplashMy</h1>
            </Link>
          </div>

          {/* Header */}
          <div className={styles.header}>
            <h2 className={styles.title}>Iniciar Sesión</h2>
            <p className={styles.subtitle}>
              Accede a tus herramientas de IA
            </p>
          </div>

          {/* Form */}
          <form className={styles.form} onSubmit={handleSubmit}>
            {/* Error Message */}
            {error && (
              <div className={styles.errorMessage}>
                <svg className={styles.errorIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}
            
            {/* Success Message */}
            {success && (
              <div className={styles.successMessage}>
                <svg className={styles.successIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {success}
              </div>
            )}

            <div className={styles.inputGroup}>
              <label htmlFor="identifier" className={styles.label}>
                Email o Usuario
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                required
                className={`${styles.input} ${error && formData.identifier === '' ? styles.inputError : ''}`}
                placeholder="tu@email.com o tu_usuario"
                value={formData.identifier}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className={`${styles.input} ${error && formData.password === '' ? styles.inputError : ''}`}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className={styles.options}>
              <label className={styles.checkbox}>
                <input type="checkbox" />
                <span className={styles.checkboxText}>Recordarme</span>
              </label>
              <Link href="/forgot-password" className={styles.forgotLink}>
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button 
              type="submit" 
              className={`${styles.submitButton} ${loading ? styles.loading : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className={styles.spinner} viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                    <path fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.75"/>
                  </svg>
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className={styles.divider}>
            <span>o</span>
          </div>

          {/* Social Login */}
          <div className={styles.socialLogin}>
            <button className={styles.socialButton}>
              <svg className={styles.socialIcon} viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </button>
          </div>

          {/* Register Link */}
          <div className={styles.registerLink}>
            ¿No tienes cuenta?{' '}
            <Link href="/register">
              Regístrate aquí
            </Link>
          </div>
        </div>

        {/* Background */}
        <div className={styles.background}></div>
      </div>
    </RequireGuest>
  );
}

export default function Login() {
  return <LoginPage />;
}
