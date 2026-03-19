import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PANEL_WIDTH = 380;

// Split content into pages at paragraph (HTML) or sentence (plain text) boundaries.
const splitHtmlIntoPages = (content, maxChars = 500) => {
    if (!content) return [];

    // HTML path — split at </p> boundaries
    if (/<p[\s>]/i.test(content)) {
        const paragraphRegex = /<p[^>]*>.*?<\/p>/gi;
        const paragraphs = content.match(paragraphRegex);
        if (paragraphs && paragraphs.length > 0) {
            const stripTags = (str) => str.replace(/<[^>]*>/g, '');
            const pages = [];
            let currentPageContent = '';
            let currentTextLength  = 0;
            for (const paragraph of paragraphs) {
                const textLength = stripTags(paragraph).length;
                if (currentPageContent && (currentTextLength + textLength) > maxChars) {
                    pages.push(currentPageContent);
                    currentPageContent = paragraph;
                    currentTextLength  = textLength;
                } else {
                    currentPageContent += paragraph;
                    currentTextLength  += textLength;
                }
            }
            if (currentPageContent) pages.push(currentPageContent);
            return pages.length > 0 ? pages : [content];
        }
    }

    // Plain text path — split at sentence end (. ! ?) then word boundary
    if (content.length <= maxChars) return [content];
    const pages = [];
    let remaining = content;
    while (remaining.length > maxChars) {
        const slice = remaining.slice(0, maxChars);
        const lastSentence = Math.max(
            slice.lastIndexOf('. '),
            slice.lastIndexOf('! '),
            slice.lastIndexOf('? '),
        );
        const splitAt = lastSentence > 0 ? lastSentence + 2 : maxChars;
        pages.push(remaining.slice(0, splitAt).trim());
        remaining = remaining.slice(splitAt).trim();
    }
    if (remaining) pages.push(remaining);
    return pages;
};

const THEME_FONTS = {
    c: 'Righteous, cursive',
    f: 'Oswald, sans-serif',
    k: 'Oswald, sans-serif',
};

/**
 * TextPanelCarousel
 *
 * Full-bleed left panel for fullscreen image reading.
 * Contains only text content — no slide navigation controls.
 * Collapses off-screen to the left; a tab on the right edge
 * remains visible so the user can re-open it.
 *
 * Entrance: panel slides in from left on mount; content elements
 * stagger in sequentially. No per-slide transition — content
 * updates in place without re-animating.
 */
