import { useState } from 'react';
import Link from 'next/link';
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
          <h1>
            <Link href="/">Fotomorfia</Link>
          </h1>
        </div>
        
        <nav className={`${styles.nav} ${isMenuOpen ? styles.navOpen : ''}`}>
          <ul className={styles.navList}>
            <li className={styles.navItem}>
              <Link href="/login" className={styles.navLink}>Regístrate e inicia sesión</Link>
            </li>
            <li className={styles.navItem}>
              <a href="/dashboard" className={`${styles.navLink} ${styles.premium}`}>Prueba gratuita</a>
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
