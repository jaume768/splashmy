 import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './AdInterstitial.module.css';

const AdInterstitial = ({ 
  isVisible, 
  onComplete, 
  onSkip, 
  title = "Preparando tu imagen...",
  skipDelay = 5 // segundos antes de permitir skip
}) => {
  const [countdown, setCountdown] = useState(skipDelay);
  const [canSkip, setCanSkip] = useState(false);
  const publisherId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_PUBLISHER_ID;
  const adSlot = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_INTERSTITIAL_SLOT;

  useEffect(() => {
    if (!isVisible) return;

    setCountdown(skipDelay);
    setCanSkip(false);

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCanSkip(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, skipDelay]);

  useEffect(() => {
    // Verificar que las credenciales estén configuradas
    if (!publisherId || !adSlot) {
      console.warn('AdMob credentials not configured for interstitial ads');
      // En caso de credenciales faltantes, permitir saltar inmediatamente
      setCanSkip(true);
      setCountdown(0);
      return;
    }

    // Inicializar anuncio intersticial
    try {
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (error) {
      console.error('Error loading interstitial ad:', error);
      // En caso de error, permitir saltar
      setCanSkip(true);
      setCountdown(0);
    }
  }, [publisherId, adSlot]);

  const handleSkip = () => {
    if (canSkip) {
      onSkip?.();
    }
  };

  const handleAdComplete = () => {
    onComplete?.();
  };

  if (!isVisible) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <div className={styles.processingIndicator}>
              <div className={styles.spinner}></div>
            </div>
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.subtitle}>Mientras procesamos tu imagen...</p>
          </div>
          
          {canSkip && (
            <button 
              onClick={handleSkip}
              className={styles.skipButton}
              aria-label="Saltar anuncio"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Ad Content */}
        <div className={styles.adContent}>
          {publisherId && adSlot ? (
            <ins
              className="adsbygoogle"
              style={{
                display: 'block',
                width: '100%',
                height: '100%'
              }}
              data-ad-client={publisherId}
              data-ad-slot={adSlot}
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          ) : (
            <div className={styles.adPlaceholder}>
              <span>🚀</span>
              <h3>Anuncio Intersticial</h3>
              <p>Configurar credenciales AdMob para mostrar anuncios</p>
            </div>
          )}
          
          {/* Progress indicator */}
          <div className={styles.progressSection}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill}></div>
            </div>
            <p className={styles.progressText}>
              {canSkip 
                ? "Puedes continuar o explorar más opciones" 
                : `Continúa en ${countdown}s...`
              }
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerContent}>
            <p className={styles.adLabel}>Anuncio</p>
            <div className={styles.actions}>
              {canSkip ? (
                <button 
                  onClick={handleSkip}
                  className={styles.continueButton}
                >
                  Continuar con mi imagen
                </button>
              ) : (
                <div className={styles.countdown}>
                  <span>Continúa en {countdown}s</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdInterstitial;
