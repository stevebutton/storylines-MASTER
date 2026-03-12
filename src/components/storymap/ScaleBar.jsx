import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { useTranslation } from '@/contexts/StoryTranslationContext';

/**
 * ScaleBar — horizontal navigation axis, shared by Story and Timeline modes.
 *
 * chapters mode:
 *   - Full-width draggable label row (each chapter = 380px slot).
 *     Active chapter snaps to position 0 (left edge, above the text panel).
 *     Drag left/right to reveal adjacent chapters; release snaps to nearest.
 *   - Track line starts at x=380 (right of text panel), cursor + dividers only.
 *
 * dates mode:
 *   - Month/year ticks with labels, unchanged from before.
 */

const SLOT_WIDTH = 380;

const THEME_FONTS = { c: 'Righteous, cursive', f: 'Oswald, sans-serif', k: 'Oswald, sans-serif' };

export default function ScaleBar({
    cursorPercent      = 0,
    mode               = 'chapters',
    height             = 95,
    activeChapterIndex = 0,
    mapStyle           = 'a',
    onSeek             = null,
    // chapters
    segments           = [],
    // dates
    ticks              = [],
    startLabel         = '',
    endLabel           = '',
}) {
    const themeFont = THEME_FONTS[mapStyle] || 'Raleway, sans-serif';
    const trackTop = 107;
    const { t } = useTranslation();

    // ── Draggable label row (chapters mode) ──────────────────────────────────
    const x         = useMotionValue(0);
    const draggedRef = useRef(false); // suppress click if we actually dragged

    // ── Draggable cursor ─────────────────────────────────────────────────────
    const trackRef        = useRef(null);
    const [trackWidth, setTrackWidth] = useState(0);
    const cursorX         = useMotionValue(0);
    const isDraggingCursor = useRef(false);

    // Measure track width
    useEffect(() => {
        if (!trackRef.current) return;
        const obs = new ResizeObserver(([entry]) => setTrackWidth(entry.contentRect.width));
        obs.observe(trackRef.current);
        return () => obs.disconnect();
    }, []);

    // Sync cursor position when cursorPercent or trackWidth changes (not during drag)
    useEffect(() => {
        if (isDraggingCursor.current || !trackWidth) return;
        const target = (Math.max(0, Math.min(100, cursorPercent)) / 100) * trackWidth;
        animate(cursorX, target, { type: 'spring', stiffness: 300, damping: 35 });
    }, [cursorPercent, trackWidth]); // eslint-disable-line react-hooks/exhaustive-deps

    // Snap to active chapter whenever it changes
    useEffect(() => {
        if (mode !== 'chapters' || !segments.length) return;
        animate(x, -(activeChapterIndex * SLOT_WIDTH), {
            type:      'spring',
            stiffness: 400,
            damping:   40,
        });
    }, [activeChapterIndex, mode, segments.length]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleDragEnd = () => {
        const currentX   = x.get();
        const nearestIdx = Math.round(-currentX / SLOT_WIDTH);
        const clamped    = Math.max(0, Math.min(segments.length - 1, nearestIdx));
        animate(x, -(clamped * SLOT_WIDTH), {
            type:      'spring',
            stiffness: 400,
            damping:   40,
        });
    };

    // Pre-compute cumulative start % positions for track dividers
    const starts = mode === 'chapters' && segments.length > 0
        ? segments.reduce((acc, seg, i) => {
            acc.push(i === 0 ? 0 : acc[i - 1] + segments[i - 1].widthPercent);
            return acc;
        }, [])
        : [];

    return (
        <div className="relative flex-shrink-0 select-none" style={{ height, overflow: 'hidden' }}>

            {/* ══ CHAPTER LABEL ROW — full-width, draggable ═══════════════════
                Each chapter occupies a SLOT_WIDTH (380px) wide slot.
                translateX snaps to -(activeChapterIndex * 380) so the active
                chapter is always positioned above the text panel.             */}
            {mode === 'chapters' && segments.length > 0 && (
                <motion.div
                    drag="x"
                    dragConstraints={{ left: -(segments.length - 1) * SLOT_WIDTH, right: 0 }}
                    dragElastic={0.05}
                    dragMomentum={false}
                    style={{
                        x,
                        display:       'flex',
                        position:      'absolute',
                        top:           0,
                        left:          0,
                        width:         segments.length * SLOT_WIDTH,
                        height:        trackTop - 10,
                        pointerEvents: 'auto',
                        touchAction:   'none',
                    }}
                    onDragStart={() => { draggedRef.current = false; }}
                    onDrag={(_, info) => { if (Math.abs(info.offset.x) > 5) draggedRef.current = true; }}
                    onDragEnd={handleDragEnd}
                >
                    {segments.map((seg) => (
                        <button
                            key={`lbl-${seg.id}`}
                            onClick={() => { if (!draggedRef.current) seg.onClick?.(); }}
                            style={{
                                width:          SLOT_WIDTH,
                                flexShrink:     0,
                                paddingLeft:    40,
                                paddingRight:   32,
                                height:         '100%',
                                display:        'flex',
                                flexDirection:  'column',
                                justifyContent: 'flex-end',
                                background:     'none',
                                border:         'none',
                                cursor:         'pointer',
                                textAlign:      'right',
                            }}
                        >
                            <div style={{ maxWidth: '100%' }}>
                                <div style={{
                                    fontSize:      18,
                                    fontWeight:    500,
                                    color:         'rgba(255,255,255,0.7)',
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    lineHeight:    1.2,
                                    whiteSpace:    'nowrap',
                                    fontFamily:    themeFont,
                                }}>
                                    {`${t('chapter_prefix')} ${String(seg.chapterNum).padStart(2, '0')}:`}
                                </div>
                                <div style={{
                                    fontSize:      20,
                                    fontWeight:    500,
                                    color:         'rgba(255,255,255,1)',
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    lineHeight:    1.2,
                                    fontFamily:    themeFont,
                                }}>
                                    {seg.label}
                                </div>
                            </div>
                        </button>
                    ))}

                </motion.div>
            )}

            {/* ── Track line — starts at x=358 (right of text panel) in both modes ── */}
            <div
                ref={trackRef}
                className="absolute"
                style={{
                    left:       358,
                    right:      48,
                    top:        trackTop,
                    height:     1,
                    background: 'rgba(255,255,255,0.85)',
                }}
            >
                {/* ── Amber cursor — draggable ── */}
                <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: trackWidth }}
                    dragElastic={0}
                    dragMomentum={false}
                    style={{
                        x:             cursorX,
                        position:      'absolute',
                        left:          -10,   // center: cursor midpoint at x=0
                        top:           -9,
                        width:         20,
                        height:        20,
                        borderRadius:  '50%',
                        background:    '#f59e0b',
                        boxShadow:     '0 0 20px rgba(245,158,11,0.9)',
                        zIndex:        2,
                        pointerEvents: 'auto',
                        cursor:        'grab',
                        touchAction:   'none',
                    }}
                    whileDrag={{ scale: 1.25, cursor: 'grabbing' }}
                    onDragStart={() => { isDraggingCursor.current = true; }}
                    onDragEnd={() => {
                        isDraggingCursor.current = false;
                        if (!trackWidth || !onSeek) return;
                        const pct = Math.max(0, Math.min(100, (cursorX.get() / trackWidth) * 100));
                        onSeek(pct);
                    }}
                />

                {/* ── "END" label — pinned to the right terminus of the track,
                    same position the cursor reaches at 100% progress ── */}
                {mode === 'chapters' && segments.length > 0 && (
                    <span style={{
                        position:      'absolute',
                        left:          '100%',
                        top:           -28,
                        transform:     'translateX(-50%)',
                        fontSize:      20,
                        fontWeight:    500,
                        color:         'rgba(255,255,255,1)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        lineHeight:    1.2,
                        fontFamily:    themeFont,
                        pointerEvents: 'none',
                        whiteSpace:    'nowrap',
                    }}>
                        {t('end_label')}
                    </span>
                )}

                {/* ── Chapter dividers ── */}
                {mode === 'chapters' && segments.length > 0 && (
                    <>
                        {segments.slice(0, -1).map((seg, i) => (
                            <div key={`div-${seg.id}`} style={{
                                position:      'absolute',
                                left:          `${starts[i + 1]}%`,
                                top:           3,
                                width:         2,
                                height:        26,
                                background:    'rgba(255,255,255,0.6)',
                                transform:     'translateX(-50%)',
                                pointerEvents: 'none',
                            }} />
                        ))}
                    </>
                )}

                {/* ══ DATES MODE ══════════════════════════════════════════════ */}
                {mode === 'dates' && (
                    <>
                        {ticks.map((tick, i) => (
                            <React.Fragment key={`${tick.label}-${i}`}>
                                {/* Tick mark — below track */}
                                <div style={{
                                    position:      'absolute',
                                    left:          `${tick.percent}%`,
                                    top:           3,
                                    width:         tick.isYear ? 4 : 2,
                                    height:        tick.isYear ? 26 : 20,
                                    background:    tick.isYear
                                        ? 'rgba(255,255,255,1)'
                                        : 'rgba(255,255,255,0.6)',
                                    transform:     'translateX(-50%)',
                                    pointerEvents: 'none',
                                }} />
                                {/* Label — above track, styled to match chapter titles */}
                                <span style={{
                                    position:      'absolute',
                                    left:          `${tick.percent}%`,
                                    top:           tick.isYear ? -28 : -24,
                                    transform:     'translateX(-50%)',
                                    fontSize:      tick.isYear ? 20 : 18,
                                    fontWeight:    500,
                                    color:         tick.isYear
                                        ? 'rgba(255,255,255,1)'
                                        : 'rgba(255,255,255,0.7)',
                                    whiteSpace:    'nowrap',
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    pointerEvents: 'none',
                                    lineHeight:    1,
                                }}>
                                    {tick.label}
                                </span>
                            </React.Fragment>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
