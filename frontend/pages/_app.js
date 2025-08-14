import "@/styles/globals.css";
import { AuthProvider } from '../contexts/AuthContext';
import CookieConsent from '@/components/ui/CookieConsent';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
      <CookieConsent />
    </AuthProvider>
  );
}
