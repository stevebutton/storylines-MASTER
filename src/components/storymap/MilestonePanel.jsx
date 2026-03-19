import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const THEME_FONTS = {
    c: 'Righteous, cursive',
    f: 'Oswald, sans-serif',
    k: 'Oswald, sans-serif',
};

const PANEL_WIDTH       = 345;
const TRACK_LEFT        = 396;
const TRACK_RIGHT       = 48;
const PANEL_TOP         = 345;
const TRACK_FROM_BOTTOM = 116;

function formatDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function MilestonePanel({ milestone, date, cursorPercent, initialDelay = 0, slideKey, mapStyle = 'a' }) {
    const themeFont = THEME_FONTS[mapStyle] || 'Raleway, sans-serif';
    const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
    const [panelHeight,   setPanelHeight]   = useState(80);
    const panelRef = useRef(null);

    useEffect(() => {
        const handleResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useLayoutEffect(() => {
        if (panelRef.current) {
            const h = panelRef.current.getBoundingClientRect().height;
            if (h > 0) setPanelHeight(h);
        }
    });

    const hasMilestone = milestone && milestone.replace(/<[^>]*>/g, '').trim().length > 0;

    const trackWidth   = viewportWidth - TRACK_LEFT - TRACK_RIGHT;
    const cursorX      = TRACK_LEFT + (Math.max(0, Math.min(100, cursorPercent)) / 100) * trackWidth;
    const panelLeft    = Math.max(TRACK_LEFT, Math.min(viewportWidth - PANEL_WIDTH - 16, cursorX - PANEL_WIDTH / 2));

    return (
        <>
            {/* Panel — dissolves in with 50px upward move, dissolves out */}
            <AnimatePresence>
                {hasMilestone && (
                    <motion.div
                        key={slideKey ?? milestone}
                        ref={panelRef}
                        style={{
                            position:      'fixed',
                            top:           PANEL_TOP,
                            left:          panelLeft,
                            width:         PANEL_WIDTH,
                            zIndex:        2,
                            pointerEvents: 'none',
                        }}
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 0, transition: { duration: 0.4, delay: 0 } }}
                        transition={{ delay: initialDelay, duration: 1, ease: 'easeOut' }}
                    >
                        <div
                            className="absolute inset-0 rounded-xl pointer-events-none"
                            style={{
                                backdropFilter:       'blur(24px)',
                                WebkitBackdropFilter: 'blur(24px)',
                                background:           'rgba(0,0,0,0.25)',
                            }}
                        />
                        {/* Text dissolves in after panel lands */}
                        <motion.div
                            className="relative"
                            style={{ padding: '20px 50px 30px', color: 'white' }}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: initialDelay + 1, duration: 1.2, ease: 'easeOut' }}
                        >
                            {formatDate(date) && (
                                <div style={{
                                    fontFamily:    themeFont,
                                    fontSize:      22,
                                    fontWeight:    500,
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    color:         'rgba(245,158,11,0.9)',
                                    marginBottom:  8,
                                }}>
                                    {formatDate(date)}
                                </div>
                            )}
                            <div
                                className="milestone-panel-content leading-relaxed text-base font-light prose prose-sm max-w-none prose-invert"
                                style={{ color: 'white' }}
                                dangerouslySetInnerHTML={{ __html: milestone }}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Connector — dissolves in after panel lands, dissolves out */}
            <AnimatePresence>
                {hasMilestone && (
                    <motion.div
                        key={`connector-${slideKey ?? milestone}`}
                        style={{
                            position:   'fixed',
                            left:       cursorX - 7,
                            top:        PANEL_TOP + panelHeight,
                            bottom:     TRACK_FROM_BOTTOM,
                            width:      1,
                            background: 'linear-gradient(to bottom, rgba(255,255,255,0.75), rgba(255,255,255,0.1))',
                            zIndex:     210000,
                            pointerEvents: 'none',
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.3, delay: 0 } }}
                        transition={{ delay: initialDelay + 1, duration: 0.5, ease: 'easeOut' }}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
