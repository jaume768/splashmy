import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { getUserProcessingResults } from '../utils/api';
import styles from '../styles/MyCreations.module.css';

export default function MyCreations() {
  const { user, authenticated } = useAuth();
  const router = useRouter();
  const [creations, setCreations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (authenticated) {
      fetchUserCreations();
    }
  }, [authenticated]);

  const fetchUserCreations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUserProcessingResults();
      setCreations(data?.results || []);
    } catch (err) {
      console.error('Error fetching user creations:', err);
      setError('Error al cargar tus creaciones. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (creation) => {
    setSelectedImage(creation);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  const handleDownload = async (creation) => {
    try {
      if (creation.s3_url) {
        window.open(creation.s3_url, '_blank');
      }
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const goBack = () => {
    router.push('/dashboard');
  };

  return (
    <ProtectedRoute>
      <div className={styles.page}>
        <Head>
          <title>Mis Creaciones - SplashMy</title>
          <meta name="description" content="Todas tus creaciones de arte AI en un solo lugar" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <div className={styles.container}>
          {/* Header */}
          <header className={styles.header}>
            <button onClick={goBack} className={styles.backButton}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 18l-6-6 6-6" />
              </svg>
              Volver
            </button>
            
            <div className={styles.titleSection}>
              <h1 className={styles.title}>Mis Creaciones</h1>
              <p className={styles.subtitle}>
                Todas tus obras de arte AI en un solo lugar
              </p>
            </div>

            {authenticated && user && (
              <div className={styles.userInfo}>
                <span className={styles.userName}>
                  {user.first_name || user.username}
                </span>
                <span className={styles.creationsCount}>
                  {creations.length} creaciones
                </span>
              </div>
            )}
          </header>

          {/* Content */}
          <main className={styles.main}>
            {loading && (
              <div className={styles.loadingState}>
                <div className={styles.loader}></div>
                <p>Cargando tus creaciones...</p>
              </div>
            )}

            {error && (
              <div className={styles.errorState}>
                <div className={styles.errorIcon}>⚠️</div>
                <p className={styles.errorMessage}>{error}</p>
                <button onClick={fetchUserCreations} className={styles.retryButton}>
                  Reintentar
                </button>
              </div>
            )}

            {!loading && !error && creations.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🎨</div>
                <h2 className={styles.emptyTitle}>Aún no tienes creaciones</h2>
                <p className={styles.emptyMessage}>
                  Comienza creando tu primera obra de arte AI
                </p>
                <button onClick={goBack} className={styles.createButton}>
                  Explorar Estilos
                </button>
              </div>
            )}

            {!loading && !error && creations.length > 0 && (
              <div className={styles.gallery}>
                {creations.map((creation) => (
                  <div key={creation.id} className={styles.creationCard}>
                    <div className={styles.imageContainer}>
                      <img
                        src={creation.s3_url}
                        alt={`Creación ${creation.id}`}
                        className={styles.creationImage}
                        onClick={() => handleImageClick(creation)}
                      />
                      <div className={styles.imageOverlay}>
                        <button
                          onClick={() => handleImageClick(creation)}
                          className={styles.viewButton}
                        >
                          👁️ Ver
                        </button>
                        <button
                          onClick={() => handleDownload(creation)}
                          className={styles.downloadButton}
                        >
                          💾 Descargar
                        </button>
                      </div>
                    </div>
                    
                    <div className={styles.cardInfo}>
                      <div className={styles.cardMeta}>
                        <span className={styles.creationDate}>
                          {formatDate(creation.created_at)}
                        </span>
                        <span className={styles.creationFormat}>
                          {creation.result_format?.toUpperCase() || 'PNG'}
                        </span>
                      </div>
                      
                      <div className={styles.cardStats}>
                        <span className={styles.stat}>
                          📏 {creation.result_size || '1024x1024'}
                        </span>
                        {creation.download_count > 0 && (
                          <span className={styles.stat}>
                            💾 {creation.download_count}
                          </span>
                        )}
                        {creation.user_rating && (
                          <span className={styles.stat}>
                            ⭐ {creation.user_rating}/5
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>

        {/* Modal para imagen seleccionada */}
        {selectedImage && (
          <div className={styles.modal} onClick={closeImageModal}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <button className={styles.closeButton} onClick={closeImageModal}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              
              <div className={styles.modalImage}>
                <img
                  src={selectedImage.s3_url}
                  alt={`Creación ${selectedImage.id}`}
                  className={styles.fullImage}
                />
              </div>
              
              <div className={styles.modalInfo}>
                <div className={styles.modalMeta}>
                  <h3>Detalles de la creación</h3>
                  <div className={styles.modalDetails}>
                    <span>📅 {formatDate(selectedImage.created_at)}</span>
                    <span>📏 {selectedImage.result_size}</span>
                    <span>🎨 {selectedImage.result_format?.toUpperCase()}</span>
                    <span>⚡ {selectedImage.result_quality || 'Standard'}</span>
                  </div>
                </div>
                
                <div className={styles.modalActions}>
                  <button
                    onClick={() => handleDownload(selectedImage)}
                    className={styles.modalDownloadButton}
                  >
                    💾 Descargar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
