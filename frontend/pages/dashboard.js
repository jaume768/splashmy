import { useState, useEffect } from 'react';
import Head from 'next/head';
import StyleGrid from '../components/styles/StyleGrid';
import { fetchStyleCategories } from '../utils/api';
import styles from '../styles/Dashboard.module.css';

const Dashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Obtener categorías para el filtro
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetchStyleCategories();
        
        console.log('Respuesta API de categorías:', response);
        
        const data = Array.isArray(response) 
          ? response 
          : (response?.results || []);
          
        console.log('Datos procesados de categorías:', data);
        setCategories(data);
      } catch (error) {
        console.error('Error al obtener categorías:', error);
        // Establecer array vacío en caso de error para evitar errores de map
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value === 'all' ? '' : e.target.value);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
  };

  return (
    <>
      <Head>
        <title>Panel de estilos - SplashMy</title>
        <meta name="description" content="Explora todos los estilos de imágenes AI disponibles en SplashMy" />
      </Head>

      <div className={styles.dashboard}>
        {/* Encabezado */}
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>Panel de estilos</h1>
            <p className={styles.subtitle}>
              Descubre y explora todos los estilos de transformación de imágenes AI disponibles
            </p>
          </div>
        </header>

        {/* Búsqueda y filtros */}
        <section className={styles.filtersSection}>
          <div className={styles.filtersContainer}>
            <div className={styles.searchContainer}>
              <div className={styles.searchInputWrapper}>
                <svg 
                  className={styles.searchIcon}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar estilos..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className={styles.searchInput}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className={styles.clearButton}
                    aria-label="Borrar búsqueda"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M6 18L18 6M6 6l12 12" 
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className={styles.categoryContainer}>
              <select
                value={selectedCategory}
                onChange={handleCategoryChange}
                className={styles.categorySelect}
                disabled={loadingCategories}
              >
                <option value="">Todas las categorías</option>
                {Array.isArray(categories) && categories.map(category => (
                  <option key={category.id} value={category.name}>
                    {category.name} ({category.styles_count})
                  </option>
                ))}
              </select>
            </div>

            {(searchTerm || selectedCategory) && (
              <button 
                onClick={clearFilters}
                className={styles.clearFiltersButton}
              >
                Borrar filtros
              </button>
            )}
          </div>
        </section>

        {/* Cuadrícula de estilos */}
        <main className={styles.mainContent}>
          <StyleGrid 
            searchTerm={searchTerm}
            selectedCategory={selectedCategory}
          />
        </main>

        {/* Pie de página */}
        <footer className={styles.footer}>
          <div className={styles.footerContent}>
            <p>© 2024 SplashMy. Explora creatividad infinita con IA.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Dashboard;
