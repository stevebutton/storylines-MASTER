import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import ChapterCarousel from './ChapterCarousel';
import { FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function StoryChapter({ 
    chapter, 
    isActive, 
    alignment = 'left',
    index,
    onSlideChange,
    delay = 0
}) {
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const currentSlide = chapter.slides?.[activeSlideIndex] || chapter.slides?.[0];

    const handleSlideChange = (slideIndex) => {
        setActiveSlideIndex(slideIndex);
        const slide = chapter.slides?.[slideIndex];
        if (slide && onSlideChange) {
            onSlideChange(slide);
        }
    };

    const cardStyle = currentSlide?.card_style || 'default';

    // Full Background Style
    if (cardStyle === 'full_background') {
        return (
            <div 
                className="flex items-center py-24 px-4 md:px-8 pr-24 justify-end"
                style={{ minHeight: '75vh', paddingTop: '140px' }}
            >
                <motion.div
                    initial={index === 0 ? { opacity: 0, x: 100 } : { opacity: 0, y: 40 }}
                    whileInView={index === 0 ? { opacity: 1, x: 0 } : { opacity: 1, y: 0 }}
                    transition={index === 0 ? { duration: 4, ease: "easeOut", delay: delay / 1000 } : { duration: 0.8, ease: "easeOut" }}
                    viewport={{ once: false, amount: 0.5 }}
                    className="relative w-1/2 min-w-[300px] pointer-events-auto"
                >
                    {/* Full Background Card */}
                    <div className="relative rounded-2xl overflow-hidden shadow-2xl" style={{ minHeight: '500px' }}>
                        {/* Background Image */}
                        {currentSlide?.background_image && (
                            <div 
                                className="absolute inset-0 bg-cover bg-center"
                                style={{ backgroundImage: `url(${currentSlide.background_image})` }}
                            />
                        )}
                        
                        {/* 50% Overlay */}
                        <div className="absolute inset-0 bg-black/50" />
                        
                        {/* Content */}
                        <div className="relative z-10 p-6 md:p-8 flex flex-col h-full justify-center">
                            {/* Chapter number */}
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-xs font-medium tracking-[0.2em] uppercase text-amber-400">
                                    Chapter {String(index + 1).padStart(2, '0')}
                                </span>
                                <div className="flex-1 h-px bg-gradient-to-r from-amber-400/50 to-transparent" />
                            </div>
                            
                            {/* Image Carousel */}
                            {chapter.slides && chapter.slides.length > 0 && (
                                <div className="mb-6">
                                    <ChapterCarousel 
                                        slides={chapter.slides} 
                                        onSlideChange={handleSlideChange}
                                    />
                                </div>
                            )}
                            
                            {/* Title - animated */}
                            <AnimatePresence mode="wait">
                                <motion.h2 
                                    key={currentSlide?.title}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                    className="text-2xl md:text-3xl font-light text-white mb-4 leading-tight"
                                >
                                    {currentSlide?.title}
                                </motion.h2>
                            </AnimatePresence>
                            
                            {/* Description - animated */}
                            <AnimatePresence mode="wait">
                                <motion.div 
                                    key={currentSlide?.description}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3, delay: 0.1 }}
                                    className="text-white/90 leading-relaxed text-sm md:text-base prose prose-sm max-w-none prose-invert"
                                    dangerouslySetInnerHTML={{ __html: currentSlide?.description || '' }}
                                />
                            </AnimatePresence>
                            
                            {/* Location badge */}
                            {currentSlide?.location && (
                                <div className="mt-6 pt-4 border-t border-white/20">
                                    <div className="flex items-center gap-2 text-xs text-white/80">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span className="font-medium">{currentSlide.location}</span>
                                    </div>
                                </div>
                            )}

                            {/* PDF Attachment Icon */}
                            {currentSlide?.pdf_url && (
                                <button
                                    onClick={() => setShowPdfModal(true)}
                                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                                >
                                    <FileText className="w-4 h-4 text-white" />
                                    <span className="text-xs text-white font-medium">View Document</span>
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* PDF Modal */}
                <Dialog open={showPdfModal} onOpenChange={setShowPdfModal}>
                    <DialogContent className="max-w-4xl h-[90vh]">
                        <DialogHeader>
                            <DialogTitle>{currentSlide?.title} - Document</DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 h-full">
                            <iframe
                                src={currentSlide?.pdf_url}
                                className="w-full h-full rounded-lg"
                                title="PDF Viewer"
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    // Default Style
    return (
        <div 
            className="flex items-center py-24 px-4 md:px-8 pr-24 justify-end"
            style={{ minHeight: '75vh', paddingTop: '140px' }}
        >
            <motion.div
                initial={index === 0 ? { opacity: 0, x: 100 } : { opacity: 0, y: 40 }}
                whileInView={index === 0 ? { opacity: 1, x: 0 } : { opacity: 1, y: 0 }}
                transition={index === 0 ? { duration: 4, ease: "easeOut", delay: delay / 1000 } : { duration: 0.8, ease: "easeOut" }}
                viewport={{ once: false, amount: 0.5 }}
                className="relative w-1/2 min-w-[300px] pointer-events-auto"
            >
                {/* Card */}
                <div className={cn(
                    "backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl",
                    "bg-white/90 dark:bg-slate-900/90",
                    "border border-white/20"
                )}>
                    {/* Image Carousel */}
                    {chapter.slides && chapter.slides.length > 0 && (
                        <ChapterCarousel 
                            slides={chapter.slides} 
                            onSlideChange={handleSlideChange}
                        />
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
                        
                        {/* Title - animated */}
                        <AnimatePresence mode="wait">
                            <motion.h2 
                                key={currentSlide?.title}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="text-2xl md:text-3xl font-light text-slate-800 mb-4 leading-tight"
                            >
                                {currentSlide?.title}
                            </motion.h2>
                        </AnimatePresence>
                        
                        {/* Description - animated */}
                        <AnimatePresence mode="wait">
                            <motion.div 
                                key={currentSlide?.description}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3, delay: 0.1 }}
                                className="text-slate-600 leading-relaxed text-sm md:text-base prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: currentSlide?.description || '' }}
                            />
                        </AnimatePresence>
                        
                        {/* Location badge */}
                        {currentSlide?.location && (
                            <div className="mt-6 pt-4 border-t border-slate-200/50">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="font-medium">{currentSlide.location}</span>
                                </div>
                            </div>
                        )}

                        {/* PDF Attachment Icon */}
                        {currentSlide?.pdf_url && (
                            <button
                                onClick={() => setShowPdfModal(true)}
                                className="mt-4 flex items-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                            >
                                <FileText className="w-4 h-4 text-amber-700" />
                                <span className="text-xs text-amber-700 font-medium">View Document</span>
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* PDF Modal */}
            <Dialog open={showPdfModal} onOpenChange={setShowPdfModal}>
                <DialogContent className="max-w-4xl h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>{currentSlide?.title} - Document</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 h-full">
                        <iframe
                            src={currentSlide?.pdf_url}
                            className="w-full h-full rounded-lg"
                            title="PDF Viewer"
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}