import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "../styles/components/auth/Login.module.css";
import { requestPasswordReset, confirmPasswordReset } from "../utils/api";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1); // 1: request, 2: confirm
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cooldown, setCooldown] = useState(0); // seconds

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setError("Ingresa un email válido");
      setLoading(false);
      return;
    }

    try {
      await requestPasswordReset(emailTrimmed);
      setSuccess(
        "Si el email existe, hemos enviado un código de 6 dígitos. Revisa tu bandeja de entrada (y spam)."
      );
      setStep(2);
      setCooldown(60); // UI cooldown; backend también aplica cooldown
    } catch (err) {
      // Respetar respuesta genérica y no filtrar existencia
      setSuccess(
        "Si el email existe, hemos enviado un código de 6 dígitos. Revisa tu bandeja de entrada (y spam)."
      );
      setStep(2);
      setCooldown(60);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await requestPasswordReset(email);
      setSuccess("Código reenviado (si aplica). Revisa tu correo.");
      setCooldown(60);
    } catch (err) {
      setSuccess("Código reenviado (si aplica). Revisa tu correo.");
      setCooldown(60);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!code || code.length !== 6 || !/^[0-9]{6}$/.test(code)) {
      setError("El código debe tener 6 dígitos.");
      setLoading(false);
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    try {
      const resp = await confirmPasswordReset({ email, code, newPassword });
      setSuccess(resp?.message || "Contraseña restablecida. Inicia sesión.");
      // Redirigir al login tras breve delay
      setTimeout(() => {
        window.location.href = "/login";
      }, 1600);
    } catch (err) {
      try {
        const data = JSON.parse(err.message);
        const msg =
          data?.errors?.code?.[0] ||
          data?.errors?.new_password?.[0] ||
          data?.detail ||
          "No se pudo restablecer la contraseña. Verifica el código e inténtalo de nuevo.";
        setError(msg);
      } catch {
        setError(
          "No se pudo restablecer la contraseña. Verifica el código e inténtalo de nuevo."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Restablecer Contraseña - SplashMy</title>
        <meta
          name="description"
          content="Recupera el acceso a tu cuenta de SplashMy"
        />
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
            <h2 className={styles.title}>¿Olvidaste tu contraseña?</h2>
            <p className={styles.subtitle}>
              {step === 1
                ? "Ingresa tu email y te enviaremos un código de verificación"
                : "Ingresa el código que te enviamos por email y crea una nueva contraseña"}
            </p>
          </div>

          {/* Step 1: Request */}
          {step === 1 && (
            <form className={styles.form} onSubmit={handleRequest}>
              {error && (
                <div className={styles.errorMessage}>
                  <svg className={styles.errorIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              {success && (
                <div className={styles.successMessage}>
                  <svg className={styles.successIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {success}
                </div>
              )}

              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className={`${styles.input} ${error && email === "" ? styles.inputError : ""}`}
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className={`${styles.submitButton} ${loading ? styles.loading : ""}`}
                disabled={loading}
              >
                {loading ? "Enviando..." : "Enviar código"}
              </button>

              <div className={styles.registerLink} style={{ marginTop: 12 }}>
                <Link href="/login">Volver a iniciar sesión</Link>
              </div>
            </form>
          )}

          {/* Step 2: Confirm */}
          {step === 2 && (
            <form className={styles.form} onSubmit={handleConfirm}>
              {error && (
                <div className={styles.errorMessage}>
                  <svg className={styles.errorIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              {success && (
                <div className={styles.successMessage}>
                  <svg className={styles.successIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {success}
                </div>
              )}

              <div className={styles.inputGroup}>
                <label htmlFor="email2" className={styles.label}>
                  Email
                </label>
                <input
                  id="email2"
                  name="email2"
                  type="email"
                  required
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="code" className={styles.label}>
                  Código de verificación
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="000000"
                  required
                  maxLength={6}
                  className={`${styles.input} ${error && code === "" ? styles.inputError : ""}`}
                  value={code}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setCode(v);
                    if (error) setError("");
                  }}
                  disabled={loading}
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="new_password" className={styles.label}>
                  Nueva contraseña
                </label>
                <input
                  id="new_password"
                  name="new_password"
                  type="password"
                  required
                  className={`${styles.input} ${error && newPassword === "" ? styles.inputError : ""}`}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="confirm_password" className={styles.label}>
                  Confirmar contraseña
                </label>
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  required
                  className={`${styles.input} ${error && confirmPassword === "" ? styles.inputError : ""}`}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className={`${styles.submitButton} ${loading ? styles.loading : ""}`}
                disabled={loading}
              >
                {loading ? "Guardando..." : "Restablecer contraseña"}
              </button>

              <div className={styles.registerLink} style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className={styles.forgotLink}
                  onClick={handleResend}
                  disabled={loading || cooldown > 0}
                >
                  {cooldown > 0
                    ? `Reenviar código (${cooldown}s)`
                    : "Reenviar código"}
                </button>
              </div>

              <div className={styles.registerLink} style={{ marginTop: 12 }}>
                <Link href="/login">Volver a iniciar sesión</Link>
              </div>
            </form>
          )}
        </div>

        {/* Background */}
        <div className={styles.background}></div>
      </div>
    </>
  );
}
