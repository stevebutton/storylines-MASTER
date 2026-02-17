import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export default function FullScreenImageViewer({ 
    isOpen, 
    onClose, 
    slides, 
    currentIndex, 
    onNavigate,
    chapterName 
}) {
    if (!slides || slides.length === 0) return null;

    const currentSlide = slides[currentIndex];
    const hasMultipleSlides = slides.length > 1;

    const handlePrevious = () => {
        const newIndex = currentIndex === 0 ? slides.length - 1 : currentIndex - 1;
        onNavigate(newIndex);
    };

    const handleNext = () => {
        const newIndex = currentIndex === slides.length - 1 ? 0 : currentIndex + 1;
        onNavigate(newIndex);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-none w-screen h-screen p-0 border-0 z-[9999] bg-white overflow-y-auto">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-[144px] right-6 z-[10000] bg-slate-100 hover:bg-slate-200 rounded-full p-3 transition-all"
                >
                    <X className="w-6 h-6 text-slate-700" />
                </button>

                {/* Navigation Buttons */}
                {hasMultipleSlides && (
                    <>
                        <button
                            onClick={handlePrevious}
                            className="absolute left-6 bottom-[20vh] z-[10000] bg-slate-100 hover:bg-slate-200 rounded-full p-3 transition-all"
                        >
                            <ChevronLeft className="w-8 h-8 text-slate-700" />
                        </button>
                        <button
                            onClick={handleNext}
                            className="absolute right-6 bottom-[20vh] z-[10000] bg-slate-100 hover:bg-slate-200 rounded-full p-3 transition-all"
                        >
                            <ChevronRight className="w-8 h-8 text-slate-700" />
                        </button>
                    </>
                )}

                {/* Image Display */}
                <div className="relative w-full h-full flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        <motion.img
                            key={currentIndex}
                            src={currentSlide.image}
                            alt={currentSlide.title}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="w-full h-full object-cover"
                        />
                    </AnimatePresence>
                </div>

                {/* Caption Overlay */}
                <motion.div 
                    className="absolute top-0 left-0 h-screen w-[300px] bg-white/50 backdrop-blur-sm border-r border-slate-200 shadow-lg p-8 flex flex-col justify-center"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <div className="w-full text-right">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentIndex}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                            >
                                {chapterName && (
                                    <div className="text-xs font-medium tracking-[0.2em] uppercase text-amber-600 mb-3">
                                        {chapterName}
                                    </div>
                                )}
                                <h3 className="text-2xl md:text-3xl font-light text-slate-800 mb-3">
                                    {currentSlide.title}
                                </h3>
                                {currentSlide.description && (
                                    <div 
                                        className="text-slate-600 text-sm md:text-base leading-relaxed prose prose-sm max-w-none text-right"
                                        dangerouslySetInnerHTML={{ __html: currentSlide.description }}
                                    />
                                )}
                                {currentSlide.location && (
                                    <div className="flex items-center justify-end gap-2 text-slate-500 text-sm mt-3">
                                        <span>{currentSlide.location}</span>
                                        <div className="w-5 h-5 rounded-full bg-amber-500 border-2 border-white shadow-lg" />
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        {/* Slide Counter */}
                        {hasMultipleSlides && (
                            <div className="text-slate-400 text-sm mt-4">
                                {currentIndex + 1} / {slides.length}
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Extended Content Overlay - Only on Desktop */}
                {currentSlide.extended_content && (
                    <AnimatePresence mode="wait">
                        <motion.div 
                            key={`extended-${currentIndex}`}
                            className="hidden md:block absolute top-0 left-[300px] h-screen w-[300px] bg-white/50 backdrop-blur-sm border-r border-slate-200 shadow-lg p-8 flex flex-col justify-center"
                            initial={{ opacity: 0, y: '100%' }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: '100%' }}
                            transition={{ duration: 2, ease: "easeOut" }}
                        >
                            <div className="w-full text-right">
                                <div 
                                    className="text-slate-600 text-sm md:text-base leading-relaxed prose prose-sm max-w-none text-right"
                                    dangerouslySetInnerHTML={{ __html: currentSlide.extended_content }}
                                />
                            </div>
                        </motion.div>
                    </AnimatePresence>
                )}
            </DialogContent>
        </Dialog>
    );
}