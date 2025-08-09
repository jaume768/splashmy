import React from 'react';
import StyleGrid from '../../styles/StyleGrid';

export default function ExploreView({ searchTerm, selectedCategory, onStyleClick }) {
  return (
    <StyleGrid
      searchTerm={searchTerm}
      selectedCategory={selectedCategory}
      onStyleClick={onStyleClick}
    />
  );
}
