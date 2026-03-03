import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function CategoryFilter({ categories, selectedCategory, onCategoryChange }) {
  const hasFeatured = categories.includes('featured');
  const otherCategories = categories.filter(c => c !== 'featured');

  const btnClass = (key) => key === selectedCategory
    ? 'bg-slate-800 text-white hover:bg-slate-700 font-bold capitalize'
    : 'text-slate-700 hover:bg-white/50 hover:text-black hover:font-bold capitalize';

  return (
    <div className="backdrop-blur-md bg-white/90 border border-white/30 rounded-2xl px-6 py-4 shadow-lg">
      <div className="flex gap-2 items-center">
        {hasFeatured && (
          <Button
            onClick={() => onCategoryChange('featured')}
            variant={selectedCategory === 'featured' ? 'default' : 'ghost'}
            size="sm"
            className={btnClass('featured')}
          >
            Featured
          </Button>
        )}
        {otherCategories.map((category) => (
          <Button
            key={category}
            onClick={() => onCategoryChange(category)}
            variant={selectedCategory === category ? 'default' : 'ghost'}
            size="sm"
            className={btnClass(category)}
          >
            {category}
          </Button>
        ))}
        <Button
          onClick={() => onCategoryChange('all')}
          variant={selectedCategory === 'all' ? 'default' : 'ghost'}
          size="sm"
          className={btnClass('all')}
        >
          All
        </Button>
      </div>
    </div>
  );
}