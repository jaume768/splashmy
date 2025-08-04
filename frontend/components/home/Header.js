import { useState } from 'react';
import styles from '../../styles/components/home/Header.module.css';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <h1>SplashMy</h1>
        </div>
        
        <nav className={`${styles.nav} ${isMenuOpen ? styles.navOpen : ''}`}>
          <ul className={styles.navList}>
            <li className={styles.navItem}>
              <a href="#" className={styles.navLink}>Precios y prueba gratuita</a>
            </li>
            <li className={styles.navItem}>
              <a href="#" className={styles.navLink}>Regístrate e inicia sesión</a>
            </li>
            <li className={styles.navItem}>
              <a href="#" className={`${styles.navLink} ${styles.premium}`}>Prueba Premium</a>
            </li>
          </ul>
        </nav>
        
        <button 
          className={styles.hamburger}
          onClick={toggleMenu}
          aria-label="Abrir menú"
          aria-expanded={isMenuOpen}
        >
          <span className={`${styles.hamburgerLine} ${isMenuOpen ? styles.hamburgerLineOpen : ''}`}></span>
          <span className={`${styles.hamburgerLine} ${isMenuOpen ? styles.hamburgerLineOpen : ''}`}></span>
          <span className={`${styles.hamburgerLine} ${isMenuOpen ? styles.hamburgerLineOpen : ''}`}></span>
        </button>
      </div>
      
      {/* Overlay para cerrar el menú en móvil */}
      {isMenuOpen && (
        <div 
          className={styles.overlay}
          onClick={() => setIsMenuOpen(false)}
        ></div>
      )}
    </header>
  );
}
