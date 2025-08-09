import styles from '../../styles/components/dashboard/DashboardSidebar.module.css';

const itemsPrimary = [
  { key: 'explore', label: 'Estilos', active: true, icon: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7z"/></svg>
  )},
  { key: 'images', label: 'Galerías', icon: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5L19 19H5l3.5-5.5zM8 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>
  )},
  { key: 'top', label: 'Top', icon: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>
  )},
  { key: 'likes', label: 'Me gusta', icon: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41 1.01 4.5 2.09C12.09 5.01 13.76 4 15.5 4 18 4 20 6 20 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
  )},
];

const itemsLibrary = [
  { key: 'mymedia', label: 'Mi galería', icon: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M4 4h16v12H5.17L4 17.17V4zm0 14h16v2H4v-2z"/></svg>
  )},
  { key: 'uploads', label: 'Subidas', icon: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M5 20h14v-2H5m14-9h-4V3H9v6H5l7 7 7-7z"/></svg>
  )},
  { key: 'trash', label: 'Reciclaje', icon: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
  )},
];

export default function DashboardSidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.section}>
        <nav className={styles.nav}>
          {itemsPrimary.map((it) => (
            <a key={it.key} className={`${styles.item} ${it.active ? styles.active : ''}`}>
              <span className={styles.itemIcon}>{it.icon}</span>
              <span>{it.label}</span>
            </a>
          ))}
        </nav>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Biblioteca</div>
        <nav className={styles.nav}>
          {itemsLibrary.map((it) => (
            <a key={it.key} className={styles.item}>
              <span className={styles.itemIcon}>{it.icon}</span>
              <span>{it.label}</span>
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}
