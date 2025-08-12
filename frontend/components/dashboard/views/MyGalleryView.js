import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../contexts/AuthContext';
import { getUserProcessingResults, downloadProcessingResult, toggleProcessingResultVisibility } from '../../../utils/api';
import styles from '../../../styles/MyCreations.module.css';

export default function MyGalleryView({ onExploreClick }) {
  const router = useRouter();
  const { user, authenticated } = useAuth();
  const [creations, setCreations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [visibilityLoading, setVisibilityLoading] = useState(false);

  useEffect(() => {
    if (!authenticated) return; // navigation should handle redirect; avoid flashing
    fetchUserCreations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  const fetchUserCreations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUserProcessingResults();
      setCreations(data?.results || []);
    } catch (err) {
      console.error('Error fetching user creations:', err);
      // If unauthorized, clear and redirect to login
      if (
        err?.status === 401 ||
        (typeof err?.message === 'string' && (err.message.includes('"status":401') || err.message.includes('Invalid token')))
      ) {
        try {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
        } catch {}
        router.replace('/login');
        return;
      }
      setError('Error al cargar tus creaciones. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (creation) => setSelectedImage(creation);
  const closeImageModal = () => setSelectedImage(null);

  const handleDownload = async (creation) => {
    try {
      setDownloadLoading(true);
      const res = await downloadProcessingResult(creation.id);
      const url = res.download_url || res.url || creation.s3_url;
      if (url) {
        window.open(url, '_blank');
      } else {
        alert('No se pudo obtener el enlace de descarga.');
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('No se pudo descargar la imagen.');
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleToggleVisibility = async (creation) => {
    try {
      if (!authenticated) {
        alert('Debes iniciar sesión para cambiar la visibilidad.');
        return;
      }
      // In MyGallery, user is owner of their results
      setVisibilityLoading(true);
      const res = await toggleProcessingResultVisibility(creation.id);
      const newPublic = !!res.is_public;
      // Update list and selected
      setCreations((prev) => prev.map((it) => (
        it.id === creation.id ? { ...it, is_public: newPublic } : it
      )));
      setSelectedImage((prev) => prev && prev.id === creation.id ? { ...prev, is_public: newPublic } : prev);
    } catch (error) {
      console.error('Error toggling visibility:', error);
      alert('No se pudo cambiar la visibilidad.');
    } finally {
      setVisibilityLoading(false);
    }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className={styles.container}>
      {/* Header inside content area (no back button) */}
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Mis Creaciones</h1>
          <p className={styles.subtitle}>Todas tus obras de arte AI en un solo lugar</p>
        </div>

        {authenticated && user && (
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user.first_name || user.username}</span>
            <span className={styles.creationsCount}>{creations.length} creaciones</span>
          </div>
        )}
      </header>

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
            <button onClick={fetchUserCreations} className={styles.retryButton}>Reintentar</button>
          </div>
        )}

        {!loading && !error && creations.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎨</div>
            <h2 className={styles.emptyTitle}>Aún no tienes creaciones</h2>
            <p className={styles.emptyMessage}>Comienza creando tu primera obra de arte AI</p>
            {typeof onExploreClick === 'function' && (
              <button onClick={onExploreClick} className={styles.createButton}>Explorar Estilos</button>
            )}
          </div>
        )}

        {!loading && !error && creations.length > 0 && (
          <div className={styles.gallery}>
            {creations.map((creation) => (
              <div key={creation.id} className={styles.creationCard}>
                <div className={styles.imageContainer} onClick={() => handleImageClick(creation)}>
                  <img
                    src={creation.s3_url}
                    alt={`Creación ${creation.id}`}
                    className={styles.creationImage}
                  />
                </div>

                <div className={styles.cardInfo}>
                  <div className={styles.cardMeta}>
                    <span className={styles.creationDate}>{formatDate(creation.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

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
              <img src={selectedImage.s3_url} alt={`Creación ${selectedImage.id}`} className={styles.fullImage} />
            </div>

            <div className={styles.modalInfo}>
              <div className={styles.modalMeta}>
                <h3>Detalles de la creación</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleDownload(selectedImage)} className={styles.modalDownloadButton} disabled={downloadLoading}>
                    {downloadLoading ? 'Descargando…' : '💾 Descargar'}
                  </button>
                  <button onClick={() => handleToggleVisibility(selectedImage)} className={styles.modalActionButton} disabled={visibilityLoading} title={selectedImage.is_public ? 'Hacer privada' : 'Hacer pública'}>
                    {visibilityLoading ? 'Guardando…' : (selectedImage.is_public ? 'Hacer privada' : 'Hacer pública')}
                  </button>
                </div>
              </div>
              <div className={styles.modalDetails}>
                <span className={`${styles.badge} ${selectedImage.is_public ? styles.badgePublic : styles.badgePrivate}`}>
                  {selectedImage.is_public ? 'Pública' : 'Privada'}
                </span>
                <span className={styles.dateText}>{formatDate(selectedImage.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
