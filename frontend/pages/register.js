import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../styles/components/auth/Register.module.css";
import { registerUser, buildApiUrl } from "../utils/api";
import { useAuth } from "../contexts/AuthContext";
import { RequireGuest } from "../components/auth/ProtectedRoute";
import EmailVerificationModal from "../components/auth/EmailVerificationModal";

function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const { login } = useAuth();
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const check = () => setCompact(window.innerHeight < 720);
    // Run once on mount
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Note: GIS script not needed for server-side OAuth code flow

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear field-specific error when user starts typing
    if (errors[e.target.name]) {
      setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    }
  };

  // Google Sign-Up/Login flow using OAuth Authorization Code (server-side)
  const handleGoogleLogin = async () => {
    try {
      setErrors({});
      setGoogleLoading(true);
      const next = '/dashboard';
      const url = buildApiUrl(`/api/v1/auth/google/start/?${new URLSearchParams({ next })}`);
      window.location.href = url;
    } catch (e) {
      console.error('Google login error:', e);
      setGoogleLoading(false);
      setErrors({ general: 'No se pudo continuar con Google' });
    }
  };
  

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El formato del correo electrónico no es válido';
    }
    
    if (!formData.username.trim()) {
      newErrors.username = 'El nombre de usuario es requerido';
    } else if (formData.username.length < 3) {
      newErrors.username = 'El nombre de usuario debe tener al menos 3 caracteres';
    }
    
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setSuccess('');

    // Client-side validation
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setLoading(false);
      return;
    }

    try {
      const response = await registerUser(formData);

      // If backend still returns token + user (legacy), proceed to login
      if (response?.token && response?.user) {
        const loginSuccess = login(response.user, response.token);
        if (loginSuccess) {
          setSuccess('¡Cuenta creada exitosamente! Redirigiendo al dashboard...');
          setTimeout(() => {
            router.push('/dashboard');
          }, 1500);
        } else {
          setErrors({ general: 'Error al procesar el registro. Inténtalo de nuevo.' });
        }
      } else {
        // New flow: email verification required
        setSuccess('¡Cuenta creada! Te enviamos un código de verificación por correo.');
        setShowVerifyModal(true);
      }
      
    } catch (error) {
      console.error('Registration error:', error);
      
      try {
        const errorData = JSON.parse(error.message);
        
        if (errorData.errors) {
          const backendErrors = {};
          
          // Map backend field errors to frontend field names
          if (errorData.errors.email) {
            backendErrors.email = Array.isArray(errorData.errors.email) 
              ? errorData.errors.email[0] 
              : errorData.errors.email;
          }
          if (errorData.errors.username) {
            backendErrors.username = Array.isArray(errorData.errors.username) 
              ? errorData.errors.username[0] 
              : errorData.errors.username;
          }
          if (errorData.errors.password) {
            backendErrors.password = Array.isArray(errorData.errors.password) 
              ? errorData.errors.password[0] 
              : errorData.errors.password;
          }
          if (errorData.errors.password_confirm) {
            backendErrors.confirmPassword = Array.isArray(errorData.errors.password_confirm) 
              ? errorData.errors.password_confirm[0] 
              : errorData.errors.password_confirm;
          }
          if (errorData.errors.non_field_errors) {
            backendErrors.general = Array.isArray(errorData.errors.non_field_errors) 
              ? errorData.errors.non_field_errors[0] 
              : errorData.errors.non_field_errors;
          }
          
          setErrors(backendErrors);
        } else {
          setErrors({ general: 'Error al crear la cuenta. Inténtalo de nuevo.' });
        }
      } catch {
        setErrors({ general: 'Error al crear la cuenta. Inténtalo de nuevo.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <RequireGuest>
      <Head>
        <title>Registrarse - SplashMy</title>
        <meta name="description" content="Crea tu cuenta en SplashMy y accede a las herramientas de IA" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={`${styles.authContainer} ${compact ? styles.compact : ''}`}>
        <div className={styles.authCard}>
          {/* Logo */}
          <div className={styles.logo}>
            <Link href="/">
              <h1>SplashMy</h1>
            </Link>
          </div>

          {/* Header */}
          <div className={styles.header}>
            <h2 className={styles.title}>Crear Cuenta</h2>
            <p className={styles.subtitle}>
              Únete a SplashMy y transforma tus imágenes con IA
            </p>
          </div>

          {/* Form */}
          <form className={styles.form} onSubmit={handleSubmit}>
            {/* General Error Message */}
            {errors.general && (
              <div className={styles.errorMessage}>
                <svg className={styles.errorIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errors.general}
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


            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label htmlFor="username" className={styles.label}>
                  Nombre de usuario *
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className={`${styles.input} ${errors.username ? styles.inputError : ''}`}
                  placeholder="usuario_123"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.username && <span className={styles.errorText}>{errors.username}</span>}
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.label}>
                  Correo electrónico *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.email && <span className={styles.errorText}>{errors.email}</span>}
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="password" className={styles.label}>
                  Contraseña *
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                />
                {!errors.password && (
                  <small className={styles.passwordHint}>
                    Mínimo 8 caracteres
                  </small>
                )}
                {errors.password && <span className={styles.errorText}>{errors.password}</span>}
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="confirmPassword" className={styles.label}>
                  Confirmar contraseña *
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.confirmPassword && <span className={styles.errorText}>{errors.confirmPassword}</span>}
              </div>
            </div>

            <div className={styles.terms}>
              <label className={styles.checkbox}>
                <input type="checkbox" required />
                <span className={styles.checkboxText}>
                  Acepto los{' '}
                  <Link href="/terms">términos y condiciones</Link> y la{' '}
                  <Link href="/privacy">política de privacidad</Link>
                </span>
              </label>
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
                  Creando cuenta...
                </>
              ) : (
                'Crear Cuenta'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className={styles.divider}>
            <span>o</span>
          </div>

          {/* Social Login */}
          <div className={styles.socialLogin}>
            <button className={styles.socialButton} onClick={handleGoogleLogin} disabled={loading || googleLoading}>
              <svg className={styles.socialIcon} viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {googleLoading ? 'Conectando...' : 'Continuar con Google'}
            </button>
          </div>

          {/* Login Link */}
          <div className={styles.loginLink}>
            ¿Ya tienes cuenta?{' '}
            <Link href="/login">
              Inicia sesión aquí
            </Link>
          </div>
        </div>

        {/* Background */}
        <div className={styles.background}></div>
        {showVerifyModal && (
          <EmailVerificationModal
            initialEmail={formData.email}
            onClose={() => setShowVerifyModal(false)}
            afterVerifyRedirect="/dashboard"
          />
        )}
      </div>
    </RequireGuest>
  );
}

export default function Register() {
  return <RegisterPage />;
}
