import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MapPin, Home, AlignLeft } from 'lucide-react';

const CHAPTER_COLORS = [
    '#d97706', // 0 amber
    '#2563eb', // 1 blue
    '#16a34a', // 2 green
    '#9333ea', // 3 purple
    '#e11d48', // 4 rose
    '#0d9488', // 5 teal
];

const THEME_FONTS = {
    c: 'Righteous, cursive',
    f: 'Oswald, sans-serif',
    k: 'Oswald, sans-serif',
};

export default function ChapterNavigation({ chapters, activeIndex, onNavigate, isOpen, onGoToStart, onGoToOverview, mapStyle = 'a' }) {
    const themeFont = THEME_FONTS[mapStyle] || 'Raleway, sans-serif';
    const activeColor = CHAPTER_COLORS[activeIndex % CHAPTER_COLORS.length] || '#d97706';
    const [hoveredIndex, setHoveredIndex] = useState(null);

    return (
        <motion.div
            className="fixed right-6 top-[120px] z-[200015]"
            initial={{ x: 300, opacity: 0 }}
            animate={{
                x: isOpen ? 0 : 300,
                opacity: isOpen ? 1 : 0,
                pointerEvents: isOpen ? 'auto' : 'none',
            }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
        >
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/50 px-6 py-4" style={{ minWidth: 270 }}>

                {/* Pre-chapter navigation */}
                {(onGoToStart || onGoToOverview) && (
                    <div className="space-y-1 mb-3 pb-3 border-b border-slate-200">
                        {onGoToStart && (
                            <button
                                onClick={onGoToStart}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all duration-300 text-left"
                            >
                                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                    <Home className="w-3.5 h-3.5 text-slate-500" />
                                </div>
                                <span className="text-sm font-medium text-slate-700" style={{ fontFamily: themeFont }}>
                                    Project Start
                                </span>
                            </button>
                        )}
                        {onGoToOverview && (
                            <button
                                onClick={onGoToOverview}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all duration-300 text-left"
                            >
                                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                    <AlignLeft className="w-3.5 h-3.5 text-slate-500" />
                                </div>
                                <span className="text-sm font-medium text-slate-700" style={{ fontFamily: themeFont }}>
                                    Overview
                                </span>
                            </button>
                        )}
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
                    <MapPin className="w-4 h-4" style={{ color: activeColor }} />
                    <span className="text-xs font-semibold tracking-wide uppercase text-slate-600" style={{ fontFamily: themeFont }}>
                        Chapters
                    </span>
                </div>

                {/* Chapter list */}
                <div className="space-y-1">
                    {chapters.map((chapter, index) => {
                        const color = CHAPTER_COLORS[index % CHAPTER_COLORS.length];
                        const isActive = activeIndex === index;
                        const isHovered = hoveredIndex === index;
                        const showColor = isActive || isHovered;

                        return (
                            <button
                                key={index}
                                onClick={() => onNavigate(index)}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 text-left"
                                style={isActive ? {
                                    backgroundColor: `${color}12`,
                                    border: `1px solid ${color}40`,
                                } : {}}
                            >
                                {/* Number badge */}
                                <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300"
                                    style={{
                                        backgroundColor: showColor ? color : '#e2e8f0',
                                        color: showColor ? 'white' : '#94a3b8',
                                    }}
                                >
                                    {index + 1}
                                </div>

                                {/* Title */}
                                <div className="flex-1 min-w-0">
                                    <p
                                        className="text-sm font-medium truncate transition-colors duration-300"
                                        style={{
                                            fontFamily: themeFont,
                                            color: showColor ? color : '#374151',
                                        }}
                                    >
                                        {chapter.name || `Chapter ${index + 1}`}
                                    </p>
                                    <p className="text-xs text-slate-400 truncate">
                                        {chapter.slides?.[0]?.location || chapter.location}
                                    </p>
                                </div>

                                {/* Active indicator dot */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeIndicator"
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: color }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Progress bar */}
                <div className="mt-4 pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                        <span style={{ fontFamily: themeFont }}>Progress</span>
                        <span className="font-medium" style={{ fontFamily: themeFont }}>
                            {activeIndex + 1} / {chapters.length}
                        </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: activeColor }}
                            initial={{ width: 0 }}
                            animate={{ width: `${((activeIndex + 1) / chapters.length) * 100}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
