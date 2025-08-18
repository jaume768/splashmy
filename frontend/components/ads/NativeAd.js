import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './NativeAd.module.css';

const NativeAd = ({ 
  variant = 'minimal', // 'minimal', 'card', 'sidebar'
  className = '',
  style = {}
}) => {
  const adRef = useRef(null);
  const { user } = useAuth();
  const publisherId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_PUBLISHER_ID;
  const adSlot = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_NATIVE_SLOT;

  // No mostrar anuncios a usuarios premium
  if (user?.subscription_type === 'premium') {
    return null;
  }

  // No renderizar si no hay credenciales configuradas
  if (!publisherId || !adSlot) {
    return null; // Silencioso para native ads sin configuración
  }

  useEffect(() => {
    // Verificar que las credenciales estén configuradas
    if (!publisherId || !adSlot) {
      console.warn('AdMob credentials not configured for native ads');
      return;
    }

    try {
      // Inicializar anuncio nativo cuando el componente se monta
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (error) {
      console.error('Error loading native ad:', error);
    }
  }, [publisherId, adSlot]);

  return (
    <div className={`${styles.nativeAd} ${styles[variant]} ${className}`} style={style}>
      <div className={styles.adLabel}>Anuncio</div>
      
      <div className={styles.adContent}>
        {/* Native ad content - Google AdSense */}
        <ins
          className="adsbygoogle"
          style={{
            display: 'block',
            width: '100%',
            height: '120px'
          }}
          data-ad-client={publisherId}
          data-ad-slot={adSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
          ref={adRef}
        />
      </div>
    </div>
  );
};

export default NativeAd;
