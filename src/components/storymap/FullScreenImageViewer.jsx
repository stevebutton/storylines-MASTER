import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export default function FullScreenImageViewer({ 
    isOpen, 
    onClose, 
    slides, 
    currentIndex, 
    onNavigate 
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
            <DialogContent className="max-w-none w-screen h-screen p-0 border-0 z-[9999] bg-black/95">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-[10000] bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-3 transition-all"
                >
                    <X className="w-6 h-6 text-white" />
                </button>

                {/* Navigation Buttons */}
                {hasMultipleSlides && (
                    <>
                        <button
                            onClick={handlePrevious}
                            className="absolute left-6 top-1/2 -translate-y-1/2 z-[10000] bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-3 transition-all"
                        >
                            <ChevronLeft className="w-8 h-8 text-white" />
                        </button>
                        <button
                            onClick={handleNext}
                            className="absolute right-6 top-1/2 -translate-y-1/2 z-[10000] bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-3 transition-all"
                        >
                            <ChevronRight className="w-8 h-8 text-white" />
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
                            className="max-w-[90vw] max-h-[75vh] object-contain"
                        />
                    </AnimatePresence>
                </div>

                {/* Caption Overlay */}
                <motion.div 
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-8 pb-12"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <div className="max-w-4xl mx-auto">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentIndex}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                            >
                                <h3 className="text-2xl md:text-3xl font-light text-white mb-3">
                                    {currentSlide.title}
                                </h3>
                                {currentSlide.description && (
                                    <div 
                                        className="text-white/90 text-sm md:text-base leading-relaxed prose prose-invert max-w-none"
                                        dangerouslySetInnerHTML={{ __html: currentSlide.description }}
                                    />
                                )}
                                {currentSlide.location && (
                                    <p className="text-white/70 text-sm mt-3">
                                        📍 {currentSlide.location}
                                    </p>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        {/* Slide Counter */}
                        {hasMultipleSlides && (
                            <div className="text-white/50 text-sm mt-4">
                                {currentIndex + 1} / {slides.length}
                            </div>
                        )}
                    </div>
                </motion.div>
            </DialogContent>
        </Dialog>
    );
}