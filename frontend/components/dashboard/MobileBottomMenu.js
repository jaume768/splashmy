import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../../styles/components/dashboard/MobileBottomMenu.module.css';

export default function MobileBottomMenu({ activeView = 'explore', onNavigate }) {
  const router = useRouter();
  const { authenticated } = useAuth();

  const items = [
    { key: 'explore', label: 'Estilos', icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7z"/></svg>
    )},
    { key: 'top', label: 'Top', icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>
    )},
    { key: 'images', label: 'Imágenes', icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5L19 19H5l3.5-5.5zM8 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>
    )},
    { key: 'my-gallery', label: 'Biblioteca', icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M4 4h16v12H5.17L4 17.17V4zm0 14h16v2H4v-2z"/></svg>
    )},
    { key: 'profile', label: authenticated ? 'Perfil' : 'Login', icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-5 0-9 2.5-9 5v3h18v-3c0-2.5-4-5-9-5z"/></svg>
    )},
  ];

  const handleClick = (key) => {
    if (key === 'profile') {
      if (!authenticated) router.push('/login');
      // else: could open profile modal; no-op for now
      return;
    }
    if (key === 'my-gallery') {
      if (!authenticated) {
        router.push('/login');
        return;
      }
    }
    if (typeof onNavigate === 'function') onNavigate(key);
  };

  return (
    <nav className={styles.bottomNav} aria-label="Mobile navigation">
      {items.map((it) => (
        <button
          key={it.key}
          className={styles.navItem}
          aria-label={it.label}
          aria-current={activeView === it.key ? 'page' : undefined}
          onClick={() => handleClick(it.key)}
        >
          <span className={styles.icon}>{it.icon}</span>
          <span className={styles.label}>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
