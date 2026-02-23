import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * TextPanelCarousel Component
 * 
 * A glassmorphism text panel with automatic pagination, staggered entrance animations,
 * and smooth height transitions. Designed for fullscreen image galleries.
 * 
 * FEATURES:
 * - Auto-pagination: Splits long content at 550 characters (configurable in splitIntoPagesAtParagraphs)
 * - Smooth height animation: Panel grows/shrinks over 1s when content changes
 * - Staggered entrance: Chapter → Title → Location → Content (only on first load)
 * - Toggle collapse/expand
 * - Keyboard navigation (left/right arrows)
 * - Progress indicators with page counter
 * 
 * DEPENDENCIES:
 * - react (useState, useEffect, useRef)
 * - framer-motion (motion, AnimatePresence)
 * - tailwindcss (for styling)
 * 
 * @param {string} chapterTitle - Small uppercase gray text (e.g., "Chapter 3: Urban Shadows")
 * @param {string} slideTitle - Large bold heading (e.g., "Nairobi After Dark")
 * @param {string} description - First page content (always short, never split)
 * @param {string[]} extendedContent - Array of additional content (auto-splits at 550 chars)
 * @param {string} location - Location text with orange circle indicator (e.g., "Nairobi, Kenya")
 */
const TextPanelCarousel = ({ chapterTitle, slideTitle, description, extendedContent, location }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [previousPage, setPreviousPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isOpen, setIsOpen] = useState(true);
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false);
  const [contentHeight, setContentHeight] = useState('auto');
  const pageRefs = useRef([]);
  
  // Build pages array from props
  // Split content at paragraph boundaries if it exceeds character limit
  // TO ADJUST CHARACTER LIMIT: Change the maxChars value (currently 550)
  const splitIntoPagesAtParagraphs = (text, maxChars = 550) => {
    const paragraphs = text.split('\n\n');
    const pages = [];
    let currentPage = '';
    
    for (const paragraph of paragraphs) {
      // If adding this paragraph would exceed limit and we have content
      if (currentPage && (currentPage.length + paragraph.length + 2) > maxChars) {
        // Save current page and start new one
        pages.push(currentPage.trim());
        currentPage = paragraph;
      } else {
        // Add paragraph to current page (with separator if not first)
        currentPage += (currentPage ? '\n\n' : '') + paragraph;
      }
    }
    
    // Add final page if not empty
    if (currentPage) {
      pages.push(currentPage.trim());
    }
    
    return pages.length > 0 ? pages : [text]; // Fallback to original if split fails
  };

  // Description is always first page (always short, no splitting needed)
  // Split each extendedContent item if it exceeds 550 characters
  const splitExtendedContent = extendedContent.flatMap(content => 
    splitIntoPagesAtParagraphs(content)
  );

  const pages = [
    { content: description },
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
        duration: 0.8,
        delay: 2.2
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
      transition: { duration: 0.4, delay: 1.8 }
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
      transition: { duration: 0.4, delay: 1.2 }
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
      transition: { duration: 0.4, delay: 0.6 }
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
      transition: { duration: 0.4 }
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        prevPage();
      } else if (e.key === 'ArrowRight') {
        nextPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, pages.length]);

  return (
    <motion.div 
      className="relative bg-white/80 backdrop-blur-md rounded-lg p-8 w-[400px] group shadow-lg"
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
                <h3 className="text-2xl font-bold text-black text-right">
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
                // Set hasAnimatedIn after the content stagger completes (4.6s total)
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
                    <div className="text-gray-900 leading-relaxed text-base space-y-4 text-right">
                      {page.content.split('\n\n').map((paragraph, i) => (
                        <p key={i}>{paragraph}</p>
                      ))}
                    </div>
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
                <span className="text-sm text-gray-600 text-right">{location}</span>
                <div className="w-5 h-5 rounded-full bg-orange-500"></div>
              </motion.div>
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
