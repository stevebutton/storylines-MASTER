import React from 'react';

/**
 * ScaleBar — horizontal navigation axis, shared by Story and Timeline modes.
 *
 *   'chapters' — chapter labels float ABOVE the track (2xl amber Raleway),
 *                dividers at boundaries, amber cursor.
 *
 *   'dates'    — month / year ticks with labels hanging below the track.
 *
 * Track position:
 *   chapters mode: top 44  (leaves 40px above for 2xl labels)
 *   dates mode:    top 20  (labels hang downward, matching old Timeline bar)
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
    const trackTop = mode === 'chapters' ? 44 : 20;

    // Pre-compute cumulative start positions for chapters mode
    const starts = mode === 'chapters' && segments.length > 0
        ? segments.reduce((acc, seg, i) => {
            acc.push(i === 0 ? 0 : acc[i - 1] + segments[i - 1].widthPercent);
            return acc;
        }, [])
        : [];

    return (
        <div className="relative flex-shrink-0 select-none" style={{ height }}>

            {/* ══ CHAPTER LABELS — above track, chapters mode only ════════════
                Rendered as a sibling div matching the track's left/right margins
                so that percentage positions map directly to track positions.     */}
            {mode === 'chapters' && segments.length > 0 && (
                <div style={{
                    position: 'absolute',
                    left:     48,
                    right:    48,
                    top:      0,
                    height:   trackTop - 4,   // fills space from top to just above track
                }}>
                    {segments.map((seg, i) => (
                        <button
                            key={`lbl-${seg.id}`}
                            onClick={seg.onClick}
                            title={seg.label}
                            style={{
                                position:       'absolute',
                                left:           `${starts[i]}%`,
                                width:          `${seg.widthPercent}%`,
                                top:            0,
                                height:         '100%',
                                display:        'flex',
                                alignItems:     'center',
                                justifyContent: 'flex-start',
                                paddingLeft:    4,
                                background:     'none',
                                border:         'none',
                                cursor:         'pointer',
                                overflow:       'hidden',
                                pointerEvents:  'auto',
                            }}
                        >
                            <span style={{
                                display:         '-webkit-box',
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: 'vertical',
                                overflow:        'hidden',
                                fontSize:        24,
                                fontWeight:      300,
                                color:           'rgba(255,255,255,0.88)',
                                letterSpacing:   '0.02em',
                                lineHeight:      1,
                                fontFamily:      'Raleway, sans-serif',
                                maxWidth:        '100%',
                                textAlign:       'left',
                            }}>
                                {seg.label}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* ── Track line ── */}
            <div
                className="absolute"
                style={{
                    left:       48,
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

                {/* ══ CHAPTERS MODE — dividers only (labels are above) ═══════ */}
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

                {/* ══ DATES MODE ═════════════════════════════════════════════ */}
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
