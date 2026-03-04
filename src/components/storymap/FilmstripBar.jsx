import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

/**
 * FilmstripBar
 *
 * Collapsed: 60px, vertically centred alongside the nav pill.
 * Hover: expands to 120px, full filmstrip scrollable.
 * Edge zones auto-scroll the strip so the mouse never leaves the component.
 * Background gradient fades out when collapsed — no resting shadow.
 */
export default function FilmstripBar({ slides, currentIndex, onNavigate }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const stripRef = useRef(null);
    const thumbRefs = useRef([]);
    const scrollIntervalRef = useRef(null);

    const scrollToCurrent = (behavior = 'smooth') => {
        const strip = stripRef.current;
        const thumb = thumbRefs.current[currentIndex];
        if (!strip || !thumb) return;
        strip.scrollTo({
            left: thumb.offsetLeft - strip.offsetWidth / 2 + thumb.offsetWidth / 2,
            behavior,
        });
    };

    useEffect(() => { scrollToCurrent('instant'); }, [currentIndex]);
    useEffect(() => { if (isExpanded) scrollToCurrent(); }, [isExpanded]);

    // Bring individually hovered thumbnail into view
    useEffect(() => {
        if (hoveredIndex === null) return;
        thumbRefs.current[hoveredIndex]?.scrollIntoView({
            behavior: 'smooth', block: 'nearest', inline: 'nearest',
        });
    }, [hoveredIndex]);

    const startEdgeScroll = (direction) => {
        if (scrollIntervalRef.current) return;
        scrollIntervalRef.current = setInterval(() => {
            if (stripRef.current) stripRef.current.scrollLeft += direction * 8;
        }, 16);
    };

    const stopEdgeScroll = () => {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
    };

    useEffect(() => () => stopEdgeScroll(), []);

    if (!slides || slides.length < 2) return null;

    const activeRingIndex = hoveredIndex ?? currentIndex;

    return (
        <motion.div
            className="fixed right-0 z-[9998] pointer-events-auto overflow-hidden"
            style={{ left: 380, bottom: 72 }}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => { setIsExpanded(false); setHoveredIndex(null); stopEdgeScroll(); }}
            animate={{ height: isExpanded ? 120 : 60 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        >

            {/* Scrollable thumbnail row */}
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
                            {/* Slide title label */}
                            {slide.title && (
                                <div style={{
                                    position:   'absolute',
                                    bottom:     0,
                                    left:       0,
                                    right:      0,
                                    padding:    '10px 4px 3px',
                                    background: 'linear-gradient(to top, rgba(0,0,0,0.82), transparent)',
                                    pointerEvents: 'none',
                                }}>
                                    <span style={{
                                        display:      'block',
                                        fontSize:     8,
                                        lineHeight:   1.2,
                                        color:        'rgba(255,255,255,0.9)',
                                        overflow:     'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace:   'nowrap',
                                    }}>
                                        {slide.title}
                                    </span>
                                </div>
                            )}
                        </motion.button>
                    );
                })}
            </div>

            {/* Left edge scroll zone — keeps mouse inside filmstrip + scrolls left */}
            <div
                className="absolute left-0 top-0 bottom-0 w-12 pointer-events-auto"
                style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.35), transparent)' }}
                onMouseEnter={() => startEdgeScroll(-1)}
                onMouseLeave={stopEdgeScroll}
            />

            {/* Right edge scroll zone — keeps mouse inside filmstrip + scrolls right */}
            <div
                className="absolute right-0 top-0 bottom-0 w-12 pointer-events-auto"
                style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.35), transparent)' }}
                onMouseEnter={() => startEdgeScroll(1)}
                onMouseLeave={stopEdgeScroll}
            />
        </motion.div>
    );
}
