import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Maximize2, Calendar, Layers } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

/**
 * StoryViewPill — Three-row bottom-left navigation stack.
 *
 * Row 1 (title)   — "Story View" — always visible, hover target
 * Row 2 (choices) — Map / Story / Timeline — slides up on hover, collapses on
 *                   mouse-leave or after a choice is made
 * Row 3 (sub-pill)— context controls — fades in 1 s after a choice is made,
 *                   stays visible; hover still re-opens row 2 above it
 *
 * State: two booleans — showChoices + subPillReady.
 * Layout: flex-col-reverse so title anchors at bottom, rows grow upward.
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

const VIEW_ICONS  = { map: Map, fullscreen: Maximize2, timeline: Calendar };
const VIEW_LABELS = { map: 'Map', fullscreen: 'Story', timeline: 'Timeline' };

export default function StoryViewPill({
    storyId,
    currentView = 'map',
    isVisible   = false,
    subPill,
}) {
    const [showChoices,  setShowChoices]  = useState(false);
    const [subPillReady, setSubPillReady] = useState(false);
    const timerRef = useRef(null);

    const clearTimer = () => {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };

    // Reset when pill hides (story unloads or navigates away)
    useEffect(() => {
        if (!isVisible) {
            clearTimer();
            setShowChoices(false);
            setSubPillReady(false);
        }
    }, [isVisible]); // eslint-disable-line react-hooks/exhaustive-deps

    // Cleanup timer on unmount
    useEffect(() => () => clearTimer(), []);

    const handleMouseEnter = () => setShowChoices(true);
    const handleMouseLeave = () => setShowChoices(false);

    const handleViewSelect = () => {
        clearTimer();
        setShowChoices(false);
        setSubPillReady(false);
        timerRef.current = setTimeout(() => setSubPillReady(true), 1000);
    };

    if (!storyId) return null;

    const views = [
        {
            key:   'map',
            label: 'Map',
            icon:  Map,
            url:   createPageUrl(`StoryMapView?id=${storyId}`),
            onNav: null,
        },
        {
            key:   'fullscreen',
            label: 'Story',
            icon:  Maximize2,
            url:   createPageUrl(`StoryFullscreen?storyId=${storyId}`),
            onNav: () => sessionStorage.setItem(`return_scroll_${storyId}`, String(window.scrollY)),
        },
        {
            key:   'timeline',
            label: 'Timeline',
            icon:  Calendar,
            url:   createPageUrl(`StoryTimeline?storyId=${storyId}`),
            onNav: () => sessionStorage.setItem(`return_scroll_${storyId}`, String(window.scrollY)),
        },
    ];

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 16 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    // flex-col-reverse: title stays at bottom, rows 2 & 3 grow upward
                    className="fixed bottom-6 left-6 z-[100020] flex flex-col-reverse items-start gap-2 pointer-events-auto"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* Row 1 — Title (always visible) */}
                    <div className={pillShell}>
                        <span className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white/80 select-none">
                            <Layers className="w-3.5 h-3.5 flex-shrink-0" />
                            Story View
                        </span>
                    </div>

                    {/* Row 2 — Choices (hover) */}
                    <AnimatePresence>
                        {showChoices && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                                className={pillShell}
                            >
                                {views.map(({ key, label, icon: Icon, url, onNav }) => (
                                    <Link
                                        key={key}
                                        to={url}
                                        onClick={() => {
                                            if (onNav) onNav();
                                            handleViewSelect();
                                        }}
                                        className={cn(
                                            'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150',
                                            currentView === key
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'text-white/70 hover:bg-white/20 hover:text-white'
                                        )}
                                    >
                                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                                        {label}
                                    </Link>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Row 3 — Sub-pill (1 s after selection, persists) */}
                    <AnimatePresence>
                        {subPillReady && subPill && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                            >
                                {subPill}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
