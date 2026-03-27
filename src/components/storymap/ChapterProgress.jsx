import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const CHAPTER_COLORS = [
    '#d97706', // 0 amber
    '#2563eb', // 1 blue
    '#16a34a', // 2 green
    '#9333ea', // 3 purple
    '#e11d48', // 4 rose
    '#0d9488', // 5 teal
];

export default function ChapterProgress({
    totalChapters,
    activeIndex,
    onNavigate,
    hideForFullscreen
}) {
    const [hoveredIndex, setHoveredIndex] = useState(null);

    if (totalChapters === 0) return null;

    const canGoPrev = activeIndex > 0;
    const canGoNext = activeIndex < totalChapters - 1;

    return (
        <motion.div
            className="fixed right-4 top-1/2 -translate-y-1/2 z-[70] flex flex-col items-center gap-3 drop-shadow-xl"
            initial={{ opacity: 1 }}
            animate={{ opacity: hideForFullscreen ? 0 : 1 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
        >
            {/* Previous button */}
            <button
                onClick={() => canGoPrev && onNavigate(activeIndex - 1)}
                disabled={!canGoPrev}
                className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg",
                    canGoPrev
                        ? "bg-white/25 hover:bg-white/50 text-slate-700 hover:scale-110 cursor-pointer"
                        : "bg-white/50 text-slate-300 cursor-not-allowed"
                )}
            >
                <ChevronUp className="w-5 h-5" />
            </button>

            {/* Progress dots */}
            <div className="bg-white/25 backdrop-blur-sm rounded-full py-3 px-2 shadow-lg flex flex-col items-center" style={{ gap: 22 }}>
                {Array.from({ length: totalChapters }).map((_, index) => {
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
                            className="w-5 h-5 rounded-full transition-all duration-300 flex-shrink-0"
                            style={{
                                backgroundColor: showColor ? color : '#e2e8f0',
                                transform: isActive ? 'scale(1.15)' : 'scale(1)',
                            }}
                            title={`Chapter ${index + 1}`}
                        />
                    );
                })}
            </div>

            {/* Next button */}
            <button
                onClick={() => canGoNext && onNavigate(activeIndex + 1)}
                disabled={!canGoNext}
                className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg",
                    canGoNext
                        ? "bg-white/25 hover:bg-white/50 text-slate-700 hover:scale-110 cursor-pointer"
                        : "bg-white/50 text-slate-300 cursor-not-allowed"
                )}
            >
                <ChevronDown className="w-5 h-5" />
            </button>
        </motion.div>
    );
}
