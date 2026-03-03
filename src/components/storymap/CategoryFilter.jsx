import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function CategoryFilter({ categories, selectedCategory, onCategoryChange }) {
  const [showTitle, setShowTitle] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowTitle(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Featured is always a fixed first pill; other categories come from story data (minus 'featured')
  const otherCategories = categories.filter(c => c !== 'featured');

  const btnClass = (key) => key === selectedCategory
    ? 'bg-slate-800 text-white hover:bg-slate-700 font-bold capitalize'
    : 'text-slate-700 hover:bg-white/50 hover:text-black hover:font-bold capitalize';

  return (
    <div className="backdrop-blur-md bg-white/90 border border-white/30 rounded-2xl px-6 py-4 shadow-lg">
      <div className="flex items-center gap-6">
        {showTitle && (
          <motion.h2
            className="text-base text-black whitespace-nowrap"
            style={{ fontFamily: 'Raleway, sans-serif', fontWeight: 500 }}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 2, ease: 'easeOut' }}
          >
            Explore the Stories
          </motion.h2>
        )}
        <div className="flex gap-2 items-center">
          <Button
            onClick={() => onCategoryChange('featured')}
            variant={selectedCategory === 'featured' ? 'default' : 'ghost'}
            size="sm"
            className={btnClass('featured')}
          >
            Featured
          </Button>
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
    </div>
  );
}