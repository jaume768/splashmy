import { useState, useEffect } from 'react';
import StyleCard from './StyleCard';
import { fetchStyles, fetchStyleCategories } from '../../utils/api';
import styles from './StyleGrid.module.css';
import { useRouter } from 'next/router';

const StyleGrid = ({ searchTerm = '', selectedCategory = null, onStyleClick }) => {
  const [stylesData, setStylesData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Fetch styles and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch styles and categories in parallel using API utilities
        const [stylesResponse, categoriesResponse] = await Promise.all([
          fetchStyles(),
          fetchStyleCategories()
        ]);

        // Handle different response formats
        // If the response has a 'results' field (paginated), use that
        // Otherwise, assume it's a direct array
        const stylesData = Array.isArray(stylesResponse) 
          ? stylesResponse 
          : (stylesResponse?.results || []);
        
        const categoriesData = Array.isArray(categoriesResponse)
          ? categoriesResponse
          : (categoriesResponse?.results || []);

        setStylesData(stylesData);
        setCategories(categoriesData);
      } catch (err) {
        console.error('Error fetching styles data:', err);
        // Redirect to login on unauthorized/token invalid
        if (
          err?.status === 401 ||
          (typeof err?.message === 'string' && (err.message.includes('"status":401') || err.message.includes('Invalid token')))
        ) {
          try {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
          } catch (e) {}
          router.replace('/login');
          return;
        }
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter styles based on search term and category
  // Ensure stylesData is always an array to prevent filter errors
  const safeStylesData = Array.isArray(stylesData) ? stylesData : [];
  const filteredStyles = safeStylesData.filter(style => {
    const matchesSearch = !searchTerm || 
      style.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      style.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || 
      style.category_name === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading styles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>Error loading styles: {error}</p>
          <button 
            onClick={() => window.location.reload()}
            className={styles.retryButton}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (filteredStyles.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.noResults}>
          <p>No styles found matching your criteria.</p>
          {(searchTerm || selectedCategory) && (
            <p className={styles.suggestion}>
              Try adjusting your search or category filter.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Results info */}
      <div className={styles.resultsInfo}>
        <p>
          Showing {filteredStyles.length} of {safeStylesData.length} styles
          {selectedCategory && ` in "${selectedCategory}"`}
          {searchTerm && ` matching "${searchTerm}"`}
        </p>
      </div>

      {/* Styles grid */}
      <div className={styles.grid}>
        {filteredStyles.map((style) => (
          <StyleCard 
            key={style.id} 
            style={style} 
            onStyleClick={onStyleClick}
          />
        ))}
      </div>
    </div>
  );
};

export default StyleGrid;
