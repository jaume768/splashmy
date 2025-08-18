/**
 * AdMob Setup Component - Inicializa Google AdMob/AdSense en Next.js
 */
import { useEffect } from 'react';
import Script from 'next/script';

const AdMobSetup = ({ publisherId }) => {
  useEffect(() => {
    // Configuración global de AdSense
    if (typeof window !== 'undefined') {
      window.adsbygoogle = window.adsbygoogle || [];
    }
  }, []);

  return (
    <>
      {/* Google AdSense Script */}
      <Script
        id="google-adsense"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`}
        crossOrigin="anonymous"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('Google AdSense loaded successfully');
        }}
        onError={(e) => {
          console.error('Error loading Google AdSense:', e);
        }}
      />
    </>
  );
};

export default AdMobSetup;
