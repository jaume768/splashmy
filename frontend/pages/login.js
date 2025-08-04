import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import styles from "../styles/components/auth/Login.module.css";

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Implement login functionality
    console.log('Login data:', formData);
  };

  return (
    <>
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
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className={styles.input}
                placeholder="tu@email.com"
                value={formData.email}
                onChange={handleChange}
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
                className={styles.input}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
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

            <button type="submit" className={styles.submitButton}>
              Iniciar Sesión
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
    </>
  );
}
