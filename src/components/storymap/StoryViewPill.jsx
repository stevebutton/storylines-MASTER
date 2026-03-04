import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Maximize2, Calendar, Layers } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

/**
 * StoryViewPill — Master navigation pill + optional sub-pill stack.
 *
 * Behaviour:
 *   ENTERING  – arrives expanded showing all 3 choices (entrance orientation)
 *   SETTLING  – collapses after 1.5 s to current-view label only
 *   ACTIVE    – sub-pill fades in 500 ms after collapse (stable idle)
 *   HOVERED   – expands again on mouse-enter; sub-pill stays visible
 *
 * The sub-pill is always rendered in the DOM (opacity-controlled) so the
 * master pill never jumps position when the sub-pill appears/disappears.
 *
 * Inner expand/collapse uses CSS max-width transitions — no framer-motion
 * layout recalculations, no jank.
 */

// ── Shared style tokens (imported by all sub-pill components) ────────────────
export const pillShell = [
    'flex items-center gap-0.5',
    'bg-black/30 backdrop-blur-xl',
    'border border-white/20',
    'rounded-full px-1.5 py-1.5',
    'shadow-xl',
].join(' ');

export const pillBtn = [
    'w-10 h-10 rounded-full',
    'flex items-center justify-center',
    'transition-all duration-200',
    'text-white/70 hover:text-white hover:bg-white/15',
    'disabled:opacity-30 disabled:cursor-not-allowed',
].join(' ');

export const pillBtnActive = [
    'w-10 h-10 rounded-full',
    'flex items-center justify-center',
    'transition-all duration-200',
    'bg-white text-slate-900 shadow-sm',
].join(' ');

export const pillDivider = (
    <div className="w-px h-5 bg-white/20 mx-0.5 flex-shrink-0" />
);

// ─────────────────────────────────────────────────────────────────────────────

const CSS_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';
const CSS_DUR  = '0.3s';

const PHASE = {
    ENTERING: 'entering', // expanded — all 3 choices visible, no sub-pill
    SETTLING: 'settling', // collapsing — transitioning to current-view label
    ACTIVE:   'active',   // stable idle — current-view label + sub-pill visible
    HOVERED:  'hovered',  // user hovering — expanded + sub-pill visible
};

const VIEW_ICONS  = { map: Map, fullscreen: Maximize2, timeline: Calendar };
const VIEW_LABELS = { map: 'Map', fullscreen: 'Story', timeline: 'Timeline' };

export default function StoryViewPill({
    storyId,
    currentView = 'map',
    isVisible   = false,
    subPill,
}) {
    const [phase, setPhase] = useState(PHASE.ENTERING);
    const timersRef = useRef([]);

    const clearTimers = () => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
    };

    // Entrance sequence — runs each time the pill becomes visible
    useEffect(() => {
        if (!isVisible) {
            clearTimers();
            setPhase(PHASE.ENTERING);
            return;
        }
        setPhase(PHASE.ENTERING);
        timersRef.current = [
            // 1.5 s: collapse to current-view label
            setTimeout(() => {
                setPhase(p => p === PHASE.HOVERED ? p : PHASE.SETTLING);
            }, 1500),
            // 2.0 s: sub-pill fades in (500 ms after collapse starts)
            setTimeout(() => {
                setPhase(p => p === PHASE.HOVERED ? p : PHASE.ACTIVE);
            }, 2000),
        ];
        return clearTimers;
    }, [isVisible]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleMouseEnter = () => {
        clearTimers();
        setPhase(PHASE.HOVERED);
    };

    const handleMouseLeave = () => {
        setPhase(PHASE.ACTIVE);
    };

    if (!storyId) return null;

    const isExpanded   = phase === PHASE.ENTERING || phase === PHASE.HOVERED;
    const subPillReady = phase === PHASE.ACTIVE    || phase === PHASE.HOVERED;

    const ActiveIcon  = VIEW_ICONS[currentView]  || Layers;
    const activeLabel = VIEW_LABELS[currentView] || 'Story View';

    const views = [
        {
            key:     'map',
            label:   'Map',
            icon:    Map,
            url:     createPageUrl(`StoryMapView?id=${storyId}`),
            onNav:   null,
        },
        {
            key:     'fullscreen',
            label:   'Story',
            icon:    Maximize2,
            url:     createPageUrl(`StoryFullscreen?storyId=${storyId}`),
            onNav:   () => sessionStorage.setItem(`return_scroll_${storyId}`, String(window.scrollY)),
        },
        {
            key:     'timeline',
            label:   'Timeline',
            icon:    Calendar,
            url:     createPageUrl(`StoryTimeline?storyId=${storyId}`),
            onNav:   () => sessionStorage.setItem(`return_scroll_${storyId}`, String(window.scrollY)),
        },
    ];

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 24 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    // pointer-events-auto on the container so onMouseEnter/Leave
                    // fire correctly across the gap between master and sub-pill
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100020] flex flex-col items-center gap-2 pointer-events-auto"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* ── Master pill ── */}
                    <div className={cn(pillShell, 'overflow-hidden')}>

                        {/* Collapsed: current-view label */}
                        <div style={{
                            maxWidth:   isExpanded ? 0 : '160px',
                            opacity:    isExpanded ? 0 : 1,
                            overflow:   'hidden',
                            transition: `max-width ${CSS_DUR} ${CSS_EASE}, opacity 0.15s ease`,
                            whiteSpace: 'nowrap',
                        }}>
                            <span className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white/80 select-none cursor-default">
                                <ActiveIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                {activeLabel}
                            </span>
                        </div>

                        {/* Expanded: all three choices */}
                        {views.map(({ key, label, icon: Icon, url, onNav }) => {
                            const isActive = currentView === key;
                            return (
                                <div
                                    key={key}
                                    style={{
                                        maxWidth:   isExpanded ? '200px' : 0,
                                        opacity:    isExpanded ? 1 : 0,
                                        overflow:   'hidden',
                                        transition: `max-width ${CSS_DUR} ${CSS_EASE}, opacity 0.2s ease`,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    <Link
                                        to={url}
                                        onClick={() => {
                                            if (onNav) onNav();
                                            // Collapse immediately on selection;
                                            // entrance animation plays on the destination page
                                            clearTimers();
                                            setPhase(PHASE.ACTIVE);
                                        }}
                                        className={cn(
                                            'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150',
                                            isActive
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'text-white/70 hover:bg-white/20 hover:text-white'
                                        )}
                                    >
                                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                                        {label}
                                    </Link>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Sub-pill ──
                        Always rendered when subPill is provided so the master pill
                        position never changes when the sub-pill appears/disappears.
                        Visibility is controlled via opacity + pointer-events only. */}
                    {subPill && (
                        <div style={{
                            opacity:       subPillReady ? 1 : 0,
                            pointerEvents: subPillReady ? 'auto' : 'none',
                            transform:     subPillReady ? 'translateY(0)' : 'translateY(-4px)',
                            transition:    'opacity 0.25s ease, transform 0.25s ease',
                        }}>
                            {subPill}
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
