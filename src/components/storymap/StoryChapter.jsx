import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import ChapterCarousel from './ChapterCarousel';

export default function StoryChapter({ 
    chapter, 
    isActive, 
    alignment = 'left',
    index 
}) {
    return (
        <div 
            className="min-h-screen flex items-center py-24 px-4 md:px-8 justify-end"
        >
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                viewport={{ once: false, amount: 0.5 }}
                className="relative max-w-md"
            >
                {/* Card */}
                <div className={cn(
                    "backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl",
                    "bg-white/90 dark:bg-slate-900/90",
                    "border border-white/20"
                )}>
                    {/* Image Carousel */}
                    {chapter.images && chapter.images.length > 0 && (
                        <ChapterCarousel images={chapter.images} title={chapter.title} />
                    )}
                    
                    {/* Content */}
                    <div className="p-6 md:p-8">
                        {/* Chapter number */}
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-xs font-medium tracking-[0.2em] uppercase text-amber-600">
                                Chapter {String(index + 1).padStart(2, '0')}
                            </span>
                            <div className="flex-1 h-px bg-gradient-to-r from-amber-600/50 to-transparent" />
                        </div>
                        
                        {/* Title */}
                        <h2 className="text-2xl md:text-3xl font-light text-slate-800 mb-4 leading-tight">
                            {chapter.title}
                        </h2>
                        
                        {/* Description */}
                        <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                            {chapter.description}
                        </p>
                        
                        {/* Location badge */}
                        {chapter.location && (
                            <div className="mt-6 pt-4 border-t border-slate-200/50">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="font-medium">{chapter.location}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}