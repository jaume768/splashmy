import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../contexts/AuthContext';
import { getUserProcessingResults, downloadProcessingResult, toggleProcessingResultVisibility, deleteProcessingResult } from '../../../utils/api';
import AuthenticatedImage from '../../ui/AuthenticatedImage';
import ImageShimmer from '../../ui/ImageShimmer';
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
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      if (res.success) {
        // Download handled automatically by the function
        console.log(`Downloaded: ${res.filename}`);
      } else {
        alert('No se pudo descargar la imagen.');
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

  const handleDeleteImage = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedImage) return;
    
    try {
      setDeleteLoading(true);
      await deleteProcessingResult(selectedImage.id);
      
      // Remove the deleted image from the creations list
      setCreations((prev) => prev.filter((creation) => creation.id !== selectedImage.id));
      
      // Close the modal and confirmation dialog
      setSelectedImage(null);
      setShowDeleteConfirm(false);
      
      // Show success message (optional)
      // You could add a toast notification here if you have one
      
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('No se pudo eliminar la imagen. Inténtalo de nuevo.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
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
        {loading && !error && (
          <ImageShimmer count={12} type="gallery" />
        )}

        {error && (
          <div className={styles.error}>
            <p>{error}</p>
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
                  {creation.is_public ? (
                    <img
                      src={creation.s3_url}
                      alt={`Creación ${creation.id}`}
                      className={styles.creationImage}
                    />
                  ) : (
                    <AuthenticatedImage
                      src={creation.s3_url}
                      alt={`Creación ${creation.id}`}
                      className={styles.creationImage}
                      isPrivate={true}
                    />
                  )}
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
              ×
            </button>

            <div className={styles.modalImageContainer}>
              {selectedImage.is_public ? (
                <img src={selectedImage.s3_url} alt={`Creación ${selectedImage.id}`} className={styles.fullImage} />
              ) : (
                <AuthenticatedImage
                  src={selectedImage.s3_url}
                  alt={`Creación ${selectedImage.id}`}
                  className={styles.fullImage}
                  isPrivate={true}
                />
              )}
            </div>

            <div className={styles.modalFooter}>
              <div className={styles.modalInfo}>
                <span className={`${styles.statusBadge} ${selectedImage.is_public ? styles.statusPublic : styles.statusPrivate}`}>
                  {selectedImage.is_public ? 'Pública' : 'Privada'}
                </span>
                <span className={styles.dateInfo}>{formatDate(selectedImage.created_at)}</span>
              </div>
              
              <div className={styles.modalControls}>
                <button 
                  onClick={() => handleDownload(selectedImage)} 
                  className={styles.actionButton} 
                  disabled={downloadLoading}
                  title="Descargar"
                >
                  {downloadLoading ? '⏳' : '⬇️'}
                </button>
                <button 
                  onClick={() => handleToggleVisibility(selectedImage)} 
                  className={styles.actionButton} 
                  disabled={visibilityLoading}
                  title={selectedImage.is_public ? 'Hacer privada' : 'Hacer pública'}
                >
                  {visibilityLoading ? '⏳' : (selectedImage.is_public ? '🔓' : '🔒')}
                </button>
                <button 
                  onClick={handleDeleteImage} 
                  className={styles.deleteButton} 
                  disabled={deleteLoading}
                  title="Eliminar"
                >
                  {deleteLoading ? '⏳' : '🗑️'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {showDeleteConfirm && (
        <div className={styles.confirmModal} onClick={cancelDelete}>
          <div className={styles.confirmContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmHeader}>
              <h3>¿Eliminar imagen?</h3>
            </div>
            <div className={styles.confirmBody}>
              <p>Esta acción no se puede deshacer. La imagen será eliminada de tu galería permanentemente.</p>
            </div>
            <div className={styles.confirmActions}>
              <button onClick={cancelDelete} className={styles.cancelButton} disabled={deleteLoading}>
                Cancelar
              </button>
              <button onClick={confirmDelete} className={styles.confirmButton} disabled={deleteLoading}>
                {deleteLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
