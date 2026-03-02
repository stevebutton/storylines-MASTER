import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TextPanelCarousel from './TextPanelCarousel';
import FloatingControlStrip from './FloatingControlStrip';

const VideoPlayer = ({ url, onVideoEnded }) => {
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
                onEnded={onVideoEnded}
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
    chapterName,
    mapStyle = 'a',
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
                <>
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
                        {/* Image or Video Display */}
                        <div className="relative w-full h-full flex items-center justify-center z-10">
                    <AnimatePresence mode="wait">
                        {currentSlide.video_url ? (
                            <VideoPlayer url={currentSlide.video_url} key={currentIndex} onVideoEnded={handleNext} />
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

                        {/* Text panel — full-bleed left, manages its own position */}
                        <TextPanelCarousel
                            key={currentIndex}
                            chapterTitle={chapterName}
                            slideTitle={currentSlide.title}
                            description={currentSlide.description || ''}
                            extendedContent={currentSlide.extended_content || ''}
                            location={currentSlide.location}
                            mapStyle={mapStyle}
                        />

                        {/* Control strip — bottom centre */}
                        <FloatingControlStrip
                            onPrev={handlePrevious}
                            onNext={handleNext}
                            onClose={onClose}
                            counter={hasMultipleSlides ? `${currentIndex + 1} / ${slides.length}` : null}
                            hasMultipleSlides={hasMultipleSlides}
                        />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}