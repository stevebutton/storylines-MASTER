import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PANEL_WIDTH = 380;

// Split HTML content at </p> boundaries, counting only text characters.
const splitHtmlIntoPages = (html, maxChars = 550) => {
    if (!html) return [html];
    const paragraphRegex = /<p[^>]*>.*?<\/p>/gi;
    const paragraphs = html.match(paragraphRegex);
    if (!paragraphs || paragraphs.length === 0) return [html];

    const stripTags = (str) => str.replace(/<[^>]*>/g, '');
    const pages = [];
    let currentPageContent = '';
    let currentTextLength = 0;

    for (const paragraph of paragraphs) {
        const textLength = stripTags(paragraph).length;
        if (currentPageContent && (currentTextLength + textLength) > maxChars) {
            pages.push(currentPageContent);
            currentPageContent = paragraph;
            currentTextLength = textLength;
        } else {
            currentPageContent += paragraph;
            currentTextLength += textLength;
        }
    }
    if (currentPageContent) pages.push(currentPageContent);
    return pages.length > 0 ? pages : [html];
};

const THEME_FONTS = {
    c: 'Righteous, cursive',
};

/**
 * TextPanelCarousel
 *
 * Full-bleed left panel for fullscreen image reading.
 * Contains only text content — no slide navigation controls.
 * Collapses off-screen to the left; a tab on the right edge
 * remains visible so the user can re-open it.
 */
const TextPanelCarousel = ({
    chapterTitle,
    slideTitle,
    description,
    extendedContent,
    location,
    mapStyle = 'a',
}) => {
    const themeFont = THEME_FONTS[mapStyle] || 'Raleway, sans-serif';
    const [currentPage, setCurrentPage] = useState(0);
    const [isPanelOpen, setIsPanelOpen] = useState(true);
    const [contentHeight, setContentHeight] = useState('auto');
    const pageRefs = useRef([]);

    // Build paginated content
    const extendedArray = Array.isArray(extendedContent)
        ? extendedContent
        : (extendedContent ? [extendedContent] : []);

    const splitExtended = extendedArray.flatMap(c => splitHtmlIntoPages(c));
    const pages = [
        ...(description ? [{ content: description }] : []),
        ...splitExtended.map(content => ({ content })),
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

    const nextPage = () => {
        if (currentPage < pages.length - 1) setCurrentPage(p => p + 1);
    };
    const prevPage = () => {
        if (currentPage > 0) setCurrentPage(p => p - 1);
    };

    return (
        // Outer wrapper — panel + tab translate together
        <div
            className="fixed left-0 top-[100px] bottom-0 z-[9999] flex items-stretch pointer-events-auto"
            style={{
                transform: isPanelOpen ? 'translateX(0)' : `translateX(-${PANEL_WIDTH}px)`,
                transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
        >
            {/* ── Text panel ── */}
            <div
                className="bg-white/70 backdrop-blur-xl overflow-y-auto flex-shrink-0 rounded-br-2xl"
                style={{ width: PANEL_WIDTH }}
            >
                <div className="p-8 space-y-5">

                    {/* Chapter eyebrow */}
                    {chapterTitle && (
                        <p className="text-xs font-medium text-amber-500 uppercase tracking-widest text-right"
                           style={{ fontFamily: themeFont }}>
                            {chapterTitle}
                        </p>
                    )}

                    {/* Location */}
                    {location && (
                        <div className="flex items-center justify-end gap-2">
                            <span className="text-sm text-slate-500" style={{ fontFamily: themeFont }}>
                                {location}
                            </span>
                            <div
                                className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
                                style={{ background: '#d97706', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
                            />
                        </div>
                    )}

                    {/* Slide title */}
                    {slideTitle && (
                        <h3
                            className="text-3xl font-light text-slate-800 text-right"
                            style={{ fontFamily: themeFont, lineHeight: '1.1' }}
                        >
                            {slideTitle}
                        </h3>
                    )}

                    {/* Paginated body */}
                    {pages.length > 0 && (
                        <>
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
                                            className="text-slate-600 leading-relaxed text-base font-light prose prose-sm max-w-none text-right"
                                            style={{ fontFamily: themeFont }}
                                            dangerouslySetInnerHTML={{ __html: page.content }}
                                        />
                                    </div>
                                ))}
                            </motion.div>

                            {/* Page navigation */}
                            {pages.length > 1 && (
                                <div className="flex items-center gap-2 pt-1">
                                    <button
                                        onClick={prevPage}
                                        disabled={currentPage === 0}
                                        className="w-7 h-7 rounded-full bg-black/10 hover:bg-black/20
                                                   disabled:opacity-30 disabled:cursor-not-allowed
                                                   flex items-center justify-center transition-colors"
                                        aria-label="Previous page"
                                    >
                                        <ChevronLeft className="w-4 h-4 text-black" />
                                    </button>

                                    {pages.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentPage(i)}
                                            className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                                                i === currentPage ? 'w-8 bg-black' : 'w-8 bg-black/25 hover:bg-black/50'
                                            }`}
                                            aria-label={`Page ${i + 1}`}
                                        />
                                    ))}

                                    <span className="text-xs text-black/40 tabular-nums">
                                        {currentPage + 1}/{pages.length}
                                    </span>

                                    <button
                                        onClick={nextPage}
                                        disabled={currentPage === pages.length - 1}
                                        className="w-7 h-7 rounded-full bg-black/10 hover:bg-black/20
                                                   disabled:opacity-30 disabled:cursor-not-allowed
                                                   flex items-center justify-center transition-colors"
                                        aria-label="Next page"
                                    >
                                        <ChevronRight className="w-4 h-4 text-black" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ── Collapse tab — stays at left edge when panel is hidden ── */}
            <button
                onClick={() => setIsPanelOpen(open => !open)}
                className="self-center w-8 h-16 bg-white/70 backdrop-blur-xl rounded-r-xl
                           flex items-center justify-center shadow-lg flex-shrink-0
                           hover:bg-white/90 transition-colors"
                aria-label={isPanelOpen ? 'Hide panel' : 'Show panel'}
            >
                <ChevronLeft
                    className="w-5 h-5 text-slate-500 transition-transform duration-300"
                    style={{ transform: isPanelOpen ? 'rotate(0deg)' : 'rotate(180deg)' }}
                />
            </button>
        </div>
    );
};

export default TextPanelCarousel;
