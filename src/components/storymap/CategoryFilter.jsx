import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// One colour per category slot (cycles if more categories than colours)
const CATEGORY_COLORS = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
];

const FEATURED_COLOR = '#d97706'; // amber — matches app accent
const ALL_COLOR      = '#64748b'; // slate

function pill(color, selected) {
    return {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 14px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: selected ? 700 : 400,
        cursor: 'pointer',
        border: 'none',
        outline: 'none',
        background: color,
        color: 'white',
        boxShadow: selected ? `0 0 0 2px white` : 'none',
        transition: 'box-shadow 0.2s',
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
    };
}

const INACTIVE_CSS = `
  .cat-pill-inactive { filter: saturate(0.3); transition: filter 0.2s ease; }
  .cat-pill-inactive:hover { filter: saturate(1); }
`;

export default function CategoryFilter({ categories, selectedCategory, onCategoryChange }) {
    const [showTitle, setShowTitle] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setShowTitle(true), 2000);
        return () => clearTimeout(timer);
    }, []);

    const otherCategories = categories.filter(c => c !== 'featured');

    return (
        <>
        <style>{INACTIVE_CSS}</style>
        <div className="backdrop-blur-xl px-6 shadow-lg"
             style={{ background: 'rgba(15,23,42,0.25)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '999px', paddingTop: '30px', paddingBottom: '30px' }}>
            <div className="flex items-center gap-6">

                {/* Left — title */}
                {showTitle && (
                    <motion.span
                        className="text-sm text-white/90 whitespace-nowrap flex-shrink-0"
                        style={{ fontFamily: 'Raleway, sans-serif', fontWeight: 500 }}
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 2, ease: 'easeOut' }}
                    >
                        Explore the Stories
                    </motion.span>
                )}

                {/* Right — category pills */}
                <div className="flex items-center flex-nowrap" style={{ gap: '18px' }}>
                    <button
                        onClick={() => onCategoryChange('featured')}
                        style={pill(FEATURED_COLOR, selectedCategory === 'featured')}
                        className={selectedCategory !== 'featured' ? 'cat-pill-inactive' : ''}
                    >
                        Featured
                    </button>

                    {otherCategories.map((category, i) => (
                        <button
                            key={category}
                            onClick={() => onCategoryChange(category)}
                            style={pill(CATEGORY_COLORS[i % CATEGORY_COLORS.length], selectedCategory === category)}
                            className={selectedCategory !== category ? 'cat-pill-inactive' : ''}
                        >
                            {category}
                        </button>
                    ))}

                    <button
                        onClick={() => onCategoryChange('all')}
                        style={pill(ALL_COLOR, selectedCategory === 'all')}
                        className={selectedCategory !== 'all' ? 'cat-pill-inactive' : ''}
                    >
                        All
                    </button>
                </div>
            </div>
        </div>
        </>
    );
}
