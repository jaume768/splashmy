import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import StyleTransferModal from '../components/styles/StyleTransferModal';
import Notification from '../components/ui/Notification';
import { fetchStyleCategories } from '../utils/api';
import styles from '../styles/Dashboard.module.css';
import { useAuth } from '../contexts/AuthContext';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import DashboardSidebar from '../components/dashboard/DashboardSidebar';
import SearchInput from '../components/dashboard/SearchInput';
import CategoryFilter from '../components/dashboard/CategoryFilter';
import MobileBottomMenu from '../components/dashboard/MobileBottomMenu';
import ExploreView from '../components/dashboard/views/ExploreView';
import MyGalleryView from '../components/dashboard/views/MyGalleryView';
import ImagesView from '../components/dashboard/views/ImagesView';
import TopView from '../components/dashboard/views/TopView';
import LikedView from '../components/dashboard/views/LikedView';

// (Inline UI subcomponents moved to components/dashboard/*)

const DashboardPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [activeView, setActiveView] = useState('explore');
  
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
  const { authenticated } = useAuth();

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
        // Si el token es inválido o la API devuelve 401, redirigir a login
        if (
          error?.status === 401 ||
          (typeof error?.message === 'string' && (error.message.includes('"status":401') || error.message.includes('Invalid token')))
        ) {
          try {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
          } catch (e) {}
          router.replace('/login');
          return;
        }
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Sync active view with ?tab= query (shallow routing)
  useEffect(() => {
    const tab = router.query?.tab;
    if (typeof tab === 'string') {
      setActiveView(tab);
    } else {
      setActiveView('explore');
    }
  }, [router.query?.tab]);

  const onNavigate = (viewKey) => {
    setActiveView(viewKey);
    const query = viewKey === 'explore' ? {} : { tab: viewKey };
    router.replace({ pathname: '/dashboard', query }, undefined, { shallow: true });
  };

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
        <DashboardHeader title={{
          explore: 'Estilos',
          images: 'Imágenes',
          top: 'Top',
          'my-gallery': 'Mi galería',
          likes: 'Me gusta',
          trash: 'Reciclaje',
        }[activeView] || 'Estilos'} />

        {/* Panel de control se renderiza dentro del contenido (explore) */}

        {/* Contenido principal */}
        <main className={styles.mainContent}>
          <div className={styles.container}>
            <div className={styles.contentLayout}>
              <DashboardSidebar activeView={activeView} onNavigate={onNavigate} />
              <div className={styles.content}>
                {activeView === 'explore' && (
                  <>
                    <section className={styles.controlPanel}>
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
                    </section>

                    <ExploreView 
                      searchTerm={searchTerm}
                      selectedCategory={selectedCategory}
                      onStyleClick={handleStyleClick}
                    />
                  </>
                )}
                {activeView === 'my-gallery' && (
                  <MyGalleryView onExploreClick={() => onNavigate('explore')} />
                )}
                {activeView === 'images' && (
                  <ImagesView />
                )}
                {activeView === 'top' && (
                  <TopView />
                )}
                {activeView === 'likes' && (
                  <LikedView />
                )}
                {activeView !== 'explore' && activeView !== 'my-gallery' && activeView !== 'images' && activeView !== 'top' && activeView !== 'likes' && (
                  <div>Vista "{activeView}" aún no implementada.</div>
                )}
              </div>
            </div>
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

        {/* Menú inferior para móvil */}
        <MobileBottomMenu activeView={activeView} onNavigate={onNavigate} />

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
