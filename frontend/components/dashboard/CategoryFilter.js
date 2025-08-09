import styles from '../../styles/Dashboard.module.css';

export default function CategoryFilter({ selectedCategory, categories, onCategoryChange, loadingCategories }) {
  return (
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
}
