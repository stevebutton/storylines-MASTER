import React from 'react';

/**
 * ScaleBar — horizontal navigation axis, shared by Story and Timeline modes.
 *
 * Two modes, one visual language (white track · amber cursor · hanging labels):
 *
 *   'chapters' — proportional segments sized by slide count, dividers at
 *                chapter boundaries, chapter names centred in each segment.
 *
 *   'dates'    — month / year ticks with date labels, matching the existing
 *                Timeline bar style exactly.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Props — both modes:
 *   cursorPercent   number 0–100   amber dot position along the track
 *   mode            'chapters' | 'dates'
 *   height          number         container height in px (default 95)
 *   legend          string         small label above-left of the track
 *
 * Props — chapters mode:
 *   segments   [{ id, label, widthPercent, onClick }]
 *              widthPercent values must sum to 100.
 *              onClick called when the user clicks anywhere in that segment.
 *
 * Props — dates mode:
 *   ticks      [{ percent, label, isYear }]
 *   startLabel string   — label pinned to the left end of the track
 *   endLabel   string   — label pinned to the right end
 */
export default function ScaleBar({
    cursorPercent = 0,
    mode          = 'chapters',
    height        = 95,
    legend        = '',
    // chapters
    segments      = [],
    // dates
    ticks         = [],
    startLabel    = '',
    endLabel      = '',
}) {
    return (
        <div className="relative flex-shrink-0 select-none" style={{ height }}>

            {/* ── Legend — just above the left edge of the track ── */}
            {legend && (
                <span style={{
                    position:      'absolute',
                    left:          48,
                    top:           5,
                    fontSize:      9,
                    fontWeight:    700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color:         'rgba(255,255,255,0.45)',
                    whiteSpace:    'nowrap',
                    pointerEvents: 'none',
                    lineHeight:    1,
                }}>
                    {legend}
                </span>
            )}

            {/* ── Track line ── */}
            <div
                className="absolute"
                style={{
                    left:       48,
                    right:      48,
                    top:        20,
                    height:     2,
                    background: 'rgba(255,255,255,0.6)',
                }}
            >
                {/* ── Amber cursor ── */}
                <div style={{
                    position:     'absolute',
                    left:         `${Math.max(0, Math.min(100, cursorPercent))}%`,
                    top:          -12,
                    width:        16,
                    height:       16,
                    borderRadius: '50%',
                    background:   '#f59e0b',
                    boxShadow:    '0 0 16px rgba(245,158,11,0.85)',
                    transform:    'translateX(-50%)',
                    transition:   'left 0.45s cubic-bezier(0.34, 1.4, 0.64, 1)',
                    zIndex:       2,
                    pointerEvents: 'none',
                }} />

                {/* ══ CHAPTERS MODE ══════════════════════════════════════════ */}
                {mode === 'chapters' && segments.length > 0 && (() => {
                    // Pre-compute cumulative start positions
                    const starts = segments.reduce((acc, seg, i) => {
                        acc.push(i === 0 ? 0 : acc[i - 1] + segments[i - 1].widthPercent);
                        return acc;
                    }, []);

                    return (
                        <>
                            {/* Dividers at inter-chapter boundaries */}
                            {segments.slice(0, -1).map((seg, i) => {
                                const boundaryPct = starts[i + 1];
                                return (
                                    <div key={`div-${seg.id}`} style={{
                                        position:   'absolute',
                                        left:       `${boundaryPct}%`,
                                        top:        2,
                                        width:      1,
                                        height:     22,
                                        background: 'rgba(255,255,255,0.45)',
                                        transform:  'translateX(-50%)',
                                        pointerEvents: 'none',
                                    }} />
                                );
                            })}

                            {/* Chapter labels + click targets */}
                            {segments.map((seg, i) => (
                                <button
                                    key={`lbl-${seg.id}`}
                                    onClick={seg.onClick}
                                    title={seg.label}
                                    style={{
                                        position:      'absolute',
                                        left:          `${starts[i]}%`,
                                        width:         `${seg.widthPercent}%`,
                                        top:           10,
                                        height:        50,
                                        display:       'flex',
                                        alignItems:    'flex-start',
                                        justifyContent:'center',
                                        background:    'none',
                                        border:        'none',
                                        cursor:        'pointer',
                                        padding:       0,
                                        paddingTop:    8,
                                        overflow:      'hidden',
                                        pointerEvents: 'auto',
                                    }}
                                >
                                    <span style={{
                                        fontSize:      13,
                                        fontWeight:    500,
                                        color:         'rgba(255,255,255,0.72)',
                                        whiteSpace:    'nowrap',
                                        letterSpacing: '0.04em',
                                        lineHeight:    1,
                                        overflow:      'hidden',
                                        textOverflow:  'ellipsis',
                                        maxWidth:      '90%',
                                        display:       'block',
                                    }}>
                                        {seg.label}
                                    </span>
                                </button>
                            ))}
                        </>
                    );
                })()}

                {/* ══ DATES MODE ═════════════════════════════════════════════ */}
                {mode === 'dates' && (
                    <>
                        {ticks.map((tick, i) => (
                            <React.Fragment key={`${tick.label}-${i}`}>
                                {/* Tick mark */}
                                <div style={{
                                    position:   'absolute',
                                    left:       `${tick.percent}%`,
                                    top:        2,
                                    width:      tick.isYear ? 3 : 1,
                                    height:     tick.isYear ? 30 : 20,
                                    background: tick.isYear
                                        ? 'rgba(255,255,255,0.9)'
                                        : 'rgba(255,255,255,0.55)',
                                    transform:  'translateX(-50%)',
                                    pointerEvents: 'none',
                                }} />
                                {/* Label */}
                                <span style={{
                                    position:      'absolute',
                                    left:          `${tick.percent}%`,
                                    top:           tick.isYear ? 36 : 26,
                                    transform:     'translateX(-50%)',
                                    fontSize:      tick.isYear ? 26 : 18,
                                    fontWeight:    tick.isYear ? 700 : 400,
                                    color:         tick.isYear
                                        ? 'rgba(255,255,255,1)'
                                        : 'rgba(255,255,255,0.8)',
                                    whiteSpace:    'nowrap',
                                    letterSpacing: tick.isYear ? '0.05em' : '0.02em',
                                    pointerEvents: 'none',
                                    lineHeight:    1,
                                }}>
                                    {tick.label}
                                </span>
                            </React.Fragment>
                        ))}

                        {/* Edge labels */}
                        {startLabel && (
                            <span style={{
                                position:      'absolute',
                                left:          0,
                                top:           26,
                                transform:     'translateX(-50%)',
                                fontSize:      14,
                                color:         'rgba(255,255,255,0.5)',
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
                                top:           26,
                                transform:     'translateX(50%)',
                                fontSize:      14,
                                color:         'rgba(255,255,255,0.5)',
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
