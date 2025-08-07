import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import StyleGrid from '../components/styles/StyleGrid';
import StyleTransferModal from '../components/styles/StyleTransferModal';
import Notification from '../components/ui/Notification';
import { fetchStyleCategories } from '../utils/api';
import styles from '../styles/Dashboard.module.css';
import { useAuth } from '../contexts/AuthContext';

// Componente de búsqueda modular
const SearchInput = ({ searchTerm, onSearchChange, onClear }) => (
  <div className={styles.searchCard}>
    <div className={styles.searchInputWrapper}>
      <svg className={styles.searchIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        placeholder="Buscar estilos..."
        value={searchTerm}
        onChange={onSearchChange}
        className={styles.searchInput}
      />
      {searchTerm && (
        <button onClick={onClear} className={styles.clearButton} aria-label="Borrar búsqueda">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  </div>
);

// Componente de filtro de categorías modular
const CategoryFilter = ({ selectedCategory, categories, onCategoryChange, loadingCategories }) => (
  <div className={styles.filterCard}>
    <label className={styles.filterLabel}>Categoría</label>
    <div className={styles.selectWrapper}>
      <select
        value={selectedCategory}
        onChange={onCategoryChange}
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
      <svg className={styles.selectIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </div>
);

// Componente de estadísticas modular
const StatsCard = ({ categories }) => {
  const totalStyles = Array.isArray(categories) 
    ? categories.reduce((sum, cat) => sum + (cat.styles_count || 0), 0)
    : 0;
  
  return (
    <div className={styles.statsCard}>
      <div className={styles.statItem}>
        <span className={styles.statNumber}>{categories.length}</span>
        <span className={styles.statLabel}>Categorías</span>
      </div>
      <div className={styles.statDivider}></div>
      <div className={styles.statItem}>
        <span className={styles.statNumber}>{totalStyles}</span>
        <span className={styles.statLabel}>Estilos</span>
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  // Style Transfer Modal state
  const [showStyleTransferModal, setShowStyleTransferModal] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(null);
  
  // Notification state
  const [notification, setNotification] = useState({
    isVisible: false,
    message: '',
    type: 'success'
  });
  
  const router = useRouter();
  const { user, authenticated } = useAuth();

  // Obtener categorías para el filtro
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetchStyleCategories();
        const data = Array.isArray(response) 
          ? response 
          : (response?.results || []);
        setCategories(data);
      } catch (error) {
        console.error('Error al obtener categorías:', error);
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
  
  // Handle style click for authenticated users
  const handleStyleClick = (style) => {
    if (!authenticated) {
      // Redirect to login if not authenticated
      router.push('/login');
      return;
    }
    
    setSelectedStyle(style);
    setShowStyleTransferModal(true);
  };
  
  // Handle style transfer completion
  const handleStyleTransferComplete = (jobResult) => {
    console.log('Style transfer completed:', jobResult);
    
    // Close modal
    setShowStyleTransferModal(false);
    setSelectedStyle(null);
    
    // Show success notification
    showNotification(
      '¡Estilo aplicado exitosamente! Tu imagen está siendo procesada.',
      'success'
    );
    
    // Optionally redirect to results page or gallery after a delay
    // setTimeout(() => {
    //   router.push('/gallery');
    // }, 2000);
  };
  
  // Show notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({
      isVisible: true,
      message,
      type
    });
  };
  
  // Hide notification
  const hideNotification = () => {
    setNotification(prev => ({
      ...prev,
      isVisible: false
    }));
  };
  
  // Handle modal close
  const handleModalClose = () => {
    setShowStyleTransferModal(false);
    setSelectedStyle(null);
  };

  return (
    <>
      <Head>
        <title>Panel de estilos - SplashMy</title>
        <meta name="description" content="Explora todos los estilos de imágenes AI disponibles en SplashMy" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.dashboard}>
        {/* Encabezado moderno */}
        <header className={styles.header}>
          <div className={styles.container}>
            <div className={styles.headerContent}>
              <div className={styles.titleSection}>
                <div className={styles.titleWrapper}>
                  <span className={styles.badge}>AI Styles</span>
                  <h1 className={styles.title}>Panel de estilos</h1>
                  {authenticated && user && (
                    <div className={styles.userWelcome}>
                      <p className={styles.welcomeText}>
                        ¡Bienvenido, {user.first_name || user.username}!
                      </p>
                      <button 
                        onClick={() => router.push('/my-creations')}
                        className={styles.galleryButton}
                      >
                        🎨 Mis Creaciones
                      </button>
                    </div>
                  )}
                  {!authenticated && (
                    <p className={styles.guestText}>
                      <span>Explora nuestros estilos. </span>
                      <a href="/login" className={styles.loginLink}>Inicia sesión</a>
                      <span> o </span>
                      <a href="/register" className={styles.registerLink}>regístrate</a>
                      <span> para más funciones.</span>
                    </p>
                  )}
                </div>
                <p className={styles.subtitle}>
                  Descubre y explora todos los estilos de transformación de imágenes AI disponibles
                </p>
              </div>
              <StatsCard categories={categories} />
            </div>
          </div>
        </header>

        {/* Panel de control */}
        <section className={styles.controlPanel}>
          <div className={styles.container}>
            <div className={styles.controlsGrid}>
              <SearchInput 
                searchTerm={searchTerm}
                onSearchChange={handleSearchChange}
                onClear={() => setSearchTerm('')}
              />
              
              <CategoryFilter 
                selectedCategory={selectedCategory}
                categories={categories}
                onCategoryChange={handleCategoryChange}
                loadingCategories={loadingCategories}
              />
              
              {(searchTerm || selectedCategory) && (
                <div className={styles.actionCard}>
                  <button onClick={clearFilters} className={styles.clearFiltersButton}>
                    <svg className={styles.clearIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Limpiar filtros
                  </button>
                </div>
              )}
            </div>
            
            {(searchTerm || selectedCategory) && (
              <div className={styles.activeFilters}>
                <span className={styles.filtersLabel}>Filtros activos:</span>
                <div className={styles.filterTags}>
                  {searchTerm && (
                    <span className={styles.filterTag}>
                      Búsqueda: "{searchTerm}"
                      <button onClick={() => setSearchTerm('')} className={styles.removeTag}>
                        ×
                      </button>
                    </span>
                  )}
                  {selectedCategory && (
                    <span className={styles.filterTag}>
                      Categoría: {selectedCategory}
                      <button onClick={() => setSelectedCategory('')} className={styles.removeTag}>
                        ×
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Contenido principal */}
        <main className={styles.mainContent}>
          <div className={styles.container}>
            <StyleGrid 
              searchTerm={searchTerm}
              selectedCategory={selectedCategory}
              onStyleClick={handleStyleClick}
            />
          </div>
        </main>
        
        {/* Style Transfer Modal */}
        <StyleTransferModal
          isOpen={showStyleTransferModal}
          onClose={handleModalClose}
          selectedStyle={selectedStyle}
          onComplete={handleStyleTransferComplete}
        />
        
        {/* Notification */}
        <Notification
          isVisible={notification.isVisible}
          message={notification.message}
          type={notification.type}
          onClose={hideNotification}
          duration={5000}
        />

        {/* Pie de página minimalista */}
        <footer className={styles.footer}>
          <div className={styles.container}>
            <div className={styles.footerContent}>
              <div className={styles.footerBrand}>
                <span className={styles.footerLogo}>SplashMy</span>
                <span className={styles.footerTagline}>Creatividad infinita con IA</span>
              </div>
              <p className={styles.footerCopyright}>© 2024 SplashMy</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default function Dashboard() {
  return <DashboardPage />;
}
