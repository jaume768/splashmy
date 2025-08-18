# 🚀 Guía Completa: Configuración Google AdSense para Fotomorfia

⚠️ **IMPORTANTE**: Para aplicaciones **web** como Fotomorfia, debes usar **Google AdSense**, NO AdMob. AdMob es solo para apps móviles (Android/iOS).

Esta guía te llevará paso a paso para obtener las credenciales de Google AdSense y configurar la monetización en tu aplicación web Fotomorfia.

## 📋 Requisitos Previos

- Cuenta de Google
- Aplicación web desplegada y funcionando
- Tráfico web mínimo (recomendado: >1000 visitas/mes)
- Contenido original y de calidad
- Dominio propio (no subdominios gratuitos)

## 🎯 Paso 1: Crear Cuenta Google AdSense

### 1.1 Registro en AdSense
1. Ve a [adsense.google.com](https://adsense.google.com)
2. Haz clic en **"Empezar"**
3. Inicia sesión con tu cuenta de Google
4. Ingresa tu **URL del sitio web** (tu dominio de Fotomorfia)
5. Selecciona tu **país/territorio**
6. Elige si quieres recibir emails de rendimiento

### 1.2 Verificación de Cuenta
- Google puede solicitar verificación adicional
- Proporciona información fiscal si es necesario
- Espera la aprobación (puede tomar 24-48 horas)

## 🌐 Paso 2: Configurar Sitio Web en AdSense

### 2.1 Agregar Tu Sitio Web
1. En el panel de AdSense, ve a **"Sitios"**
2. Haz clic en **"Agregar sitio"**
3. Ingresa tu **URL completa**: `https://tu-dominio.com`
4. Selecciona tu país/región
5. Revisa y acepta los términos y condiciones

### 2.2 Configurar Políticas
- Asegúrate de tener página de **Política de Privacidad**
- Incluye información sobre uso de cookies y publicidad
- Cumple con GDPR/CCPA según tu audiencia

## 🎯 Paso 3: Verificar Sitio Web

### 3.1 Verificación HTML
1. AdSense te dará un **código HTML** para verificar tu sitio
2. Copia el código que se ve así:
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
```
3. Este código YA está integrado en `_app.js` de Fotomorfia
4. Espera la verificación (puede tomar 24-48 horas)

### 3.2 Crear Unidades Publicitarias
Una vez aprobado tu sitio:

**Banner Ads:**
1. Ve a **"Anuncios"** > **"Por unidades de anuncio"**
2. Haz clic en **"Crear unidad de anuncio"**
3. Selecciona **"Anuncio gráfico"**
4. Configura:
   - **Nombre**: `fotomorfia-banner-processing`
   - **Tipo**: Adaptable
   - **Tamaño**: Automático

**Native/In-feed Ads:**
1. Selecciona **"Anuncio de contenido coincidente"**
2. Configura:
   - **Nombre**: `fotomorfia-native-gallery`
   - **Estilo**: Personalizado para tu diseño

## 🔧 Paso 4: Integración en Next.js

### 4.1 Obtener Publisher ID
1. En AdSense, ve a **"Cuenta"** > **"Información de la cuenta"**
2. Copia tu **Publisher ID** (formato: `ca-pub-xxxxxxxxxxxxxxxx`)
3. También encontrarás los **Slot IDs** en cada unidad publicitaria creada

### 4.2 Configurar en _app.js
```javascript
// pages/_app.js
import AdMobSetup from '../components/ads/AdMobSetup';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <AdMobSetup publisherId="ca-pub-2090315215401348" />
      <Component {...pageProps} />
    </>
  );
}
```

### 4.3 Configurar Variables de Entorno
```bash
# .env.local
NEXT_PUBLIC_GOOGLE_ADSENSE_PUBLISHER_ID=ca-pub-2090315215401348
NEXT_PUBLIC_GOOGLE_ADSENSE_BANNER_SLOT=tu-slot-banner-id
NEXT_PUBLIC_GOOGLE_ADSENSE_INTERSTITIAL_SLOT=tu-slot-intersticial-id  
NEXT_PUBLIC_GOOGLE_ADSENSE_NATIVE_SLOT=tu-slot-nativo-id
```

✅ **Ya tienes configurado**: `ca-pub-2090315215401348`

### 4.4 Actualizar Componentes de Anuncios
Reemplaza los IDs de prueba en:
- `components/ads/AdBanner.js`
- `components/ads/AdInterstitial.js`
- `components/ads/NativeAd.js`

```javascript
// Ejemplo en AdBanner.js
const adSlot = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_BANNER_SLOT || 'tu-slot-id';
```

## 🚀 Paso 5: Implementación de Ads.txt

### 5.1 Crear archivo ads.txt
```bash
# public/ads.txt
google.com, pub-2090315215401348, DIRECT, f08c47fec0942fa0
```

✅ **Ya completado**: El archivo `ads.txt` ya está actualizado con tu Publisher ID real.

### 5.2 Verificar en AdSense
1. Ve a **"Sitios"** > **"Ads.txt"**
2. Verifica que tu archivo esté accesible en `tu-dominio.com/ads.txt`

## ⚙️ Paso 6: Configuraciones Avanzadas

### 6.1 Política de Anuncios Personalizados
1. En AdMob, ve a **"Bloqueo de anuncios"**
2. Configura categorías sensibles para tu audiencia
3. Bloquea anuncios inapropiados para fotografía/arte

### 6.2 Configurar Mediación (Opcional)
- Facebook Audience Network
- Amazon Publisher Services
- Unity Ads (si planeas versión móvil)

### 6.3 Configurar Reporting
1. Conecta con **Google Analytics**
2. Configura eventos personalizados para tracking de anuncios
3. Establece metas de conversión

## 📊 Paso 7: Testing y Optimización

### 7.1 Modo de Prueba
```javascript
// Activar modo de prueba en desarrollo
const isTestMode = process.env.NODE_ENV === 'development';
```

### 7.2 Métricas Clave a Monitorear
- **CTR (Click-Through Rate)**: >1%
- **CPC (Cost Per Click)**: Varía por región
- **RPM (Revenue Per Mille)**: Meta inicial $1-5
- **Viewability**: >70%

### 7.3 A/B Testing
- Frecuencia de anuncios intersticiales
- Posicionamiento de banners
- Timing de anuncios nativos

## 🔒 Paso 8: Cumplimiento y Políticas

### 8.1 Políticas de Google AdSense
- ✅ Contenido original y de calidad
- ✅ No hacer clic en tus propios anuncios
- ✅ No solicitar clics a usuarios
- ✅ Implementar GDPR/CCPA compliance

### 8.2 GDPR Compliance
```javascript
// Ejemplo de consent management
const handleConsentChange = (consent) => {
  if (consent.analytics) {
    // Activar tracking de anuncios
    window.gtag('consent', 'update', {
      'ad_storage': 'granted'
    });
  }
};
```

## 📈 Paso 9: Optimización de Revenue

### 9.1 Estrategias de Monetización
- **Freemium Model**: Anuncios para usuarios free
- **Timing Estratégico**: Antes de procesamiento IA
- **Native Integration**: Anuncios en galerías
- **Progressive Disclosure**: Aumentar frecuencia gradualmente

### 9.2 Métricas de Éxito
- **ARPU (Average Revenue Per User)**
- **LTV (Lifetime Value)**
- **Churn Rate** post-implementación
- **User Satisfaction Score**

## 🛠️ Troubleshooting Común

### Error: "Ad request failed"
- Verificar que ads.txt esté configurado
- Comprobar que el dominio coincida con AdMob
- Revisar console para errores de CORS

### Error: "Publisher ID invalid"
- Verificar formato `ca-pub-xxxxxxxxxxxxxxxx`
- Confirmar que la cuenta esté aprobada
- Revisar variables de entorno

### Baja Revenue
- Optimizar placement de anuncios
- Mejorar targeting de audiencia
- Experimentar con diferentes formatos

## 📞 Soporte y Resources

- **Google AdMob Help**: [support.google.com/admob](https://support.google.com/admob)
- **AdSense Academy**: Cursos gratuitos de optimización
- **Community**: r/admob, Stack Overflow

---

## ⚡ Quick Start Checklist

- [ ] Crear cuenta Google AdMob
- [ ] Agregar aplicación web a AdMob
- [ ] Crear 3 unidades publicitarias (banner, interstitial, native)
- [ ] Copiar Publisher ID y Slot IDs
- [ ] Actualizar variables de entorno
- [ ] Crear archivo ads.txt
- [ ] Deployar en producción
- [ ] Verificar ads.txt en AdMob
- [ ] Monitorear métricas primeras 48h

**¡Tu monetización está lista! 🎉**
