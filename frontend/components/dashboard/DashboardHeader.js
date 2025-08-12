import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../../styles/components/dashboard/DashboardHeader.module.css';

export default function DashboardHeader({ title = 'Explore' }) {
  const router = useRouter();
  const { user, authenticated } = useAuth();

  const userInitial = (user?.first_name || user?.username || 'U')
    .toString()
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand} onClick={() => router.push('/dashboard')}>
          <span className={styles.brandText}>SplashMy</span>
        </div>

        <div className={styles.center}>
          <span className={styles.title}>{title}</span>
        </div>

        <div className={styles.actions}>

          <button
            className={styles.avatarBtn}
            aria-label="Abrir perfil"
            onClick={() => {
              if (authenticated) {
                router.replace({ pathname: '/dashboard', query: { tab: 'profile' } }, undefined, { shallow: true });
              } else {
                router.push('/login');
              }
            }}
          >
            {authenticated ? (
              <span className={styles.avatar}>{userInitial}</span>
            ) : (
              <span className={styles.avatarGuest}>?</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
