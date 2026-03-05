import React, { useEffect, useRef } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';

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

export default function ScaleBar({
    cursorPercent      = 0,
    mode               = 'chapters',
    height             = 95,
    activeChapterIndex = 0,
    // chapters
    segments           = [],
    // dates
    ticks              = [],
    startLabel         = '',
    endLabel           = '',
}) {
    const trackTop = mode === 'chapters' ? 62 : 20;

    // ── Draggable label row (chapters mode) ──────────────────────────────────
    const x         = useMotionValue(0);
    const draggedRef = useRef(false); // suppress click if we actually dragged

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
                        height:        trackTop - 4,
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
                                paddingLeft:    48,
                                paddingRight:   16,
                                height:         '100%',
                                display:        'flex',
                                flexDirection:  'column',
                                justifyContent: 'flex-end',
                                background:     'none',
                                border:         'none',
                                cursor:         'pointer',
                                textAlign:      'left',
                            }}
                        >
                            <div style={{ overflow: 'hidden', maxWidth: '100%' }}>
                                <div style={{
                                    fontSize:      18,
                                    fontWeight:    500,
                                    color:         'rgba(255,255,255,0.7)',
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    lineHeight:    1.2,
                                    whiteSpace:    'nowrap',
                                    overflow:      'hidden',
                                    textOverflow:  'ellipsis',
                                }}>
                                    {`CHAPTER ${String(seg.chapterNum).padStart(2, '0')}:`}
                                </div>
                                <div style={{
                                    fontSize:      20,
                                    fontWeight:    500,
                                    color:         'rgba(255,255,255,1)',
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    lineHeight:    1.2,
                                    whiteSpace:    'nowrap',
                                    overflow:      'hidden',
                                    textOverflow:  'ellipsis',
                                }}>
                                    {seg.label}
                                </div>
                            </div>
                        </button>
                    ))}
                </motion.div>
            )}

            {/* ── Track line — starts at x=380 (right of text panel) ── */}
            <div
                className="absolute"
                style={{
                    left:       mode === 'chapters' ? 380 : 48,
                    right:      48,
                    top:        trackTop,
                    height:     3,
                    background: 'rgba(255,255,255,0.85)',
                }}
            >
                {/* ── Amber cursor ── */}
                <div style={{
                    position:      'absolute',
                    left:          `${Math.max(0, Math.min(100, cursorPercent))}%`,
                    top:           -9,
                    width:         20,
                    height:        20,
                    borderRadius:  '50%',
                    background:    '#f59e0b',
                    boxShadow:     '0 0 20px rgba(245,158,11,0.9)',
                    transform:     'translateX(-50%)',
                    transition:    'left 0.45s cubic-bezier(0.34, 1.4, 0.64, 1)',
                    zIndex:        2,
                    pointerEvents: 'none',
                }} />

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
                                <div style={{
                                    position:      'absolute',
                                    left:          `${tick.percent}%`,
                                    top:           3,
                                    width:         tick.isYear ? 4 : 2,
                                    height:        tick.isYear ? 34 : 26,
                                    background:    tick.isYear
                                        ? 'rgba(255,255,255,1)'
                                        : 'rgba(255,255,255,0.7)',
                                    transform:     'translateX(-50%)',
                                    pointerEvents: 'none',
                                }} />
                                <span style={{
                                    position:      'absolute',
                                    left:          `${tick.percent}%`,
                                    top:           tick.isYear ? 40 : 32,
                                    transform:     'translateX(-50%)',
                                    fontSize:      tick.isYear ? 26 : 18,
                                    fontWeight:    tick.isYear ? 700 : 400,
                                    color:         tick.isYear
                                        ? 'rgba(255,255,255,1)'
                                        : 'rgba(255,255,255,0.9)',
                                    whiteSpace:    'nowrap',
                                    letterSpacing: tick.isYear ? '0.05em' : '0.02em',
                                    pointerEvents: 'none',
                                    lineHeight:    1,
                                }}>
                                    {tick.label}
                                </span>
                            </React.Fragment>
                        ))}

                        {startLabel && (
                            <span style={{
                                position:      'absolute',
                                left:          0,
                                top:           32,
                                transform:     'translateX(-50%)',
                                fontSize:      14,
                                color:         'rgba(255,255,255,0.6)',
                                whiteSpace:    'nowrap',
                                letterSpacing: '0.04em',
                                pointerEvents: 'none',
                            }}>
                                {startLabel}
                            </span>
                        )}
                        {endLabel && (
                            <span style={{
                                position:      'absolute',
                                right:         0,
                                top:           32,
                                transform:     'translateX(50%)',
                                fontSize:      14,
                                color:         'rgba(255,255,255,0.6)',
                                whiteSpace:    'nowrap',
                                letterSpacing: '0.04em',
                                pointerEvents: 'none',
                            }}>
                                {endLabel}
                            </span>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
