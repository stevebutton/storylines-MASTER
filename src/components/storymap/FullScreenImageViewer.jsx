import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import TextPanelCarousel from './TextPanelCarousel';
import FloatingControlStrip from './FloatingControlStrip';
import FilmstripBar from './FilmstripBar';
import PdfViewer from '@/components/pdf/PdfViewer';

const CHAPTER_COLORS = [
    { main: '#d97706', rgb: '217,119,6'   },  // 0 amber
    { main: '#2563eb', rgb: '37,99,235'   },  // 1 blue
    { main: '#16a34a', rgb: '22,163,74'   },  // 2 green
    { main: '#9333ea', rgb: '147,51,234'  },  // 3 purple
    { main: '#e11d48', rgb: '225,29,72'   },  // 4 rose
    { main: '#0d9488', rgb: '13,148,136'  },  // 5 teal
];

const HOTSPOT_PULSE_STYLE = CHAPTER_COLORS.map(({ rgb }, i) => `
@keyframes hotspot-pulse-${i} {
    0%   { box-shadow: 0 0 0 0px  rgba(${rgb},1.0), 0 2px 8px rgba(0,0,0,0.3); }
    70%  { box-shadow: 0 0 0 36px rgba(${rgb},0),   0 2px 8px rgba(0,0,0,0.3); }
    100% { box-shadow: 0 0 0 0px  rgba(${rgb},0),   0 2px 8px rgba(0,0,0,0.3); }
}
.hotspot-pulse-${i} { animation: hotspot-pulse-${i} 1.8s ease-out infinite; }
`).join('\n');

const THEME_FONTS = {
    c: 'Righteous, cursive',
    f: 'Oswald, sans-serif',
    k: 'Oswald, sans-serif',
};

