import React, { useState, useEffect } from 'react';
import { getAuthToken, getApiBaseUrl } from '../../utils/api';

const AuthenticatedImage = ({ 
  src, 
  alt, 
  className, 
  isPrivate = false,
  fallbackSrc = null,
  ...props 
}) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) return;

    // If it's not a private image, use direct URL
    if (!isPrivate) {
      setImageSrc(src);
      return;
    }

    // For private images, fetch with authentication
    const fetchAuthenticatedImage = async () => {
      try {
        setLoading(true);
        setError(false);
        
        const token = getAuthToken();
        if (!token) {
          setError(true);
          return;
        }

        // Convert s3_url to authenticated proxy URL
        let imageUrl = src;
        if (src.includes('/media/processed/') || src.includes('/media/images/')) {
          // Extract the path after /media/
          const mediaIndex = src.indexOf('/media/');
          if (mediaIndex !== -1) {
            const mediaPath = src.substring(mediaIndex + 7); // Remove '/media/'
            imageUrl = `${getApiBaseUrl()}/api/v1/media/${mediaPath}`;
          }
        }

        const response = await fetch(imageUrl, {
          headers: {
            'Authorization': `Token ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const objectURL = URL.createObjectURL(blob);
        setImageSrc(objectURL);
      } catch (err) {
        console.error('Error fetching authenticated image:', err);
        setError(true);
        if (fallbackSrc) {
          setImageSrc(fallbackSrc);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAuthenticatedImage();

    // Cleanup blob URL on unmount
    return () => {
      if (imageSrc && imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [src, isPrivate, fallbackSrc]);

  if (loading) {
    return (
      <div className={className} style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f0f0f0',
        minHeight: '100px'
      }}>
        <div style={{ fontSize: '12px', color: '#666' }}>Cargando...</div>
      </div>
    );
  }

  if (error && !imageSrc) {
    return (
      <div className={className} style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        minHeight: '100px'
      }}>
        <div style={{ fontSize: '12px', color: '#999' }}>❌ Error</div>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      {...props}
    />
  );
};

export default AuthenticatedImage;
