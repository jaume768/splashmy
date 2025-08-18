import "@/styles/globals.css";
import { AuthProvider } from '../contexts/AuthContext';
import CookieConsent from '@/components/ui/CookieConsent';
import AdMobSetup from '@/components/ads/AdMobSetup';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <AdMobSetup publisherId={process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_PUBLISHER_ID} />
      <Component {...pageProps} />
      <CookieConsent />
    </AuthProvider>
  );
}
