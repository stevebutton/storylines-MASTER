import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function ChapterNavigation({ chapters, activeIndex, onNavigate }) {
    return (
        <div className="fixed left-6 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col items-center gap-3">
            {chapters.map((chapter, index) => (
                <button
                    key={index}
                    onClick={() => onNavigate(index)}
                    className="group relative flex items-center"
                >
                    {/* Dot */}
                    <motion.div
                        className={cn(
                            "w-2.5 h-2.5 rounded-full transition-all duration-300",
                            activeIndex === index 
                                ? "bg-amber-600 scale-125" 
                                : "bg-white/60 hover:bg-white/90 border border-slate-400/30"
                        )}
                        whileHover={{ scale: 1.3 }}
                    />
                    
                    {/* Tooltip */}
                    <div className={cn(
                        "absolute left-6 px-3 py-1.5 rounded-lg",
                        "bg-slate-900/90 backdrop-blur-sm",
                        "opacity-0 group-hover:opacity-100 pointer-events-none",
                        "transition-all duration-200 transform -translate-x-2 group-hover:translate-x-0",
                        "whitespace-nowrap"
                    )}>
                        <span className="text-xs text-white font-medium">
                            {chapter.title}
                        </span>
                    </div>
                </button>
            ))}
            
            {/* Progress line */}
            <div className="absolute top-0 left-[4px] w-0.5 h-full bg-slate-300/30 -z-10 rounded-full">
                <motion.div 
                    className="w-full bg-amber-600/60 rounded-full origin-top"
                    style={{ 
                        height: `${((activeIndex + 1) / chapters.length) * 100}%` 
                    }}
                    transition={{ duration: 0.5 }}
                />
            </div>
        </div>
    );
}