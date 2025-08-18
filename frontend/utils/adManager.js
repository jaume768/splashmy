/**
 * Ad Manager - Lógica de control de anuncios y segmentación
 */

/**
 * Verificar si AdMob está configurado correctamente
 */
export const isAdMobConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_PUBLISHER_ID &&
    process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_BANNER_SLOT &&
    process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_INTERSTITIAL_SLOT &&
    process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_NATIVE_SLOT
  );
};

// Storage keys
const AD_STORAGE_KEYS = {
  DAILY_USAGE: 'fotomorfia_daily_usage',
  LAST_AD_SHOWN: 'fotomorfia_last_ad',
  AD_FREE_UNTIL: 'fotomorfia_ad_free_until'
};

/**
 * Obtener uso diario del usuario
 */
export const getDailyUsage = () => {
  if (typeof window === 'undefined') return 0;
  
  const today = new Date().toDateString();
  const stored = localStorage.getItem(AD_STORAGE_KEYS.DAILY_USAGE);
  
  try {
    const data = JSON.parse(stored || '{}');
    return data[today] || 0;
  } catch {
    return 0;
  }
};

/**
 * Incrementar contador de uso diario
 */
export const incrementDailyUsage = () => {
  if (typeof window === 'undefined') return;
  
  const today = new Date().toDateString();
  const stored = localStorage.getItem(AD_STORAGE_KEYS.DAILY_USAGE);
  
  try {
    const data = JSON.parse(stored || '{}');
    data[today] = (data[today] || 0) + 1;
    
    // Limpiar datos antiguos (solo mantener últimos 7 días)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    Object.keys(data).forEach(date => {
      if (new Date(date) < sevenDaysAgo) {
        delete data[date];
      }
    });
    
    localStorage.setItem(AD_STORAGE_KEYS.DAILY_USAGE, JSON.stringify(data));
  } catch (error) {
    console.error('Error updating daily usage:', error);
  }
};

/**
 * Verificar si debe mostrar anuncio
 */
export const shouldShowAd = (user) => {
  // Verificar primero si AdMob está configurado
  if (!isAdMobConfigured()) return false;
  
  if (!user || user.is_premium) return false;
  
  const dailyUsage = getDailyUsage();
  const timeSinceLastAd = getTimeSinceLastAd();
  const hasAdFreeTime = hasActiveAdFreeTime();
  
  return (
    dailyUsage >= 2 &&                    // Después de 2 procesamientos
    timeSinceLastAd > 5 * 60 * 1000 &&   // Mínimo 5 min entre ads
    !hasAdFreeTime                       // No tiene tiempo libre de ads activo
  );
};

/**
 * Marcar que se mostró un anuncio
 */
export const markAdShown = () => {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(AD_STORAGE_KEYS.LAST_AD_SHOWN, Date.now().toString());
};

/**
 * Obtener tiempo desde último anuncio mostrado
 */
export const getTimeSinceLastAd = () => {
  if (typeof window === 'undefined') return Infinity;
  
  const lastAdTime = localStorage.getItem(AD_STORAGE_KEYS.LAST_AD_SHOWN);
  if (!lastAdTime) return Infinity;
  
  return Date.now() - parseInt(lastAdTime);
};

/**
 * Activar tiempo libre de anuncios (reward por ver video ad)
 */
export const activateAdFreeTime = (durationMinutes = 60) => {
  if (typeof window === 'undefined') return;
  
  const until = Date.now() + (durationMinutes * 60 * 1000);
  localStorage.setItem(AD_STORAGE_KEYS.AD_FREE_UNTIL, until.toString());
};

/**
 * Verificar si tiene tiempo libre de anuncios activo
 */
export const hasActiveAdFreeTime = () => {
  if (typeof window === 'undefined') return false;
  
  const until = localStorage.getItem(AD_STORAGE_KEYS.AD_FREE_UNTIL);
  if (!until) return false;
  
  const adFreeUntil = parseInt(until);
  const isActive = Date.now() < adFreeUntil;
  
  // Limpiar si expiró
  if (!isActive) {
    localStorage.removeItem(AD_STORAGE_KEYS.AD_FREE_UNTIL);
  }
  
  return isActive;
};

/**
 * Obtener minutos restantes de tiempo libre de ads
 */
export const getAdFreeTimeRemaining = () => {
  if (!hasActiveAdFreeTime()) return 0;
  
  const until = localStorage.getItem(AD_STORAGE_KEYS.AD_FREE_UNTIL);
  const remaining = parseInt(until) - Date.now();
  
  return Math.ceil(remaining / (60 * 1000)); // en minutos
};

/**
 * Limpiar todos los datos de anuncios
 */
export const clearAdData = () => {
  if (typeof window === 'undefined') return;
  
  Object.values(AD_STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

/**
 * Obtener configuración de anuncio basada en contexto
 */
export const getAdConfig = (placement, user) => {
  const baseConfig = {
    skipDelay: 5,
    autoClose: false,
    frequency: 'normal'
  };
  
  switch (placement) {
    case 'style_transfer':
      return {
        ...baseConfig,
        title: 'Preparando tu imagen estilizada...',
        skipDelay: 6,
        adTypes: ['interstitial', 'banner']
      };
      
    case 'processing':
      return {
        ...baseConfig,
        title: 'Procesando con IA...',
        skipDelay: 4,
        adTypes: ['banner']
      };
      
    case 'result':
      return {
        ...baseConfig,
        title: '¡Resultado listo!',
        skipDelay: 3,
        adTypes: ['native', 'banner']
      };
      
    default:
      return baseConfig;
  }
};
