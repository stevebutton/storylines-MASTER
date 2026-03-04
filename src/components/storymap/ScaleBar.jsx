import React from 'react';

/**
 * ScaleBar — horizontal navigation axis, shared by Story and Timeline modes.
 *
 * Two modes, one visual language (white track · amber cursor · hanging labels):
 *
 *   'chapters' — proportional segments sized by slide count, dividers at
 *                chapter boundaries, chapter names centred in each segment.
 *
 *   'dates'    — month / year ticks with date labels.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Props — both modes:
 *   cursorPercent   number 0–100   amber dot position along the track
 *   mode            'chapters' | 'dates'
 *   height          number         container height in px (default 95)
 *
 * Props — chapters mode:
 *   segments   [{ id, label, widthPercent, onClick }]
 *
 * Props — dates mode:
 *   ticks      [{ percent, label, isYear }]
 *   startLabel string
 *   endLabel   string
 */
export default function ScaleBar({
    cursorPercent = 0,
    mode          = 'chapters',
    height        = 95,
    // chapters
    segments      = [],
    // dates
    ticks         = [],
    startLabel    = '',
    endLabel      = '',
}) {
    return (
        <div className="relative flex-shrink-0 select-none" style={{ height }}>

            {/* ── Track line ── */}
            <div
                className="absolute"
                style={{
                    left:       48,
                    right:      48,
                    top:        20,
                    height:     3,
                    background: 'rgba(255,255,255,0.85)',
                }}
            >
                {/* ── Amber cursor ── */}
                <div style={{
                    position:     'absolute',
                    left:         `${Math.max(0, Math.min(100, cursorPercent))}%`,
                    top:          -9,
                    width:        20,
                    height:       20,
                    borderRadius: '50%',
                    background:   '#f59e0b',
                    boxShadow:    '0 0 20px rgba(245,158,11,0.9)',
                    transform:    'translateX(-50%)',
                    transition:   'left 0.45s cubic-bezier(0.34, 1.4, 0.64, 1)',
                    zIndex:       2,
                    pointerEvents: 'none',
                }} />

                {/* ══ CHAPTERS MODE ══════════════════════════════════════════ */}
                {mode === 'chapters' && segments.length > 0 && (() => {
                    const starts = segments.reduce((acc, seg, i) => {
                        acc.push(i === 0 ? 0 : acc[i - 1] + segments[i - 1].widthPercent);
                        return acc;
                    }, []);

                    return (
                        <>
                            {/* Dividers at inter-chapter boundaries */}
                            {segments.slice(0, -1).map((seg, i) => (
                                <div key={`div-${seg.id}`} style={{
                                    position:   'absolute',
                                    left:       `${starts[i + 1]}%`,
                                    top:        3,
                                    width:      2,
                                    height:     26,
                                    background: 'rgba(255,255,255,0.6)',
                                    transform:  'translateX(-50%)',
                                    pointerEvents: 'none',
                                }} />
                            ))}

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
                                        paddingTop:    10,
                                        overflow:      'hidden',
                                        pointerEvents: 'auto',
                                    }}
                                >
                                    <span style={{
                                        fontSize:      13,
                                        fontWeight:    500,
                                        color:         'rgba(255,255,255,0.8)',
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
                                    top:        3,
                                    width:      tick.isYear ? 4 : 2,
                                    height:     tick.isYear ? 34 : 26,
                                    background: tick.isYear
                                        ? 'rgba(255,255,255,1)'
                                        : 'rgba(255,255,255,0.7)',
                                    transform:  'translateX(-50%)',
                                    pointerEvents: 'none',
                                }} />
                                {/* Label */}
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

                        {/* Edge labels */}
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
