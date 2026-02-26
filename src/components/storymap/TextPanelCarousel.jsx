import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
 * @param {string} location - Location text with orange circle indicator
 * @param {string|null} slideCounter - Slide counter text (e.g., "2 / 5") or null
 */
const TextPanelCarousel = ({ chapterTitle, slideTitle, description, extendedContent, location, slideCounter }) => {
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

  // Description is always first page (always short, no splitting needed)
  // Split each extendedContent item if it exceeds 550 characters
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

  // Animation variants
  const panelVariants = {
    hidden: { opacity: 0, y: -100 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        delay: 1
      }
    },
    exit: {
      opacity: 0,
      y: 100,
      transition: {
        duration: 0.4,
        delay: 0.2
      }
    }
  };

  const chapterVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, delay: 2.2 }
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: { duration: 0.3, delay: 0.15 }
    }
  };

  const slideVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, delay: 2.8 }
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: { duration: 0.3, delay: 0.1 }
    }
  };

  const locationVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, delay: 3.4 }
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: { duration: 0.3, delay: 0.05 }
    }
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, delay: 4.0 }
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: { duration: 0.3 }
    }
  };

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
      {/* Chapter Title with Toggle - Always visible */}
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
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide text-right flex-1 pb-[15px]">
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
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
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
              transition={{
                height: { duration: 1, ease: "easeInOut" }
              }}
              onAnimationComplete={(definition) => {
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

            {/* Location */}
            {location && (
              <motion.div
                className="flex items-center justify-end gap-2 mt-6 mb-[30px]"
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
                  style={{
                    background: '#d97706',
                    border: '3px solid white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                  }}
                />
              </motion.div>
            )}

            {/* Slide Counter */}
            {slideCounter && (
              <div className="text-sm text-gray-500 text-right mt-2 mb-5">{slideCounter}</div>
            )}

            {/* Page indicators */}
            {pages.length > 1 && (
              <div className={`flex items-center justify-center gap-2 ${!location ? 'mt-[30px]' : ''}`}>
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

            {/* Navigation arrows - visible on hover */}
            {pages.length > 1 && (
              <>
                <button
                  onClick={prevPage}
                  disabled={currentPage === 0}
                  className="absolute left-2 bottom-6
                             w-10 h-10 rounded-full bg-black/10 hover:bg-black/20
                             disabled:opacity-30 disabled:cursor-not-allowed
                             flex items-center justify-center
                             opacity-0 group-hover:opacity-100
                             transition-opacity duration-300
                             backdrop-blur-sm"
                  aria-label="Previous page"
                >
                  <svg
                    className="w-6 h-6 text-black"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M15 19l-7-7 7-7"></path>
                  </svg>
                </button>
                <button
                  onClick={nextPage}
                  disabled={currentPage === pages.length - 1}
                  className="absolute right-2 bottom-6
                             w-10 h-10 rounded-full bg-black/10 hover:bg-black/20
                             disabled:opacity-30 disabled:cursor-not-allowed
                             flex items-center justify-center
                             opacity-0 group-hover:opacity-100
                             transition-opacity duration-300
                             backdrop-blur-sm"
                  aria-label="Next page"
                >
                  <svg
                    className="w-6 h-6 text-black"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M9 5l7 7-7 7"></path>
                  </svg>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TextPanelCarousel;
