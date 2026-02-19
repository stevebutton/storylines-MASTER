import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const VideoPlayer = ({ url }) => {
    if (!url) return null;

    let embedUrl = '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = url.split('v=')[1]?.split('&')[0] || url.split('youtu.be/')[1]?.split('?')[0];
        embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&modestbranding=1&rel=0` : '';
    } else if (url.includes('vimeo.com')) {
        const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
        embedUrl = videoId ? `https://player.vimeo.com/video/${videoId}?autoplay=1&controls=1` : '';
    } else {
        return (
            <motion.video
                src={url}
                controls
                autoPlay
                playsInline
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full h-full object-contain"
            />
        );
    }

    if (!embedUrl) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative w-full h-full flex items-center justify-center"
        >
            <iframe
                src={embedUrl}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
                style={{ minHeight: '80vh' }}
            ></iframe>
        </motion.div>
    );
};

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

    // Handle escape key
    useEffect(() => {
        if (!isOpen) return;
        
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <React.Fragment key={isOpen ? 'viewer-open' : 'viewer-closed'}>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 bg-black/50 z-[9997]"
                        onClick={onClose}
                    />
                    
                    {/* Main Content */}
                    <motion.div
                        initial={{ y: "100vh", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100vh", opacity: 0 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="fixed inset-0 z-[9998] bg-white overflow-y-auto pointer-events-auto"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-[144px] right-6 z-50 bg-slate-100 hover:bg-slate-200 rounded-full p-3 transition-all"
                        >
                            <X className="w-6 h-6 text-slate-700" />
                        </button>

                        {/* Navigation Buttons */}
                        {hasMultipleSlides && (
                            <>
                                <button
                                    onClick={handlePrevious}
                                    className="absolute left-6 bottom-[20vh] z-50 bg-slate-100 hover:bg-slate-200 rounded-full p-3 transition-all"
                                >
                                    <ChevronLeft className="w-8 h-8 text-slate-700" />
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="absolute right-6 bottom-[20vh] z-50 bg-slate-100 hover:bg-slate-200 rounded-full p-3 transition-all"
                                >
                                    <ChevronRight className="w-8 h-8 text-slate-700" />
                                </button>
                            </>
                        )}

                        {/* Image or Video Display */}
                        <div className="relative w-full h-full flex items-center justify-center z-10">
                    <AnimatePresence mode="wait">
                        {currentSlide.video_url ? (
                            <VideoPlayer url={currentSlide.video_url} key={currentIndex} />
                        ) : (
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
                        )}
                            </AnimatePresence>
                        </div>

                        {/* Caption Overlay */}
                        <motion.div 
                            className="absolute top-0 left-0 h-screen w-[300px] bg-white/50 backdrop-blur-sm border-r border-slate-200 shadow-lg p-8 flex flex-col z-20 pointer-events-none"
                            style={{ paddingTop: '150px' }}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 3 }}
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
                                            <div className="font-bold tracking-[0.2em] uppercase text-amber-600 mb-3" style={{ fontSize: '1.3rem', lineHeight: '1.3rem', paddingBottom: '30px' }}>
                                                {chapterName.split(':').map((part, i) => (
                                                    <div key={i}>{part.trim()}</div>
                                                ))}
                                            </div>
                                        )}
                                        <h3 className="text-2xl md:text-3xl font-medium text-slate-800 mb-3">
                                            {currentSlide.title}
                                        </h3>
                                        {currentSlide.description && (
                                            <div 
                                                className="text-sm md:text-base leading-relaxed prose prose-sm max-w-none text-right"
                                                style={{ color: '#000000' }}
                                                dangerouslySetInnerHTML={{ __html: currentSlide.description }}
                                            />
                                        )}
                                        {currentSlide.location && (
                                            <div className="flex items-center justify-end gap-2 text-sm" style={{ color: '#000000', marginTop: '40px' }}>
                                                <span>{currentSlide.location}</span>
                                                <div className="w-5 h-5 rounded-full bg-amber-500 border-2 border-white shadow-lg" />
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>

                                {/* Slide Counter */}
                                {hasMultipleSlides && (
                                    <div className="text-sm mt-4" style={{ color: '#000000' }}>
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
                                    className="hidden md:flex absolute top-0 left-[300px] h-screen w-[300px] bg-white/50 backdrop-blur-sm border-r border-slate-200 shadow-lg p-8 z-10 flex-col"
                                    style={{ paddingTop: '150px' }}
                                    initial={{ opacity: 0, y: '100%' }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: '100%' }}
                                    transition={{ duration: 3, ease: "easeOut", delay: 5 }}
                                >
                                    <div 
                                        className="text-slate-600 text-sm md:text-base leading-relaxed prose prose-sm max-w-none text-left"
                                        dangerouslySetInnerHTML={{ __html: currentSlide.extended_content }}
                                    />
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </motion.div>
                </React.Fragment>
            )}
        </AnimatePresence>
    );
}