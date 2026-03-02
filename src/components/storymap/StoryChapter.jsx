import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ChapterCarousel from './ChapterCarousel';
import { X } from 'lucide-react';
import PdfViewer from '@/components/pdf/PdfViewer';
import PdfThumbnail from '@/components/pdf/PdfThumbnail';
import FullScreenImageViewer from './FullScreenImageViewer';

const THEME_FONTS = {
    c: 'Righteous, cursive',
};

export default function StoryChapter({
    chapter,
    isActive,
    alignment = 'left',
    index,
    onSlideChange,
    delay = 0,
    onFullScreenChange,
    targetSlideIndex,
    mapStyle = 'a',
    onExplore,
}) {
    const themeFont = THEME_FONTS[mapStyle] || null;
    const [showCarousel, setShowCarousel] = useState(false);

    const handleOpenCarousel = () => {
        setShowCarousel(true);
        if (onExplore) onExplore();
    };
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const carouselScrollToRef = useRef(null);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [showFullScreenViewer, setShowFullScreenViewer] = useState(false);
    const [fullScreenImageIndex, setFullScreenImageIndex] = useState(0);
    const [showExploreButton, setShowExploreButton] = useState(false);

    const firstSlide = chapter.slides?.[0];
    const currentSlide = chapter.slides?.[activeSlideIndex] || firstSlide;
    const bgImage = chapter.background_image || firstSlide?.image;

    // Notify parent when fullscreen state changes
    useEffect(() => {
        if (onFullScreenChange) onFullScreenChange(showFullScreenViewer);
    }, [showFullScreenViewer, onFullScreenChange]);

    // Reset to title card when chapter deactivates so each visit starts fresh
    useEffect(() => {
        if (!isActive) {
            setShowCarousel(false);
            setActiveSlideIndex(0);
        }
    }, [isActive]);

    // Delay explore button entrance until the card has fully landed
    // Chapter 0 has a longer entrance (delay + 4s animation); others take ~0.8s
    useEffect(() => {
        if (!isActive) {
            setShowExploreButton(false);
            return;
        }
        const duration = index === 0 ? delay + 4000 + 1000 : 1800;
        const t = setTimeout(() => setShowExploreButton(true), duration);
        return () => clearTimeout(t);
    }, [isActive, index, delay]);

    // Open carousel and navigate when a marker click targets a specific slide
    useEffect(() => {
        if (targetSlideIndex !== undefined && targetSlideIndex !== null) {
            handleOpenCarousel();
            if (carouselScrollToRef.current) carouselScrollToRef.current(targetSlideIndex);
        }
    }, [targetSlideIndex]);

    // Emit the chapter's initial map position when this chapter becomes active.
    // _noRoute: true tells StoryMapView to fly the map without adding this
    // overview position to the slide route trail.
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
                _noRoute: true,
            });
        } else {
            // Fall back to the first slide that actually has valid coordinates.
            // slides[0] may be a text-only slide with no location — scanning
            // forward ensures the map always flies somewhere meaningful.
            const firstSlideWithCoords = chapter.slides?.find(s =>
                Array.isArray(s.coordinates) && s.coordinates.length === 2 &&
                !isNaN(s.coordinates[0]) && !isNaN(s.coordinates[1])
            );
            if (firstSlideWithCoords) {
                onSlideChange({ ...firstSlideWithCoords, _noRoute: true });
            }
        }
    }, [isActive, chapter.id]);

    // Embla only fires 'select' on user navigation, not on initial render.
    // When the carousel first opens, manually fire slide 0's map position
    // so the map flies to the first slide without the user having to click.
    useEffect(() => {
        if (!showCarousel) return;
        handleSlideChange(activeSlideIndex);
    }, [showCarousel]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleFullScreenClose = () => {
        setShowFullScreenViewer(false);
        if (carouselScrollToRef.current) carouselScrollToRef.current(fullScreenImageIndex);
        handleSlideChange(fullScreenImageIndex);
    };

    const handleSlideChange = (slideIndex) => {
        setActiveSlideIndex(slideIndex);
        const slide = chapter.slides?.[slideIndex];
        if (slide && onSlideChange) {
            if (!slide.coordinates || !Array.isArray(slide.coordinates) || slide.coordinates.length !== 2 ||
                isNaN(slide.coordinates[0]) || isNaN(slide.coordinates[1])) return;
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
                viewport={{ once: false, amount: 0.3 }}
                className="absolute left-1/2 w-[40%] min-w-[300px] max-w-[600px]"
            >
                <AnimatePresence mode="wait">

                {/* ── Title Card ── shown until Explore is clicked */}
                {!showCarousel && (
                    <motion.div
                        key="title-card"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, x: -80 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                    >
                        <div className="relative rounded-2xl shadow-2xl pointer-events-auto" style={{ minHeight: '500px' }}>
                            {/* Background layers — clipped independently so the explore button can overflow */}
                            <div className="absolute inset-0 rounded-2xl overflow-hidden">
                                {bgImage && (
                                    <div
                                        className="absolute inset-0 bg-cover bg-center"
                                        style={{ backgroundImage: `url(${bgImage})` }}
                                    />
                                )}
                                <div className="absolute inset-0 bg-black/30" />
                            </div>

                            {/* Text content */}
                            <div className="relative z-10 flex flex-col p-6 md:p-8" style={{ minHeight: '500px', paddingRight: '14rem' }}>
                                <div className="flex-1" />

                                {/* Chapter number + name */}
                                <div className="mb-5">
                                    <span className="block text-xs font-medium text-amber-400 uppercase tracking-widest mb-2"
                                          style={themeFont ? { fontFamily: themeFont } : { fontFamily: 'Raleway, sans-serif' }}>
                                        Chapter {String(index + 1).padStart(2, '0')}
                                    </span>
                                    {chapter.name && (
                                        <span className="block text-5xl font-light text-amber-400"
                                              style={themeFont ? { fontFamily: themeFont, lineHeight: '0.9' } : { fontFamily: 'Raleway, sans-serif', lineHeight: '0.9' }}>
                                            {chapter.name}
                                        </span>
                                    )}
                                </div>

                                {/* Chapter description */}
                                {chapter.description && (
                                    <div
                                        className="text-white/90 text-base font-light leading-relaxed"
                                        style={{ fontFamily: 'Raleway, sans-serif', paddingBottom: '40px' }}
                                        dangerouslySetInnerHTML={{ __html: chapter.description }}
                                    />
                                )}
                            </div>

                            {/* Explore button — slides in after card has fully landed */}
                            {showExploreButton && chapter.slides && chapter.slides.length > 0 && (
                                <motion.button
                                    onClick={handleOpenCarousel}
                                    className="absolute bottom-6 right-6 z-20 flex items-center gap-1"
                                    style={{ fontFamily: themeFont || 'Raleway, sans-serif' }}
                                    initial={{ opacity: 0, x: -40 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    whileHover={{ scale: 1.05, transition: { duration: 0.15 } }}
                                    transition={{ duration: 0.7, ease: 'easeOut' }}
                                >
                                    <span className="text-base font-light text-white/90">Explore the chapter</span>
                                    <img
                                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/a1c59b412_scrolldown-arrow.png"
                                        alt=""
                                        width="74"
                                        height="50"
                                        style={{
                                            transform: 'rotate(-90deg)',
                                            filter: 'brightness(0) saturate(100%) invert(80%) sepia(60%) saturate(500%) hue-rotate(5deg) brightness(105%)',
                                        }}
                                    />
                                </motion.button>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* ── Carousel Card ── enters after title card exits */}
                {showCarousel && (
                    <motion.div
                        key="carousel"
                        initial={{ opacity: 0, x: 80 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="pointer-events-auto"
                    >
                        <div className="backdrop-blur-xl rounded-2xl shadow-2xl bg-white/90 dark:bg-slate-900/90 border border-white/20">
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
                                <AnimatePresence mode="wait">
                                    <motion.h2
                                        key={currentSlide?.title}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.3 }}
                                        className="text-3xl font-light text-slate-800 mb-4 leading-tight"
                                        style={themeFont ? { fontFamily: themeFont } : { fontFamily: 'Raleway, sans-serif' }}
                                    >
                                        {currentSlide?.title}
                                    </motion.h2>
                                </AnimatePresence>

                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentSlide?.description}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.3, delay: 0.1 }}
                                        className="text-slate-600 leading-relaxed text-base font-light prose prose-sm max-w-none"
                                        style={{ fontFamily: 'Raleway, sans-serif' }}
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

            {/* PDF Modal — portalled to document.body to escape the z-[60] stacking context */}
            {createPortal(
            <AnimatePresence>
            {showPdfModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                    className="fixed left-0 right-0 bottom-0 top-[100px] z-[10001] bg-white flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-8 py-5 border-b border-slate-200 flex-shrink-0">
                        <h2 className="text-2xl font-light text-slate-800">
                            {currentSlide?.pdf_url
                                ? currentSlide.pdf_title || decodeURIComponent(currentSlide.pdf_url.split('/').pop().split('?')[0] || '').replace(/^[^_]+_/, '').replace(/\.pdf$/i, '') || 'Document'
                                : 'Document'}
                        </h2>
                        <button
                            onClick={() => setShowPdfModal(false)}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* PDF Viewer */}
                    <div className="flex-1 overflow-hidden">
                        <PdfViewer url={currentSlide?.pdf_url} />
                    </div>
                </motion.div>
            )}
            </AnimatePresence>,
            document.body)}

            {/* Full Screen Image Viewer */}
            <FullScreenImageViewer
                isOpen={showFullScreenViewer}
                onClose={handleFullScreenClose}
                slides={chapter.slides}
                currentIndex={fullScreenImageIndex}
                onNavigate={setFullScreenImageIndex}
                chapterName={chapter.name ? `Chapter ${String(index + 1).padStart(2, '0')}: ${chapter.name}` : `Chapter ${String(index + 1).padStart(2, '0')}`}
                mapStyle={mapStyle}
            />
        </div>
    );
}
