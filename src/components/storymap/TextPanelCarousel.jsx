import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

/**
 * TextPanelCarousel Component
 *
 * A glassmorphism text panel with automatic pagination, staggered entrance animations,
 * and smooth height transitions. Designed for fullscreen image galleries.
 *
 * @param {string} chapterTitle - Small uppercase gray text (e.g., "Chapter 3: Urban Shadows")
 * @param {string} slideTitle - Large bold heading (e.g., "Nairobi After Dark")
 * @param {string} description - First page content as HTML string (always short, never split)
 * @param {string|string[]} extendedContent - HTML string or array of HTML strings (auto-splits at 550 chars)
 * @param {string} location - Location text with orange circle indicator (always visible, even when collapsed)
 * @param {string|null} slideCounter - Slide counter text (e.g., "2 / 5") or null
 * @param {function} onPrevSlide - Navigate to previous slide in fullscreen
 * @param {function} onNextSlide - Navigate to next slide in fullscreen
 * @param {function} onClose - Close fullscreen viewer
 * @param {boolean} hasMultipleSlides - Whether prev/next slide buttons should be enabled
 */
const TextPanelCarousel = ({
  chapterTitle, slideTitle, description, extendedContent,
  location, slideCounter,
  onPrevSlide, onNextSlide, onClose, hasMultipleSlides
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [previousPage, setPreviousPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isOpen, setIsOpen] = useState(true);
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false);
  const [contentHeight, setContentHeight] = useState('auto');
  const pageRefs = useRef([]);

  // Normalize extendedContent to array
  const extendedArray = Array.isArray(extendedContent)
    ? extendedContent
    : (extendedContent ? [extendedContent] : []);

  // Split HTML content at </p> boundaries, counting only text characters
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

  const splitExtendedContent = extendedArray.flatMap(content =>
    splitHtmlIntoPages(content)
  );

  const pages = [
    ...(description ? [{ content: description }] : []),
    ...splitExtendedContent.map(content => ({ content }))
  ];

  // Measure page height when current page changes
  useEffect(() => {
    if (pageRefs.current[currentPage]) {
      const height = pageRefs.current[currentPage].offsetHeight;
      setContentHeight(height);
    }
  }, [currentPage]);

  // Set initial height
  useEffect(() => {
    setTimeout(() => {
      if (pageRefs.current[0]) {
        const height = pageRefs.current[0].offsetHeight;
        setContentHeight(height);
      }
    }, 100);
  }, []);

  // ── Animation variants ──────────────────────────────────────────────────────

  const panelVariants = {
    hidden: { opacity: 0, y: -100 },
    visible: { opacity: 1, y: 0, transition: { duration: 1, delay: 1 } },
    exit:    { opacity: 0, y: 100, transition: { duration: 0.4, delay: 0.2 } }
  };

  const chapterVariants = {
    hidden:  { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 2.2 } },
    exit:    { opacity: 0, y: -10, transition: { duration: 0.3, delay: 0.15 } }
  };

  // Location now sits between chapter header and collapsible; delay between 2.2 and 2.8
  const locationVariants = {
    hidden:  { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 2.5 } },
    exit:    { opacity: 0, y: -10, transition: { duration: 0.3, delay: 0.05 } }
  };

  const slideVariants = {
    hidden:  { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 2.8 } },
    exit:    { opacity: 0, y: -10, transition: { duration: 0.3, delay: 0.1 } }
  };

  const contentVariants = {
    hidden:  { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 4.0 } },
    exit:    { opacity: 0, y: -10, transition: { duration: 0.3 } }
  };

  // ── Page navigation ─────────────────────────────────────────────────────────

  const nextPage = () => {
    if (currentPage < pages.length - 1) {
      setPreviousPage(currentPage);
      setDirection(1);
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setPreviousPage(currentPage);
      setDirection(-1);
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (index) => {
    setPreviousPage(currentPage);
    setDirection(index > currentPage ? 1 : -1);
    setCurrentPage(index);
  };

  return (
    <motion.div
      className="relative bg-white/60 backdrop-blur-md rounded-lg p-8 w-[400px] group shadow-lg"
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Chapter Title with Toggle — always visible */}
      {chapterTitle && (
        <motion.div
          className="mb-2 flex items-center justify-between"
          {...(!hasAnimatedIn && {
            variants: chapterVariants,
            initial: "hidden",
            animate: "visible",
            exit: "exit"
          })}
        >
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide text-right flex-1">
            {chapterTitle}
          </h2>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20
                       flex items-center justify-center transition-colors duration-200 ml-4"
            aria-label={isOpen ? "Hide content" : "Show content"}
          >
            <svg
              className="w-5 h-5 text-black transition-transform duration-300"
              style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(180deg)' }}
              fill="none" strokeLinecap="round" strokeLinejoin="round"
              strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </motion.div>
      )}

      {/* Location — always visible, persists when panel is collapsed */}
      {location && (
        <motion.div
          className="flex items-center justify-end gap-2 mb-4"
          {...(!hasAnimatedIn && {
            variants: locationVariants,
            initial: "hidden",
            animate: "visible",
            exit: "exit"
          })}
        >
          <span className="text-sm text-gray-600 text-right min-w-0">{location}</span>
          <div
            className="flex-shrink-0 w-10 h-10 rounded-full"
            style={{ background: '#d97706', border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
          />
        </motion.div>
      )}

      {/* Collapsible content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="collapsible"
            initial={hasAnimatedIn ? { height: 0, opacity: 0 } : false}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            {/* Slide Title */}
            {slideTitle && (
              <motion.div
                className="mb-6"
                {...(!hasAnimatedIn && {
                  variants: slideVariants,
                  initial: "hidden",
                  animate: "visible",
                  exit: "exit"
                })}
              >
                <h3 className="text-black text-right" style={{ fontSize: '1.5rem', fontWeight: 500, lineHeight: 1.1 }}>
                  {slideTitle}
                </h3>
              </motion.div>
            )}

            {/* Content area with height animation */}
            <motion.div
              className="relative overflow-hidden"
              animate={{ height: contentHeight }}
              transition={{ height: { duration: 1, ease: "easeInOut" } }}
              onAnimationComplete={() => {
                if (!hasAnimatedIn) {
                  setTimeout(() => setHasAnimatedIn(true), 4600);
                }
              }}
            >
              <motion.div
                {...(!hasAnimatedIn && {
                  variants: contentVariants,
                  initial: "hidden",
                  animate: "visible",
                  exit: "exit"
                })}
              >
                {pages.map((page, index) => (
                  <motion.div
                    key={index}
                    ref={el => pageRefs.current[index] = el}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: index === currentPage ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                    className={`max-h-[calc(100vh-340px)] overflow-y-auto ${
                      index === currentPage ? 'block' : 'hidden'
                    }`}
                  >
                    <div
                      className="text-gray-900 leading-relaxed text-base space-y-4 text-right prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: page.content }}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* Slide Counter */}
            {slideCounter && (
              <div className="text-sm text-gray-500 text-right mt-4 mb-2">{slideCounter}</div>
            )}

            {/* Page indicators + inline prev/next page arrows */}
            {pages.length > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 0}
                  className="w-7 h-7 rounded-full bg-black/10 hover:bg-black/20
                             disabled:opacity-30 disabled:cursor-not-allowed
                             flex items-center justify-center transition-all"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4 text-black" />
                </button>

                {pages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToPage(index)}
                    className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                      index === currentPage ? 'w-8 bg-black' : 'w-8 bg-black/30 hover:bg-black/50'
                    }`}
                    aria-label={`Go to page ${index + 1}`}
                  />
                ))}

                <span className="text-sm text-black/60">
                  {currentPage + 1} / {pages.length}
                </span>

                <button
                  onClick={nextPage}
                  disabled={currentPage === pages.length - 1}
                  className="w-7 h-7 rounded-full bg-black/10 hover:bg-black/20
                             disabled:opacity-30 disabled:cursor-not-allowed
                             flex items-center justify-center transition-all"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4 text-black" />
                </button>
              </div>
            )}

            {/* Slide navigation — generous gap above to separate from page nav */}
            <div className="mt-10 flex items-center justify-between">
              <button
                onClick={onPrevSlide}
                disabled={!hasMultipleSlides}
                className="bg-black/10 hover:bg-black/20 rounded-full p-3 transition-all
                           disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-6 h-6 text-slate-700" />
              </button>
              <button
                onClick={onClose}
                className="bg-black/10 hover:bg-black/20 rounded-full p-3 transition-all"
                aria-label="Close"
              >
                <X className="w-6 h-6 text-slate-700" />
              </button>
              <button
                onClick={onNextSlide}
                disabled={!hasMultipleSlides}
                className="bg-black/10 hover:bg-black/20 rounded-full p-3 transition-all
                           disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Next slide"
              >
                <ChevronRight className="w-6 h-6 text-slate-700" />
              </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TextPanelCarousel;
