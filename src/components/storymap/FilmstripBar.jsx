import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

/**
 * FilmstripBar
 *
 * Sits beside the FloatingControlStrip pill at bottom-8.
 * Collapsed height matches the pill (~60px). Hover expands to 120px.
 * White ring follows the hovered thumbnail; falls back to current slide.
 * Hovering near the edges auto-scrolls to reveal off-screen thumbnails.
 */
export default function FilmstripBar({ slides, currentIndex, onNavigate }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const stripRef = useRef(null);
    const thumbRefs = useRef([]);

    const scrollToCurrent = (behavior = 'smooth') => {
        const strip = stripRef.current;
        const thumb = thumbRefs.current[currentIndex];
        if (!strip || !thumb) return;
        strip.scrollTo({
            left: thumb.offsetLeft - strip.offsetWidth / 2 + thumb.offsetWidth / 2,
            behavior,
        });
    };

    // Snap to current on slide change; smooth-scroll when strip opens
    useEffect(() => { scrollToCurrent('instant'); }, [currentIndex]);
    useEffect(() => { if (isExpanded) scrollToCurrent(); }, [isExpanded]);

    // Bring hovered thumbnail into view
    useEffect(() => {
        if (hoveredIndex === null) return;
        const thumb = thumbRefs.current[hoveredIndex];
        if (thumb) thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }, [hoveredIndex]);

    if (!slides || slides.length < 2) return null;

    // Ring follows hovered thumbnail; falls back to current
    const activeRingIndex = hoveredIndex ?? currentIndex;

    return (
        <motion.div
            className="fixed bottom-8 right-0 z-[9998] pointer-events-auto"
            style={{ left: 380, overflow: 'hidden' }}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => { setIsExpanded(false); setHoveredIndex(null); }}
            animate={{ height: isExpanded ? 120 : 60 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        >
            {/* Dark gradient backing */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />

            {/* Scrollable thumbnail row — vertically centred */}
            <div
                ref={stripRef}
                className="absolute inset-0 flex items-center px-3"
                style={{
                    gap: 6,
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }}
            >
                {slides.map((slide, i) => {
                    const isCurrent = i === currentIndex;
                    const dist = Math.abs(i - currentIndex);
                    const src = slide.video_thumbnail_url || slide.image;

                    return (
                        <motion.button
                            key={i}
                            ref={el => thumbRefs.current[i] = el}
                            onClick={() => onNavigate(i)}
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            animate={{
                                width:   isCurrent ? 108 : isExpanded ? 88 : dist === 1 ? 72 : 8,
                                height:  isCurrent ? (isExpanded ? 84 : 46)
                                                   : isExpanded ? 72
                                                   : dist === 1 ? 42 : 42,
                                opacity: isCurrent ? 1
                                                   : isExpanded ? 0.8
                                                   : dist === 1 ? 0.55 : 0.15,
                            }}
                            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                            className="relative flex-shrink-0 rounded-md overflow-hidden focus:outline-none"
                            style={{
                                boxShadow: i === activeRingIndex
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
