import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../../styles/components/auth/EmailVerificationModal.module.css';
import { verifyEmail, resendVerification } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function EmailVerificationModal({ initialEmail = '', onClose, afterVerifyRedirect = '/dashboard' }) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const timerRef = useRef(null);
  const codeInputRef = useRef(null);
  const { login } = useAuth();
  const router = useRouter();

  // Start a cooldown timer for resend
  useEffect(() => {
    // Focus code input on open
    setTimeout(() => {
      if (codeInputRef.current) codeInputRef.current.focus();
    }, 100);

    timerRef.current = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const canResend = resendCooldown === 0 && !resending && !loading;

  const formatCooldown = useMemo(() => {
    const m = Math.floor(resendCooldown / 60);
    const s = resendCooldown % 60;
    if (m > 0) return `${m}:${s.toString().padStart(2, '0')}`;
    return `${s}s`;
  }, [resendCooldown]);

  const handleVerify = async (e) => {
    e?.preventDefault?.();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Ingresa un email válido');
        return;
      }
      if (!/^\d{6}$/.test(code)) {
        setError('Ingresa el código de 6 dígitos');
        return;
      }

      const response = await verifyEmail({ email, code });
      // If backend returns token + user, login and redirect
      if (response?.token && response?.user) {
        const ok = login(response.user, response.token);
        if (ok) {
          setSuccess('¡Email verificado! Redirigiendo...');
          setTimeout(() => {
            router.push(afterVerifyRedirect);
          }, 900);
          return;
        }
      }
      setSuccess(response?.detail || '¡Email verificado!');
      // Optionally close if no token flow
      setTimeout(() => {
        onClose?.();
      }, 900);
    } catch (err) {
      try {
        const data = JSON.parse(err.message);
        const msg = data?.errors?.code || data?.errors?.email || data?.errors?.detail || 'Error al verificar el código';
        setError(Array.isArray(msg) ? msg[0] : msg);
      } catch {
        setError('Error al verificar el código');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setResending(true);
    setError('');
    setSuccess('');
    try {
      const resp = await resendVerification(email);
      const seconds = resp?.seconds_remaining ?? 60;
      setResendCooldown(seconds);
      setSuccess(resp?.detail || 'Código reenviado. Revisa tu correo.');
    } catch (err) {
      try {
        const data = JSON.parse(err.message);
        const msg = data?.errors?.email || data?.errors?.detail || 'No se pudo reenviar el código';
        setError(Array.isArray(msg) ? msg[0] : msg);
      } catch {
        setError('No se pudo reenviar el código');
      }
    } finally {
      setResending(false);
    }
  };

  const close = () => {
    if (loading || resending) return; // prevent closing during actions
    onClose?.();
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Verifica tu correo</h3>
          <button className={styles.closeButton} onClick={close} aria-label="Cerrar">
            ×
          </button>
        </div>

        <p className={styles.description}>
          Te hemos enviado un código de verificación a tu correo electrónico. Ingresa el código para activar tu cuenta.
        </p>

        <form onSubmit={handleVerify} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              disabled={loading || resending}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="code">Código de 6 dígitos</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              className={styles.input}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              ref={codeInputRef}
              disabled={loading || resending}
              required
            />
            <small className={styles.hint}>El código expira pronto. No compartas este código con nadie.</small>
          </div>

          {/* Messages */}
          {error && (
            <div className={styles.errorMessage}>
              <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden>
                <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              {error}
            </div>
          )}
          {success && (
            <div className={styles.successMessage}>
              <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden>
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              {success}
            </div>
          )}

          <div className={styles.actions}>
            <button type="submit" className={styles.verifyButton} disabled={loading}>
              {loading ? 'Verificando...' : 'Verificar'}
            </button>
            <button type="button" className={styles.resendButton} onClick={handleResend} disabled={!canResend}>
              {resending ? 'Enviando...' : canResend ? 'Reenviar código' : `Reenviar en ${formatCooldown}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
