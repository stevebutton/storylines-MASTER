import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

/**
 * FilmstripBar
 *
 * Collapsed: current thumbnail centred, adjacent (±1) partially visible,
 * all others collapsed to thin slivers indicating more content.
 * Hover: full filmstrip expands — all slides at full size, scrollable,
 * current highlighted with white ring.
 */
export default function FilmstripBar({ slides, currentIndex, onNavigate }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const stripRef = useRef(null);
    const currentThumbRef = useRef(null);

    const scrollToCurrent = (behavior = 'smooth') => {
        const strip = stripRef.current;
        const thumb = currentThumbRef.current;
        if (!strip || !thumb) return;
        strip.scrollTo({
            left: thumb.offsetLeft - strip.offsetWidth / 2 + thumb.offsetWidth / 2,
            behavior,
        });
    };

    // Snap to current slide instantly on slide change
    useEffect(() => { scrollToCurrent('instant'); }, [currentIndex]);

    // Smooth-scroll to current when filmstrip opens
    useEffect(() => { if (isExpanded) scrollToCurrent(); }, [isExpanded]);

    if (!slides || slides.length < 2) return null;

    return (
        <motion.div
            className="fixed bottom-0 right-0 z-[9998] pointer-events-auto"
            style={{ left: 380, overflow: 'hidden' }}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
            animate={{ height: isExpanded ? 124 : 76 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        >
            {/* Dark gradient backing */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />

            {/* Scrollable thumbnail row — aligns to bottom so thumbnails grow upward */}
            <div
                ref={stripRef}
                className="absolute bottom-0 left-0 right-0 flex items-end pb-3 px-4"
                style={{
                    gap: 6,
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    height: '100%',
                }}
            >
                {slides.map((slide, i) => {
                    const isCurrent = i === currentIndex;
                    const dist = Math.abs(i - currentIndex);
                    const src = slide.video_thumbnail_url || slide.image;

                    return (
                        <motion.button
                            key={i}
                            ref={isCurrent ? currentThumbRef : null}
                            onClick={() => onNavigate(i)}
                            animate={{
                                // Collapsed: current full, ±1 partial, rest = 8px slivers
                                width:   isCurrent ? 108 : isExpanded ? 88 : dist === 1 ? 72 : 8,
                                height:  isCurrent ? (isExpanded ? 84 : 60)
                                                   : isExpanded ? 72
                                                   : dist === 1 ? 48 : 48,
                                opacity: isCurrent ? 1
                                                   : isExpanded ? 0.8
                                                   : dist === 1 ? 0.55 : 0.15,
                            }}
                            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                            className="relative flex-shrink-0 rounded-md overflow-hidden focus:outline-none"
                            style={{
                                boxShadow: isCurrent
                                    ? '0 0 0 2px white, 0 2px 8px rgba(0,0,0,0.5)'
                                    : 'none',
                                minWidth: 0,
                            }}
                        >
                            {src
                                ? <img
                                    src={src}
                                    alt={slide.title || `Slide ${i + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                : <div className="w-full h-full bg-slate-700" />
                            }
                            {slide.video_url && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Play className="w-3 h-3 text-white fill-white drop-shadow" />
                                </div>
                            )}
                        </motion.button>
                    );
                })}
            </div>

            {/* Right edge fade mask */}
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-black/60 to-transparent pointer-events-none" />
        </motion.div>
    );
}
