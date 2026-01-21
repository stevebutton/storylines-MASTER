import React from 'react';
import { Button } from '@/components/ui/button';

export default function CategoryFilter({ categories, selectedCategory, onCategoryChange }) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
      <div className="backdrop-blur-md bg-white/20 border border-white/30 rounded-full px-6 py-3 shadow-lg">
        <div className="flex gap-2 items-center">
          <Button
            onClick={() => onCategoryChange('all')}
            variant={selectedCategory === 'all' ? 'default' : 'ghost'}
            size="sm"
            className={selectedCategory === 'all' 
              ? 'bg-white text-slate-800 hover:bg-white/90' 
              : 'text-white hover:bg-white/20'}
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              onClick={() => onCategoryChange(category)}
              variant={selectedCategory === category ? 'default' : 'ghost'}
              size="sm"
              className={selectedCategory === category 
                ? 'bg-white text-slate-800 hover:bg-white/90' 
                : 'text-white hover:bg-white/20 capitalize'}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}