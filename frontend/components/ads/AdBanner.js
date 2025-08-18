import { useEffect, useRef } from 'react';
import styles from './AdBanner.module.css';

const AdBanner = ({ className = '', style = {} }) => {
  const adRef = useRef(null);
  const publisherId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_PUBLISHER_ID;
  const adSlot = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_BANNER_SLOT;

  useEffect(() => {
    // Verificar que las credenciales estén configuradas
    if (!publisherId || !adSlot) {
      console.warn('AdMob credentials not configured for banner ads');
      return;
    }

    try {
      // Inicializar anuncio cuando el componente se monta
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (error) {
      console.error('Error loading banner ad:', error);
    }
  }, [publisherId, adSlot]);

  // No renderizar si no hay credenciales configuradas
  if (!publisherId || !adSlot) {
    return (
      <div className={`${styles.adContainer} ${className}`} style={style}>
        <div className={styles.adPlaceholder}>
          <span>📢</span>
          <p>Banner Ad</p>
          <small>Configurar credenciales AdMob para mostrar anuncios</small>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.adContainer} ${className}`} style={style}>
      {/* Banner Ad */}
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          width: '100%',
          height: '60px'
        }}
        data-ad-client={publisherId}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
        ref={adRef}
      />
    </div>
  );
};

export default AdBanner;
