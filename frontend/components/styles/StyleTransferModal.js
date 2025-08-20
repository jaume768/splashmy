import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '../../contexts/AuthContext';
import { uploadImage, createStyleTransferJob, getJobStatus, getJobResults, downloadProcessingResult } from '../../utils/api';
import AuthenticatedImage from '../ui/AuthenticatedImage';
import styles from './StyleTransferModal.module.css';

const StyleTransferModal = ({ isOpen, onClose, selectedStyle, onComplete }) => {
  const { user, token } = useAuth();
  const fileInputRef = useRef(null);
  
  // Estado del modal
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  
  // Estados para mostrar resultados
  const [processingComplete, setProcessingComplete] = useState(false);
  const [processingResult, setProcessingResult] = useState(null);
  const [downloadingResult, setDownloadingResult] = useState(false);
  
  // Opciones de configuración
  const [quality, setQuality] = useState('medium');
  const [size, setSize] = useState('1024x1024');
  const [jobId, setJobId] = useState(null);
  const [isPublic, setIsPublic] = useState(false);

  // Limpiar estado cuando se cierra el modal
  const resetModal = useCallback(() => {
    setUploadedImage(null);
    setImagePreview(null);
    setCustomPrompt('');
    setIsProcessing(false);
    setProcessingStep('');
    setUploadProgress(0);
    setError(null);
    setJobId(null);
    setProcessingComplete(false);
    setProcessingResult(null);
    setDownloadingResult(false);
    setIsPublic(false);
  }, []);

  // Manejar cierre del modal
  const handleClose = useCallback(() => {
    if (!isProcessing) {
      resetModal();
      onClose();
    }
  }, [isProcessing, resetModal, onClose]);

  // Manejar selección de archivo
  const handleFileSelect = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      handleImageUpload(file);
    }
  }, []);

  // Validar imagen
  const validateImage = (file) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Formato no válido. Usa JPEG, PNG o WebP.');
    }
    
    if (file.size > maxSize) {
      throw new Error('Imagen muy grande. Máximo 10MB.');
    }
  };

  // Manejar upload de imagen
  const handleImageUpload = async (file) => {
    try {
      setError(null);
      validateImage(file);
      
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
      
      setUploadedImage(file);
    } catch (err) {
      setError(err.message);
    }
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageUpload(files[0]);
    }
  }, []);

  // Polling para verificar estado del job
  const pollJobStatus = async (jobId) => {
    const maxAttempts = 60; // 5 minutos máximo
    const pollInterval = 5000; // 5 segundos
    let attempts = 0;

    const poll = async () => {
      try {
        const jobStatus = await getJobStatus(jobId);
        
        if (jobStatus.status === 'completed') {
          setProcessingStep('Obteniendo resultados...');
          try {
            // Obtener los resultados completos del job
            const resultData = await getJobResults(jobId);
            setProcessingResult(resultData);
            setProcessingComplete(true);
            setIsProcessing(false);
            setProcessingStep('¡Completado!');
            // No llamamos onComplete aquí para mantener el modal abierto
          } catch (err) {
            console.error('Error getting job results:', err);
            setError('Error al obtener los resultados');
            setIsProcessing(false);
          }
          return;
        }
        
        if (jobStatus.status === 'failed') {
          throw new Error(jobStatus.error_message || 'Error en el procesamiento');
        }
        
        // Actualizar estado
        const statusMessages = {
          'pending': 'Iniciando procesamiento...',
          'moderating': 'Verificando contenido...',
          'processing': 'Aplicando estilo con IA...',
          'streaming': 'Generando resultado...'
        };
        
        setProcessingStep(statusMessages[jobStatus.status] || 'Procesando...');
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, pollInterval);
        } else {
          throw new Error('Tiempo de espera agotado');
        }
      } catch (err) {
        setError(err.message);
        setIsProcessing(false);
      }
    };

    poll();
  };

  // Manejar descarga del resultado
  const handleDownloadResult = async (resultId) => {
    try {
      setDownloadingResult(true);
      const downloadData = await downloadProcessingResult(resultId);
      
      if (downloadData.success) {
        // Download handled automatically by the function
      } else {
        setError('Error al descargar la imagen');
      }
    } catch (err) {
      console.error('Error downloading result:', err);
      setError('Error al descargar la imagen');
    } finally {
      setDownloadingResult(false);
    }
  };

  // Manejar cierre con resultado completo
  const handleCloseWithResult = () => {
    if (processingResult && onComplete) {
      onComplete(processingResult);
    }
    resetModal();
    onClose();
  };

  // Procesar style transfer
  const handleStyleTransfer = async () => {
    if (!uploadedImage || !selectedStyle) return;

    try {
      setIsProcessing(true);
      setError(null);
      setProcessingStep('Subiendo imagen...');

      // 1. Subir imagen
      const uploadResult = await uploadImage(uploadedImage, {
        title: `Style transfer - ${selectedStyle.name}`,
        description: customPrompt || `Aplicando estilo ${selectedStyle.name}`
      });

      setProcessingStep('Creando job de procesamiento...');

      // 2. Crear job de style transfer
      const jobResult = await createStyleTransferJob({
        original_image_id: uploadResult.image.id,
        style_id: selectedStyle.id,
        prompt: customPrompt || `Convertir al estilo ${selectedStyle.name}`,
        quality,
        size,
        is_public: isPublic
      });

      setJobId(jobResult.job_id);
      setProcessingStep('Procesando con IA...');

      // 3. Hacer polling del estado
      await pollJobStatus(jobResult.job_id);

    } catch (err) {
      setError(err.message);
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  // No renderizar si no está abierto
  if (!isOpen || !selectedStyle) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header mobile-first */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h2 className={styles.title}>Aplicar Estilo</h2>
            <p className={styles.styleName}>{selectedStyle.name}</p>
          </div>
          <button
            onClick={handleClose}
            className={styles.closeButton}
            disabled={isProcessing}
            aria-label="Cerrar modal"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido principal - Stack vertical mobile-first */}
        <div className={`${styles.content} ${processingComplete ? styles.resultOnlyMode : ''}`}>
          {/* Preview del estilo */}
          <div className={styles.stylePreview}>
            <div className={styles.previewImage}>
              {selectedStyle.thumbnail || selectedStyle.preview_image ? (
                <Image
                  src={selectedStyle.thumbnail || selectedStyle.preview_image}
                  alt={selectedStyle.name}
                  fill
                  className={styles.styleImage}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className={styles.noImagePlaceholder}>
                  <span>Sin preview</span>
                </div>
              )}
            </div>
            <div className={styles.styleInfo}>
              <p className={styles.styleDescription}>{selectedStyle.description}</p>
              <div className={styles.categoryBadge} style={{ backgroundColor: selectedStyle.category_color }}>
                {selectedStyle.category_name}
              </div>
            </div>
          </div>

          {/* Upload de imagen */}
          <div className={styles.uploadSection}>
            <h3 className={styles.sectionTitle}>Tu imagen</h3>
            
            {!imagePreview ? (
              <div
                className={styles.uploadArea}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className={styles.uploadContent}>
                  <svg className={styles.uploadIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className={styles.uploadText}>
                    <span className={styles.uploadPrimary}>Toca para subir</span>
                    <span className={styles.uploadSecondary}>o arrastra una imagen aquí</span>
                  </p>
                  <p className={styles.uploadFormats}>JPEG, PNG o WebP (máx. 10MB)</p>
                </div>
              </div>
            ) : (
              <div className={styles.imagePreview}>
                <Image
                  src={imagePreview}
                  alt="Vista previa"
                  fill
                  className={styles.previewImg}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <button
                  onClick={() => {
                    setUploadedImage(null);
                    setImagePreview(null);
                  }}
                  className={styles.removeImage}
                  disabled={isProcessing}
                  aria-label="Remover imagen"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className={styles.hiddenInput}
              disabled={isProcessing}
            />
          </div>

          {/* Visibilidad de la imagen generada */}
          <div className={styles.visibilitySection}>
            <label className={styles.switchLabel}>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                disabled={isProcessing}
              />
              <span>Hacer pública la imagen generada</span>
            </label>
            <p className={styles.switchHint}>Si está desactivado, la imagen será privada (solo tú podrás verla).</p>
          </div>

          {/* Configuración avanzada */}
          {uploadedImage && (
            <div className={`${styles.optionsSection} ${styles.hiddenSection}`}>
              <h3 className={styles.sectionTitle}>Configuración</h3>
              
              {/* Prompt personalizado */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Descripción personalizada (opcional)</label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={`Ejemplo: Convertir esta imagen al estilo ${selectedStyle.name} con más detalles...`}
                  className={styles.textarea}
                  rows={3}
                  disabled={isProcessing}
                />
              </div>

              {/* Calidad y tamaño */}
              <div className={styles.optionsRow}>
                <div className={styles.optionGroup}>
                  <label className={styles.label}>Calidad</label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className={styles.select}
                    disabled={isProcessing}
                  >
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
                
                <div className={styles.optionGroup}>
                  <label className={styles.label}>Tamaño</label>
                  <select
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className={styles.select}
                    disabled={isProcessing}
                  >
                    <option value="1024x1024">Cuadrado</option>
                    <option value="1536x1024">Horizontal</option>
                    <option value="1024x1536">Vertical</option>
                  </select>
                </div>
              </div>
            </div>
          )}


          {/* Sección de resultados */}
          {processingComplete && processingResult && processingResult.results && processingResult.results.length > 0 && (
            <div className={styles.resultSection}>
              <h3 className={styles.sectionTitle}>¡Resultado listo!</h3>
              
              {/* Comparación antes/después */}
              <div className={styles.beforeAfter}>
                <div className={styles.imageComparison}>
                  <div className={styles.imageContainer}>
                    <p className={styles.imageLabel}>Original</p>
                    <div className={styles.imageWrapper}>
                      {imagePreview && (
                        <img 
                          src={imagePreview} 
                          alt="Original" 
                          className={styles.comparisonImage}
                        />
                      )}
                    </div>
                  </div>
                  
                  <div className={styles.arrowContainer}>
                    <svg className={styles.arrowIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                  
                  <div className={styles.imageContainer}>
                    <p className={styles.imageLabel}>Con estilo {selectedStyle.name}</p>
                    <div className={styles.imageWrapper}>
                      {processingResult.results[0].s3_url && (
                        <AuthenticatedImage 
                          src={processingResult.results[0].s3_url} 
                          alt="Resultado estilizado" 
                          className={styles.comparisonImage}
                          isPrivate={!isPublic}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Información del resultado */}
              <div className={styles.resultInfo}>
                <div className={styles.resultStats}>
                  <span className={styles.statItem}>
                    <strong>Calidad:</strong> {processingResult.results[0].result_quality}
                  </span>
                  <span className={styles.statItem}>
                    <strong>Tamaño:</strong> {processingResult.results[0].result_size}
                  </span>
                  <span className={styles.statItem}>
                    <strong>Formato:</strong> {processingResult.results[0].result_format.toUpperCase()}
                  </span>
                  {processingResult.job.processing_time && (
                    <span className={styles.statItem}>
                      <strong>Tiempo:</strong> {Math.round(processingResult.job.processing_time)}s
                    </span>
                  )}
                </div>
              </div>
              
              {/* Acciones del resultado */}
              <div className={styles.resultActions}>
                <button
                  onClick={() => handleDownloadResult(processingResult.results[0].id)}
                  className={styles.downloadButton}
                  disabled={downloadingResult}
                >
                  <svg className={styles.buttonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {downloadingResult ? 'Descargando...' : 'Descargar'}
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className={styles.errorSection}>
              <div className={styles.errorContent}>
                <svg className={styles.errorIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className={styles.errorText}>{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer con botones */}
        <div className={styles.footer}>
          {processingComplete && processingResult && processingResult.results && processingResult.results.length > 0 ? (
            <button
              onClick={handleCloseWithResult}
              className={styles.completeButton}
            >
              <svg className={styles.buttonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Completar
            </button>
          ) : (
            <button
              onClick={handleStyleTransfer}
              className={styles.applyButton}
              disabled={!uploadedImage || isProcessing}
            >
              {isProcessing ? 'Procesando...' : 'Aplicar Estilo'}
            </button>
          )}
        </div>

        {/* Modal de procesamiento superpuesto */}
        {isProcessing && (
          <div className={styles.processingOverlay}>
            <div className={styles.processingModal}>
              <div className={styles.processingContent}>
                <div className={styles.spinner}></div>
                <p className={styles.processingText}>{processingStep}</p>
                <div className={styles.processingBar}>
                  <div className={styles.processingProgress}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StyleTransferModal;
