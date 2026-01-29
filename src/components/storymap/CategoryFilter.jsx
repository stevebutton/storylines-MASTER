import React from 'react';
import { Button } from '@/components/ui/button';

export default function CategoryFilter({ categories, selectedCategory, onCategoryChange }) {
  return (
    <div className="backdrop-blur-md bg-white/90 border border-white/30 rounded-2xl px-6 py-4 shadow-lg">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">Story Categories</h3>
      <div className="flex gap-2 items-center flex-wrap">
        <Button
          onClick={() => onCategoryChange('all')}
          variant={selectedCategory === 'all' ? 'default' : 'ghost'}
          size="sm"
          className={selectedCategory === 'all' 
            ? 'bg-slate-800 text-white hover:bg-slate-700 font-bold' 
            : 'text-slate-700 hover:bg-white/50 hover:text-black hover:font-bold'}
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
              ? 'bg-slate-800 text-white hover:bg-slate-700 font-bold capitalize' 
              : 'text-slate-700 hover:bg-white/50 hover:text-black hover:font-bold capitalize'}
          >
            {category}
          </Button>
        ))}
      </div>
    </div>
  );
}