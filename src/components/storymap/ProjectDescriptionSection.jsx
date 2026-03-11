import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

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
    f: 'Oswald, sans-serif',
};

export default function ProjectDescriptionSection({ storyTitle, description, onContinue, backgroundImage, mapStyle = 'a' }) {
    const themeFont = THEME_FONTS[mapStyle] || 'Raleway, sans-serif';
    const [currentPage, setCurrentPage] = useState(0);
    const [contentHeight, setContentHeight] = useState('auto');
    const pageRefs = useRef([]);

    const pages = splitHtmlIntoPages(description);

    useEffect(() => {
        setTimeout(() => {
            if (pageRefs.current[0]) {
                setContentHeight(pageRefs.current[0].offsetHeight);
            }
        }, 100);
    }, []);

    useEffect(() => {
        if (pageRefs.current[currentPage]) {
            setContentHeight(pageRefs.current[currentPage].offsetHeight);
        }
    }, [currentPage]);

    const goToPage = (index) => setCurrentPage(index);

    const handleNext = () => {
        if (currentPage < pages.length - 1) setCurrentPage(currentPage + 1);
    };

    const handlePrev = () => {
        if (currentPage > 0) setCurrentPage(currentPage - 1);
    };

    return (
        <div className="relative w-full min-h-screen flex items-center justify-center pointer-events-none">
            <motion.div
                initial={{ opacity: 0, y: 100 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 3, ease: 'easeOut' }}
                viewport={{ once: false, amount: 0.3 }}
                className="w-[500px] max-w-[90vw]"
            >
                <div
                    className="relative rounded-2xl overflow-hidden shadow-2xl pointer-events-auto group"
                    style={{ minHeight: '500px' }}
                >
                    {/* Background image */}
                    {backgroundImage && (
                        <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${backgroundImage})` }}
                        />
                    )}
                    <div className="absolute inset-0 bg-black/40" />

                    <div className="relative z-10 flex flex-col items-center text-center p-6 md:p-8" style={{ minHeight: '500px' }}>
                        <div className="flex-1" />

                        {/* Story title — eyebrow, we've already seen this */}
                        {storyTitle && (
                            <div className="mb-2">
                                <span className="block text-xs font-medium text-amber-400 uppercase tracking-widest"
                                      style={{ fontFamily: themeFont }}>
                                    {storyTitle}
                                </span>
                            </div>
                        )}

                        {/* Overview heading — the key function of this panel */}
                        <div className="mb-5">
                            <span className="block text-5xl font-light text-amber-400 leading-none"
                                  style={{ fontFamily: themeFont }}>
                                Overview
                            </span>
                        </div>

                        {/* Paginated description */}
                        <motion.div
                            className="relative overflow-hidden mb-4"
                            animate={{ height: contentHeight }}
                            transition={{ height: { duration: 0.6, ease: 'easeInOut' } }}
                        >
                            {pages.map((page, index) => (
                                <motion.div
                                    key={index}
                                    ref={el => pageRefs.current[index] = el}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: index === currentPage ? 1 : 0 }}
                                    transition={{ duration: 0.3 }}
                                    className={index === currentPage ? 'block' : 'hidden'}
                                >
                                    <div
                                        className="text-white/90 leading-relaxed text-base font-light prose prose-sm max-w-none prose-invert"
                                        style={{ fontFamily: themeFont }}
                                        dangerouslySetInnerHTML={{ __html: page }}
                                    />
                                </motion.div>
                            ))}
                        </motion.div>

                        {/* Page indicators */}
                        {pages.length > 1 && (
                            <div className="flex items-center justify-center gap-2 mb-6">
                                {pages.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => goToPage(index)}
                                        className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                                            index === currentPage
                                                ? 'w-8 bg-white'
                                                : 'w-8 bg-white/30 hover:bg-white/60'
                                        }`}
                                        aria-label={`Go to page ${index + 1}`}
                                    />
                                ))}
                                <span className="ml-1 text-xs text-white/50">
                                    {currentPage + 1} / {pages.length}
                                </span>
                            </div>
                        )}

                        {/* Prev/next arrows — visible on hover */}
                        {pages.length > 1 && (
                            <>
                                <button
                                    onClick={handlePrev}
                                    disabled={currentPage === 0}
                                    className="absolute left-3 bottom-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20
                                               disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center
                                               opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    aria-label="Previous page"
                                >
                                    <svg className="w-5 h-5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                        <path d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <button
                                    onClick={handleNext}
                                    disabled={currentPage === pages.length - 1}
                                    className="absolute right-3 bottom-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20
                                               disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center
                                               opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    aria-label="Next page"
                                >
                                    <svg className="w-5 h-5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                        <path d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </>
                        )}

                        {/* Scroll-down arrow */}
                        <div className="flex justify-center pointer-events-auto">
                            <motion.button
                                onClick={onContinue}
                                className="cursor-pointer"
                                whileHover={{
                                    scale: 1.1,
                                    filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))',
                                    transition: { duration: 0.2, ease: 'easeInOut' }
                                }}
                            >
                                <img
                                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/a1c59b412_scrolldown-arrow.png"
                                    alt="Continue to story"
                                    width="74"
                                    height="50"
                                />
                            </motion.button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
