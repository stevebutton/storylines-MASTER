import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MapPin } from 'lucide-react';

export default function ChapterNavigation({ chapters, activeIndex, onNavigate, isOpen, hideForFullscreen }) {
    return (
        <motion.div 
            className="fixed right-6 top-[120px] z-[100]"
            initial={{ x: 300, opacity: 0 }}
            animate={{ 
                x: isOpen ? 0 : 300, 
                opacity: (isOpen && !hideForFullscreen) ? 1 : 0,
                display: hideForFullscreen ? 'none' : 'block'
            }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ 
                duration: isOpen ? 1.5 : 1,
                ease: "easeInOut"
            }}
        >
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/50 p-4 min-w-[220px]">
                {/* Header */}
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
                    <MapPin className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-semibold tracking-wide uppercase text-slate-600">
                        Chapters
                    </span>
                </div>
                
                {/* Chapter list */}
                <div className="space-y-1">
                    {chapters.map((chapter, index) => (
                        <button
                            key={index}
                            onClick={() => onNavigate(index)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 text-left",
                                activeIndex === index 
                                    ? "bg-amber-50 border border-amber-200" 
                                    : "hover:bg-slate-50"
                            )}
                        >
                            {/* Number badge */}
                            <div className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0",
                                activeIndex === index 
                                    ? "bg-amber-600 text-white" 
                                    : "bg-slate-100 text-slate-500"
                            )}>
                                {index + 1}
                            </div>
                            
                            {/* Title */}
                            <div className="flex-1 min-w-0">
                                <p className={cn(
                                    "text-sm font-medium truncate transition-colors",
                                    activeIndex === index 
                                        ? "text-amber-900" 
                                        : "text-slate-700"
                                )}>
                                    {chapter.name || `Chapter ${index + 1}`}
                                </p>
                                <p className="text-xs text-slate-400 truncate">
                                    {chapter.slides?.[0]?.location || chapter.location}
                                </p>
                            </div>
                            
                            {/* Active indicator */}
                            {activeIndex === index && (
                                <motion.div 
                                    layoutId="activeIndicator"
                                    className="w-2 h-2 rounded-full bg-amber-600 shrink-0"
                                />
                            )}
                        </button>
                    ))}
                </div>
                
                {/* Progress bar */}
                <div className="mt-4 pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                        <span>Progress</span>
                        <span className="font-medium">{activeIndex + 1} / {chapters.length}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full"
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