import styles from '../../styles/Dashboard.module.css';

export default function StatsCard({ categories }) {
  const totalStyles = Array.isArray(categories)
    ? categories.reduce((sum, cat) => sum + (cat.styles_count || 0), 0)
    : 0;

  return (
    <div className={styles.statsCard}>
      <div className={styles.statItem}>
        <span className={styles.statNumber}>{Array.isArray(categories) ? categories.length : 0}</span>
        <span className={styles.statLabel}>Categorías</span>
      </div>
      <div className={styles.statDivider}></div>
      <div className={styles.statItem}>
        <span className={styles.statNumber}>{totalStyles}</span>
        <span className={styles.statLabel}>Estilos</span>
      </div>
    </div>
  );
}