// Single hotspot dot + card — hover to show card
function SingleHotspot({ x, y, title, body, index, delay, isOpen, onOpen, onClose, mapStyle = 'a', chapterColorIndex = 0 }) {
    const themeFont = THEME_FONTS[mapStyle] || 'Raleway, sans-serif';
    const color = CHAPTER_COLORS[chapterColorIndex % CHAPTER_COLORS.length];
    // Card appears to the right by default; flips left when near the right edge.
    const toLeft = x > 0.7;
    const cardStyle = {
        top: '50%',
        transform: 'translateY(-50%)',
        ...(toLeft
            ? { right: '100%', marginRight: 50 }
            : { left: '100%', marginLeft: 50 }),
    };

    return (
        <div
            className="absolute z-20 cursor-pointer"
            style={{
                left: `${x * 100}%`,
                top: `${y * 100}%`,
                transform: 'translate(-50%, -50%)',
            }}
            onMouseEnter={onOpen}
            onMouseLeave={onClose}
        >
            {/* Numbered dot — matches map marker style */}
            <motion.div
                className={`hotspot-pulse-${chapterColorIndex % CHAPTER_COLORS.length} rounded-full flex items-center justify-center`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay, ease: 'easeOut' }}
                style={{
                    width: 36,
                    height: 36,
                    background: color.main,
                    border: '3px solid white',
                    boxSizing: 'border-box',
                }}
            >
                <span className="text-white text-xs font-bold select-none">{index + 1}</span>
            </motion.div>
            <AnimatePresence>
                {isOpen && (
                    <div className="absolute" style={cardStyle}>
                        <motion.div
                            initial={{ opacity: 0, backdropFilter: 'blur(0px)', y: 6 }}
                            animate={{ opacity: 1, backdropFilter: 'blur(24px)', y: 0 }}
                            exit={{ opacity: 0, backdropFilter: 'blur(0px)', y: 6 }}
                            transition={{ duration: 0.35 }}
                            className="w-64 rounded-xl pointer-events-none overflow-hidden"
                            style={{
                                transform: 'translateY(-50%)',
                                paddingTop: 12, paddingBottom: 32, paddingLeft: 26, paddingRight: 26,
                                background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.15))',
                            }}
                        >
                            {title && (
                                <p
                                    className="text-base font-light text-white mb-2"
                                    style={{ fontFamily: themeFont }}
                                >
                                    {title}
                                </p>
                            )}
                            {body && (
                                <div
                                    className="leading-relaxed text-base font-light prose prose-sm max-w-none prose-invert"
                                    style={{ color: 'white' }}
                                    dangerouslySetInnerHTML={{ __html: body }}
                                />
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Renders all hotspots for the current slide; manages which card is open
function ImageHotspots({ hotspots, mapStyle, chapterColorIndex, onAnyCardOpen }) {
    const [openIdx, setOpenIdx] = useState(null);

    useEffect(() => {
        onAnyCardOpen?.(openIdx !== null && hotspots[openIdx]
            ? { x: hotspots[openIdx].x, y: hotspots[openIdx].y }
            : null);
    }, [openIdx]);

    if (!hotspots?.length) return null;

    return (
        <>
            {hotspots.map((h, i) => (
                <SingleHotspot
                    key={i}
                    x={h.x}
                    y={h.y}
                    title={h.title || ''}
                    body={h.body || ''}
                    index={i}
                    delay={3.5 + i * 2.0}
                    isOpen={openIdx === i}
                    onOpen={() => setOpenIdx(i)}
                    onClose={() => setOpenIdx(null)}
                    mapStyle={mapStyle}
                    chapterColorIndex={chapterColorIndex}
                />
            ))}
        </>
    );
}

const VideoPlayer = ({ url, loop = false, onVideoEnded }) => {
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
                loop={loop}
                playsInline
                onEnded={loop ? undefined : onVideoEnded}
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

// Slide transition variants ─────────────────────────────────────────────────
// picture: 2s cross-dissolve, no scale
const pictureVariants = {
    enter:  { opacity: 0 },
    center: { opacity: 1 },
    exit:   { opacity: 0 },
};
// story: subtle scale-fade
const storyVariants = {
    enter:  { opacity: 0, scale: 0.97 },
    center: { opacity: 1, scale: 1 },
    exit:   { opacity: 0, scale: 0.97 },
};
// timeline: simultaneous horizontal push — dir 1 = forward, -1 = backward
// Requires mode="sync" on AnimatePresence + overflow:hidden on the container
const timelineVariants = {
    enter:  (dir) => ({ x: dir >= 0 ? '100%' : '-100%' }),
    center: { x: '0%' },
    exit:   (dir) => ({ x: dir >= 0 ? '-100%' : '100%' }),
};

const VARIANTS = { picture: pictureVariants, story: storyVariants, timeline: timelineVariants };
const TRANSITIONS = {
    picture:  { duration: 2,    ease: 'easeInOut' },
    story:    { duration: 0.4,  ease: 'easeOut' },
    timeline: { duration: 1,    ease: [0.4, 0, 0.2, 1] },
};

export default function FullScreenImageViewer({
    isOpen,
    onClose,
    slides,
    currentIndex,
    onNavigate,
    chapterName,
    mapStyle          = 'a',
    viewMode          = 'story',    // 'picture' | 'story' | 'timeline'
    hideControlStrip  = false,
    hideTextPanel     = false,
    hideChapterTitle  = false,
    inOverlay         = false,  // true when rendered as an overlay inside StoryMapView
    chapterColorIndex = 0,
}) {
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [activeHotspotPos, setActiveHotspotPos] = useState(null); // { x, y } | null

    // Track slide navigation direction for timeline push transition
    const prevIndexRef = useRef(currentIndex);
    const directionRef = useRef(1);
    useEffect(() => {
        directionRef.current = currentIndex >= prevIndexRef.current ? 1 : -1;
        prevIndexRef.current = currentIndex;
    }, [currentIndex]);

    // Reset hotspot spotlight when slide changes or mode leaves 'story'
    useEffect(() => { setActiveHotspotPos(null); }, [currentIndex, viewMode]);

    if (!slides || slides.length === 0) return null;

    const currentSlide = slides[currentIndex];

    // Normalise: use new hotspots array, or fall back to legacy single-hotspot columns
    const slideHotspots = currentSlide.hotspots?.length
        ? currentSlide.hotspots
        : (currentSlide.hotspot_x != null
            ? [{ x: currentSlide.hotspot_x, y: currentSlide.hotspot_y, title: currentSlide.hotspot_title || '', body: currentSlide.hotspot_body || '' }]
            : []);
    const hasMultipleSlides = slides.length > 1;
    const pdfTitle = currentSlide?.pdf_title ||
        (currentSlide?.pdf_url
            ? decodeURIComponent(currentSlide.pdf_url.split('/').pop().split('?')[0])
                .replace(/^[^_]+_/, '').replace(/\.pdf$/i, '')
            : null);

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
        <>
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop — only shown in standalone (non-overlay) mode */}
                    {!inOverlay && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="fixed inset-0 bg-black/50 z-[9997]"
                            onClick={onClose}
                        />
                    )}

                    {/* Main Content */}
                    <motion.div
                        initial={inOverlay ? { opacity: 0 } : { y: "100vh", opacity: 0 }}
                        animate={inOverlay ? { opacity: 1 } : { y: 0, opacity: 1 }}
                        exit={inOverlay ? { opacity: 0 } : { y: "100vh", opacity: 0 }}
                        transition={inOverlay ? { duration: 0.4, ease: "easeOut" } : { duration: 1.5, ease: "easeOut" }}
                        className={`fixed inset-x-0 bottom-0 z-[9998] overflow-y-auto pointer-events-auto ${inOverlay ? 'bg-slate-950 top-[100px]' : 'bg-white top-0'}`}
                    >
                        {/* Image or Video Display */}
                        {/* overflow-hidden clips the push slides so they don't show
                            outside the container; absolute img allows mode="sync"
                            to run enter+exit simultaneously for the push effect.   */}
                        <style>{HOTSPOT_PULSE_STYLE}</style>
                        <div className="absolute inset-0 overflow-hidden z-10">
                    <AnimatePresence
                        mode="sync"
                        custom={directionRef.current}
                    >
                        {currentSlide.video_url ? (
                            <VideoPlayer url={currentSlide.video_url} loop={currentSlide.video_loop === true} key={currentSlide.id} onVideoEnded={handleNext} />
                        ) : (
                            <motion.img
                                key={currentSlide.id}
                                custom={directionRef.current}
                                variants={VARIANTS[viewMode] ?? storyVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={TRANSITIONS[viewMode] ?? TRANSITIONS.story}
                                src={currentSlide.image}
                                alt={currentSlide.title}
                                className="absolute inset-0 w-full h-full object-cover"
                                style={{
                                    objectPosition: currentSlide.image_position || '50% 50%',
                                    filter: activeHotspotPos ? 'grayscale(70%) blur(8px)' : 'none',
                                    transition: 'filter 0.4s ease',
                                }}
                            />
                        )}
                            </AnimatePresence>
                            {/* Spotlight layer: sharp copy masked to active hotspot */}
                            <AnimatePresence>
                                {activeHotspotPos && !currentSlide.video_url && (
                                    <>
                                        <motion.img
                                            key="spotlight"
                                            src={currentSlide.image}
                                            alt=""
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.35, ease: 'easeOut' }}
                                            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                            style={{
                                                objectPosition: currentSlide.image_position || '50% 50%',
                                                maskImage: `radial-gradient(circle at ${activeHotspotPos.x * 100}% ${activeHotspotPos.y * 100}%, black 220px, transparent 220px)`,
                                                WebkitMaskImage: `radial-gradient(circle at ${activeHotspotPos.x * 100}% ${activeHotspotPos.y * 100}%, black 220px, transparent 220px)`,
                                            }}
                                        />
                                        {/* 1px white inset ring at spotlight edge */}
                                        <motion.div
                                            key="spotlight-ring"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.35, ease: 'easeOut' }}
                                            className="absolute pointer-events-none rounded-full"
                                            style={{
                                                width: 440,
                                                height: 440,
                                                left: `${activeHotspotPos.x * 100}%`,
                                                top: `${activeHotspotPos.y * 100}%`,
                                                transform: 'translate(-50%, -50%)',
                                                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.9)',
                                            }}
                                        />
                                    </>
                                )}
                            </AnimatePresence>

                            {!currentSlide.video_url && slideHotspots.length > 0 && viewMode === 'story' && (
                                <ImageHotspots
                                    key={currentSlide.id}
                                    hotspots={slideHotspots}
                                    mapStyle={mapStyle}
                                    chapterColorIndex={currentSlide._chapter_index ?? chapterColorIndex}
                                    onAnyCardOpen={setActiveHotspotPos}
                                />
                            )}
                        </div>

                        {/* Text panel — hidden for non-looping videos (full video experience);
                            shown for looping videos (they function as illustrated stills) */}
                        <AnimatePresence>
                        {!hideTextPanel && !(currentSlide.video_url && !currentSlide.video_loop) && (
                        <TextPanelCarousel
                            chapterTitle={hideChapterTitle ? '' : chapterName}
                            slideTitle={currentSlide.title}
                            description={currentSlide.description || ''}
                            extendedContent={currentSlide.extended_content || ''}
                            location={currentSlide.location}
                            slideId={currentSlide.id}
                            mapStyle={mapStyle}
                            initialOpen={true}
                        />
                        )}
                        </AnimatePresence>

                        {/* Control strip — bottom centre (suppressed in page mode) */}
                        {!hideControlStrip && (
                        <FloatingControlStrip
                            onPrev={handlePrevious}
                            onNext={handleNext}
                            onClose={onClose}
                            hasMultipleSlides={hasMultipleSlides}
                            pdfUrl={currentSlide?.pdf_url || null}
                            pdfTitle={pdfTitle}
                            onPdfClick={() => setShowPdfModal(true)}
                        />
                        )}
                    </motion.div>

                    {/* Filmstrip — outside the transformed motion.div so fixed positioning
                        is relative to the viewport, not the transformed parent */}
                    <FilmstripBar
                        slides={slides}
                        currentIndex={currentIndex}
                        onNavigate={onNavigate}
                    />
                </>
            )}
        </AnimatePresence>

        {/* PDF modal — portalled above everything */}
        {createPortal(
            <AnimatePresence>
                {showPdfModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: 'easeInOut' }}
                        className="fixed left-0 right-0 bottom-0 top-[100px] z-[10002] bg-white flex flex-col pl-[50px] pr-[50px] pb-[50px]"
                    >
                        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-200 flex-shrink-0">
                            <h2 className="text-2xl font-light text-slate-800">{pdfTitle || 'Document'}</h2>
                            <button
                                onClick={() => setShowPdfModal(false)}
                                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <PdfViewer url={currentSlide?.pdf_url} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>,
            document.body
        )}
        </>
    );
}