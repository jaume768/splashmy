import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '@/styles/components/CookieConsent.module.css';

const STORAGE_KEY = 'cookie_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        setVisible(true);
      }
    } catch (e) {
      // Si localStorage falla, mostramos igualmente el banner
      setVisible(true);
    }
  }, []);

  const handleChoice = (choice) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ status: choice, ts: Date.now() })
        );
      }
    } catch (e) {
      // noop
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className={styles.banner} role="dialog" aria-live="polite" aria-label="Consentimiento de cookies">
      <div className={styles.inner}>
        <div className={styles.text}>
          Usamos cookies necesarias para el funcionamiento del sitio (por ejemplo, autenticación y seguridad). 
          Puedes leer más en nuestra{' '}
          <Link href="/legal/politica-cookies" className={styles.link}>Política de Cookies</Link>.
        </div>
        <div className={styles.actions}>
          <button className={`${styles.button} ${styles.reject}`} onClick={() => handleChoice('rejected')}>
            Rechazar
          </button>
          <button className={`${styles.button} ${styles.accept}`} onClick={() => handleChoice('accepted')}>
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
