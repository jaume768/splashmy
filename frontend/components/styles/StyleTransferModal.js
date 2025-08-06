import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '../../contexts/AuthContext';
import { uploadImage, createStyleTransferJob, getJobStatus } from '../../utils/api';
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
  
  // Opciones de configuración
  const [quality, setQuality] = useState('medium');
  const [size, setSize] = useState('1024x1024');
  const [jobId, setJobId] = useState(null);

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
          setProcessingStep('¡Completado!');
          setIsProcessing(false);
          onComplete(jobStatus);
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
        size
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
        <div className={styles.content}>
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

          {/* Configuración avanzada */}
          {uploadedImage && (
            <div className={styles.optionsSection}>
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

          {/* Estado de procesamiento */}
          {isProcessing && (
            <div className={styles.processingSection}>
              <div className={styles.processingContent}>
                <div className={styles.spinner}></div>
                <p className={styles.processingText}>{processingStep}</p>
                <div className={styles.processingBar}>
                  <div className={styles.processingProgress}></div>
                </div>
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
          <button
            onClick={handleClose}
            className={styles.cancelButton}
            disabled={isProcessing}
          >
            Cancelar
          </button>
          <button
            onClick={handleStyleTransfer}
            className={styles.applyButton}
            disabled={!uploadedImage || isProcessing}
          >
            {isProcessing ? 'Procesando...' : 'Aplicar Estilo'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StyleTransferModal;
