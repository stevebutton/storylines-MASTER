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

export default function ProjectDescriptionSection({ storyTitle, description, onContinue }) {
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
        <div
            className="relative w-full min-h-screen flex items-center justify-center pointer-events-none"
        >
            <motion.div
                initial={{ opacity: 0, y: 100 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 3, ease: 'easeOut' }}
                viewport={{ once: false, amount: 0.3 }}
                className="w-[500px] max-w-[90vw]"
            >
                <div className="relative bg-white/70 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20 pointer-events-auto group">
                    {/* Story title as section label */}
                    {storyTitle && (
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4 text-center">
                            {storyTitle}
                        </p>
                    )}

                    {/* Section heading */}
                    <h2 className="text-2xl font-bold text-black text-center mb-6">
                        Project Description
                    </h2>

                    {/* Paginated content */}
                    <motion.div
                        className="relative overflow-hidden"
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
                                    className="text-gray-900 leading-relaxed text-base space-y-4 text-center prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: page }}
                                />
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Page indicators */}
                    {pages.length > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-6">
                            {pages.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => goToPage(index)}
                                    className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                                        index === currentPage
                                            ? 'w-8 bg-black'
                                            : 'w-8 bg-black/30 hover:bg-black/50'
                                    }`}
                                    aria-label={`Go to page ${index + 1}`}
                                />
                            ))}
                            <span className="ml-2 text-sm text-black/60">
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
                                className="absolute left-2 bottom-6 w-10 h-10 rounded-full bg-black/10 hover:bg-black/20
                                           disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center
                                           opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                aria-label="Previous page"
                            >
                                <svg className="w-6 h-6 text-black" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                    <path d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={handleNext}
                                disabled={currentPage === pages.length - 1}
                                className="absolute right-2 bottom-6 w-10 h-10 rounded-full bg-black/10 hover:bg-black/20
                                           disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center
                                           opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                aria-label="Next page"
                            >
                                <svg className="w-6 h-6 text-black" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                    <path d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </>
                    )}

                    {/* Scroll-down arrow — inside panel */}
                    <div className="flex justify-center mt-8 pointer-events-auto">
                        <motion.button
                            onClick={onContinue}
                            className="cursor-pointer"
                            style={{ filter: 'brightness(0) opacity(0.5)' }}
                            whileHover={{
                                filter: 'brightness(0) opacity(1)',
                                scale: 1.1,
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
            </motion.div>
        </div>
    );
}
