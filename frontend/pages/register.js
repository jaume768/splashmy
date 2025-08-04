import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import styles from "../styles/components/auth/Register.module.css";

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Implement registration functionality
    console.log('Registration data:', formData);
  };

  return (
    <>
      <Head>
        <title>Registrarse - SplashMy</title>
        <meta name="description" content="Crea tu cuenta en SplashMy y accede a las herramientas de IA" />
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
            <h2 className={styles.title}>Crear Cuenta</h2>
            <p className={styles.subtitle}>
              Únete a SplashMy y transforma tus imágenes con IA
            </p>
          </div>

          {/* Form */}
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.nameRow}>
              <div className={styles.inputGroup}>
                <label htmlFor="firstName" className={styles.label}>
                  Nombre
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  className={styles.input}
                  placeholder="Tu nombre"
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="lastName" className={styles.label}>
                  Apellidos
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  className={styles.input}
                  placeholder="Tus apellidos"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="username" className={styles.label}>
                Nombre de usuario
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className={styles.input}
                placeholder="nombreusuario"
                value={formData.username}
                onChange={handleChange}
              />
            </div>

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
              <small className={styles.passwordHint}>
                Mínimo 8 caracteres con al menos una mayúscula, minúscula y número
              </small>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className={styles.input}
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
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

            <button type="submit" className={styles.submitButton}>
              Crear Cuenta
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
      </div>
    </>
  );
}
