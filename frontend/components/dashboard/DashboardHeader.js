import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../../styles/components/dashboard/DashboardHeader.module.css';

export default function DashboardHeader({ title = 'Explore' }) {
  const router = useRouter();
  const { user, authenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

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
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {authenticated ? (
              <span className={styles.avatar}>{userInitial}</span>
            ) : (
              <span className={styles.avatarGuest}>?</span>
            )}
          </button>

          {menuOpen && (
            <div className={styles.menuOverlay} onClick={() => setMenuOpen(false)} />
          )}

          {menuOpen && (
            <div className={styles.menu} role="dialog" aria-modal="true">
              <ul className={styles.menuList}>
                {authenticated ? (
                  <>
                    <li className={styles.menuItem}><button>Settings</button></li>
                    <li className={styles.menuItem}><button>Help</button></li>
                    <li className={styles.menuItem}>
                      <div className={styles.menuGroup}>
                        <span>Video tutorials</span>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 6l6 6-6 6"/></svg>
                      </div>
                    </li>
                    <li className={styles.menuItem}><button>Join our Discord</button></li>
                    <li className={`${styles.menuItem} ${styles.menuMuted}`}><span>My plan</span><span className={styles.menuBadge}>Plus</span></li>
                    <li className={styles.menuDivider} role="separator" />
                    <li className={styles.menuItemDanger}><button>Log out</button></li>
                  </>
                ) : (
                  <>
                    <li className={styles.menuItem}><button onClick={() => router.push('/login')}>Login</button></li>
                    <li className={styles.menuItem}><button onClick={() => router.push('/register')}>Register</button></li>
                    <li className={styles.menuItem}><button>Help</button></li>
                    <li className={styles.menuItem}><button>Join our Discord</button></li>
                  </>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
