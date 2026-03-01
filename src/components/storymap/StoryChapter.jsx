import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChapterCarousel from './ChapterCarousel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PdfViewer from '@/components/pdf/PdfViewer';
import PdfThumbnail from '@/components/pdf/PdfThumbnail';
import FullScreenImageViewer from './FullScreenImageViewer';

export default function StoryChapter({
    chapter,
    isActive,
    alignment = 'left',
    index,
    onSlideChange,
    delay = 0,
    onFullScreenChange,
    targetSlideIndex
}) {
    const [showCarousel, setShowCarousel] = useState(false);
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const carouselScrollToRef = useRef(null);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [showFullScreenViewer, setShowFullScreenViewer] = useState(false);
    const [fullScreenImageIndex, setFullScreenImageIndex] = useState(0);

    const firstSlide = chapter.slides?.[0];
    const currentSlide = chapter.slides?.[activeSlideIndex] || firstSlide;

    // Notify parent when fullscreen state changes
    useEffect(() => {
        if (onFullScreenChange) {
            onFullScreenChange(showFullScreenViewer);
        }
    }, [showFullScreenViewer, onFullScreenChange]);

    // Open carousel and navigate when a marker click targets a specific slide
    useEffect(() => {
        if (targetSlideIndex !== undefined && targetSlideIndex !== null) {
            setShowCarousel(true);
            if (carouselScrollToRef.current) {
                carouselScrollToRef.current(targetSlideIndex);
            }
        }
    }, [targetSlideIndex]);

    // Emit the chapter's initial map position when this chapter becomes active.
    // Prefer chapter.coordinates (overview position); fall back to first slide.
    useEffect(() => {
        if (!isActive || !onSlideChange) return;
        const chCoords = chapter.coordinates;
        const hasChapterCoords = Array.isArray(chCoords) && chCoords.length === 2
            && !isNaN(chCoords[0]) && !isNaN(chCoords[1]);
        if (hasChapterCoords) {
            onSlideChange({
                coordinates: chCoords,
                zoom: chapter.zoom,
                bearing: chapter.bearing,
                pitch: chapter.pitch,
                fly_duration: chapter.fly_duration,
                mapbox_layer_id: null,
                title: chapter.name || '',
                description: chapter.description || '',
                location: '',
                image: '',
            });
        } else if (firstSlide) {
            onSlideChange(firstSlide);
        }
    }, [isActive, chapter.id]);

    const handleFullScreenClose = () => {
        setShowFullScreenViewer(false);
        if (carouselScrollToRef.current) {
            carouselScrollToRef.current(fullScreenImageIndex);
        }
        handleSlideChange(fullScreenImageIndex);
    };

    const handleSlideChange = (slideIndex) => {
        setActiveSlideIndex(slideIndex);
        const slide = chapter.slides?.[slideIndex];
        if (slide && onSlideChange) {
            if (!slide.coordinates || !Array.isArray(slide.coordinates) || slide.coordinates.length !== 2 ||
                isNaN(slide.coordinates[0]) || isNaN(slide.coordinates[1])) {
                return;
            }
            onSlideChange(slide);
        }
    };

    return (
        <div
            className="relative w-full py-24 px-4 md:px-8 pointer-events-none"
            style={{ minHeight: '85vh', paddingTop: '60px' }}
        >
            <motion.div
                initial={index === 0 ? { opacity: 0, x: 100 } : { opacity: 0, y: 40 }}
                whileInView={index === 0 ? { opacity: 1, x: 0 } : { opacity: 1, y: 0 }}
                transition={index === 0 ? { duration: 4, ease: "easeOut", delay: delay / 1000 } : { duration: 0.8, ease: "easeOut" }}
                viewport={{ once: false, amount: 0.5 }}
                className="absolute left-1/2 w-[40%] min-w-[300px] max-w-[600px]"
            >
                {/* ── Title Card (always visible) ── */}
                <div className="relative rounded-2xl overflow-hidden shadow-2xl pointer-events-auto" style={{ minHeight: '500px' }}>
                    {/* Background image — first slide's image */}
                    {firstSlide?.image && (
                        <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${firstSlide.image})` }}
                        />
                    )}
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/30" />

                    {/* Content */}
                    <div className="relative z-10 flex flex-col p-6 md:p-8" style={{ minHeight: '500px', paddingRight: '14rem' }}>
                        <div className="flex-1" />

                        {/* Chapter number + name */}
                        <div className="mb-5">
                            <span className="block text-2xl font-light text-amber-400 leading-none">
                                Chapter {String(index + 1).padStart(2, '0')}
                            </span>
                            {chapter.name && (
                                <span className="block text-5xl font-light text-amber-400 leading-none">
                                    {chapter.name}
                                </span>
                            )}
                        </div>

                        {/* Chapter description */}
                        {chapter.description && (
                            <div
                                className="text-white/90 text-sm md:text-base leading-relaxed mb-4"
                                dangerouslySetInnerHTML={{ __html: chapter.description }}
                            />
                        )}

                        {/* Explore button — hidden once carousel is open */}
                        {!showCarousel && chapter.slides && chapter.slides.length > 0 && (
                            <button
                                onClick={() => setShowCarousel(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-white text-sm font-medium rounded-xl transition-colors w-fit"
                            >
                                Explore the chapter
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Carousel section (revealed on Explore) ── */}
                <AnimatePresence>
                {showCarousel && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        style={{ overflow: 'hidden' }}
                        className="mt-4 pointer-events-auto"
                    >
                        <div className="backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl bg-white/90 dark:bg-slate-900/90 border border-white/20">
                            {/* Carousel */}
                            {chapter.slides && chapter.slides.length > 0 && (
                                <motion.div
                                    className="pointer-events-auto"
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                                >
                                    <ChapterCarousel
                                        slides={chapter.slides}
                                        onSlideChange={handleSlideChange}
                                        scrollToRef={carouselScrollToRef}
                                        onImageClick={(idx) => {
                                            setFullScreenImageIndex(idx);
                                            setShowFullScreenViewer(true);
                                        }}
                                    />
                                </motion.div>
                            )}

                            {/* Slide text panel */}
                            <div className="p-6 md:p-8">
                                {/* Slide title */}
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

                                {/* Slide description */}
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

                                {/* Location & PDF */}
                                {(currentSlide?.location || currentSlide?.pdf_url) && (
                                    <div className="mt-6 pt-4 border-t border-slate-200/50 flex flex-col items-start gap-3 w-full">
                                        {currentSlide?.location && (
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span className="font-medium">{currentSlide.location}</span>
                                            </div>
                                        )}
                                        {currentSlide?.pdf_url && (
                                            <div className="w-full">
                                                <h4 className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Related Documents</h4>
                                                <button
                                                    onClick={() => setShowPdfModal(true)}
                                                    className="flex items-center gap-3 group hover:opacity-80 transition-opacity text-left"
                                                >
                                                    <div
                                                        className="shrink-0 overflow-hidden rounded-[10px]"
                                                        style={{ width: '80px', height: '60px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                                                    >
                                                        <PdfThumbnail url={currentSlide.pdf_url} className="w-full h-full" />
                                                    </div>
                                                    <span className="text-xs font-medium text-amber-600 group-hover:text-amber-700 transition-colors">
                                                        {currentSlide.pdf_title || decodeURIComponent(currentSlide.pdf_url.split('/').pop().split('?')[0]).replace(/^[^_]+_/, '').replace(/\.pdf$/i, '')}
                                                    </span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
                </AnimatePresence>
            </motion.div>

            {/* PDF Modal */}
            {showPdfModal && (
                <Dialog open={showPdfModal} onOpenChange={setShowPdfModal}>
                    <DialogContent className="fixed left-0 top-[100px] w-[45vw] h-[calc(100vh-100px)] max-w-none backdrop-blur-2xl bg-white/80 border-white/30 p-6 flex flex-col z-[100]">
                        <DialogHeader className="pb-5">
                            <DialogTitle style={{ fontSize: '1.5rem' }}>
                                {currentSlide?.pdf_url
                                    ? currentSlide.pdf_title || decodeURIComponent(currentSlide.pdf_url.split('/').pop().split('?')[0] || '').replace(/^[^_]+_/, '').replace(/\.pdf$/i, '') || 'Document'
                                    : 'Document'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 overflow-auto">
                            <PdfViewer url={currentSlide?.pdf_url} />
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Full Screen Image Viewer */}
            <FullScreenImageViewer
                isOpen={showFullScreenViewer}
                onClose={handleFullScreenClose}
                slides={chapter.slides}
                currentIndex={fullScreenImageIndex}
                onNavigate={setFullScreenImageIndex}
                chapterName={chapter.name ? `Chapter ${String(index + 1).padStart(2, '0')}: ${chapter.name}` : `Chapter ${String(index + 1).padStart(2, '0')}`}
            />
        </div>
    );
}