const TextPanelCarousel = ({
    chapterTitle,
    slideTitle,
    description,
    extendedContent,
    location,
    slideId,
    mapStyle = 'a',
    initialOpen = true,
}) => {
    const themeFont = THEME_FONTS[mapStyle] || 'Raleway, sans-serif';
    const [currentPage, setCurrentPage] = useState(0);
    const [isPanelOpen, setIsPanelOpen] = useState(initialOpen);
    const [contentHeight, setContentHeight] = useState('auto');
    const pageRefs = useRef([]);
    const titleControls = useAnimation();
    const bodyControls  = useAnimation();

    // Build paginated content
    const extendedArray = Array.isArray(extendedContent)
        ? extendedContent
        : (extendedContent ? [extendedContent] : []);

    const splitExtended = extendedArray.flatMap(c => splitHtmlIntoPages(c));
    const combinedFirst = [description, splitExtended[0]].filter(Boolean).join('<br>');
    const splitFirst = combinedFirst ? splitHtmlIntoPages(combinedFirst) : [];
    const pages = [
        ...splitFirst.map(content => ({ content })),
        ...splitExtended.slice(1).map(content => ({ content })),
    ];

    // Reset to page 0 on slide change
    useEffect(() => {
        setCurrentPage(0);
    }, [chapterTitle, slideTitle]);

    // Measure page height
    useEffect(() => {
        if (pageRefs.current[currentPage]) {
            setContentHeight(pageRefs.current[currentPage].offsetHeight);
        }
    }, [currentPage]);

    useEffect(() => {
        const t = setTimeout(() => {
            if (pageRefs.current[0]) setContentHeight(pageRefs.current[0].offsetHeight);
        }, 120);
        return () => clearTimeout(t);
    }, [slideTitle]);

    // Re-animate title and body when the slide changes.
    // Using controls (instead of key) avoids double-rendering the element.
    useEffect(() => {
        titleControls.set({ opacity: 0, y: 12 });
        titleControls.start({ opacity: 1, y: 0, transition: { delay: 0.5, duration: 0.55, ease: 'easeOut' } });
        bodyControls.set({ opacity: 0, y: 12 });
        bodyControls.start({ opacity: 1, y: 0, transition: { delay: 1.0, duration: 0.55, ease: 'easeOut' } });
    }, [slideTitle]);

    const nextPage = () => {
        if (currentPage < pages.length - 1) setCurrentPage(p => p + 1);
    };
    const prevPage = () => {
        if (currentPage > 0) setCurrentPage(p => p - 1);
    };

    // Shared entrance transition for content elements — staggered delays
    const el = (delay) => ({
        initial:    { opacity: 0, y: 12 },
        animate:    { opacity: 1, y: 0 },
        transition: { delay, duration: 0.55, ease: 'easeOut' },
    });

    return (
        // Outer wrapper — panel + tab translate together via Framer Motion.
        // initial: off-screen left  →  animate: in-view or collapsed based on isPanelOpen.
        <motion.div
            className="fixed left-0 top-[100px] bottom-0 z-[9999] flex items-stretch pointer-events-auto"
            initial={{ x: -(PANEL_WIDTH + 48) }}
            animate={{ x: isPanelOpen ? 0 : -PANEL_WIDTH }}
            exit={{ opacity: 0, transition: { duration: 1, ease: 'easeInOut' } }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
            {/* ── Text panel ── */}
            {/* Blur + gradient on a separate stable layer so it never re-paints
                during slide-change animations, preventing the snap-to-blur artifact. */}
            <div className="relative overflow-y-auto flex-shrink-0 rounded-br-2xl" style={{ width: PANEL_WIDTH }}>
                <div
                    className="absolute inset-0 backdrop-blur-xl pointer-events-none rounded-br-2xl"
                    style={{
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.40) 0px, rgba(0,0,0,0.25) 200px, rgba(0,0,0,0.25) 100%)',
                        transform: 'translateZ(0)',
                    }}
                />
                <div className="relative p-8 space-y-5">

                    {/* Eyebrow block — fixed-height, bottom-aligned: chapter prefix/title + Location.
                        Location is the anchor that aligns with the timeline track. */}
                    <div key={slideId} style={{ minHeight: 130, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 12 }}>
                        {chapterTitle && (() => {
                            const colonIdx = chapterTitle.indexOf(': ');
                            const prefix = colonIdx !== -1 ? chapterTitle.slice(0, colonIdx + 1) : null;
                            const title  = colonIdx !== -1 ? chapterTitle.slice(colonIdx + 2) : chapterTitle;
                            return (
                                <motion.div
                                    {...el(0.45)}
                                    className="text-right uppercase tracking-widest leading-snug"
                                >
                                    {prefix && (
                                        <p className="text-lg font-medium text-white/70" style={{ fontFamily: themeFont }}>{prefix}</p>
                                    )}
                                    <p className="text-xl font-medium text-white" style={{ fontFamily: themeFont }}>{title}</p>
                                </motion.div>
                            );
                        })()}

                        {location && (
                            <motion.div
                                {...el(0.6)}
                                className="flex items-center justify-end"
                                style={{ paddingRight: 15 }}
                            >
                                <span className="text-sm text-white" style={{ fontFamily: themeFont }}>
                                    {location}
                                </span>
                            </motion.div>
                        )}
                    </div>

                    {/* Content block — slide title, description, extended content */}
                    {slideTitle && (
                        <motion.h3
                            animate={titleControls}
                            initial={{ opacity: 0, y: 12 }}
                            className="text-5xl font-light text-white text-right"
                            style={{ fontFamily: themeFont, lineHeight: '0.95' }}
                        >
                            {slideTitle}
                        </motion.h3>
                    )}

                    {/* Paginated body — re-animates via controls on each slide change */}
                    {pages.length > 0 && (
                        <motion.div animate={bodyControls} initial={{ opacity: 0, y: 12 }}>
                            <motion.div
                                className="relative overflow-hidden"
                                animate={{ height: contentHeight }}
                                transition={{ duration: 0.5, ease: 'easeInOut' }}
                            >
                                {pages.map((page, index) => (
                                    <div
                                        key={index}
                                        ref={el => pageRefs.current[index] = el}
                                        className={index === currentPage ? 'block' : 'hidden'}
                                    >
                                        <div
                                            className="leading-relaxed text-base font-light prose prose-sm max-w-none text-right prose-invert"
                                            style={{ color: 'white' }}
                                            dangerouslySetInnerHTML={{ __html: page.content }}
                                        />
                                    </div>
                                ))}
                            </motion.div>

                            {/* Page navigation */}
                            {pages.length > 1 && (
                                <div className="flex items-center justify-end gap-2 pt-5">
                                    <button
                                        onClick={prevPage}
                                        disabled={currentPage === 0}
                                        className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30
                                                   disabled:opacity-30 disabled:cursor-not-allowed
                                                   flex items-center justify-center transition-colors"
                                        aria-label="Previous page"
                                    >
                                        <ChevronLeft className="w-4 h-4 text-white" />
                                    </button>

                                    {pages.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentPage(i)}
                                            className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                                                i === currentPage ? 'w-8 bg-white' : 'w-8 bg-white/30 hover:bg-white/50'
                                            }`}
                                            aria-label={`Page ${i + 1}`}
                                        />
                                    ))}

                                    <button
                                        onClick={nextPage}
                                        disabled={currentPage === pages.length - 1}
                                        className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30
                                                   disabled:opacity-30 disabled:cursor-not-allowed
                                                   flex items-center justify-center transition-colors"
                                        aria-label="Next page"
                                    >
                                        <ChevronRight className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            </div>

            {/* ── Collapse tab — stays at left edge when panel is hidden ── */}
            <button
                onClick={() => setIsPanelOpen(open => !open)}
                className="self-center w-8 h-16 backdrop-blur-xl rounded-r-xl
                           flex items-center justify-center shadow-lg flex-shrink-0
                           hover:bg-white/10 transition-colors"
                aria-label={isPanelOpen ? 'Hide panel' : 'Show panel'}
            >
                <ChevronLeft
                    className="w-5 h-5 text-white transition-transform duration-300"
                    style={{ transform: isPanelOpen ? 'rotate(0deg)' : 'rotate(180deg)' }}
                />
            </button>
        </motion.div>
    );
};

export default TextPanelCarousel;
