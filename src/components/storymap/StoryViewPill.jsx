import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Maximize2, Layers, Library, Clock } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

/**
 * StoryViewPill — Two-row bottom-left navigation stack.
 *
 * Row 1 (nav pill)  — Shows "Story View" label at rest; expands horizontally
 *                     on hover to reveal Map / Story / Timeline / Library choices
 *                     inline. Collapses back on mouse-leave or after a choice.
 * Row 2 (sub-pill)  — Context controls — fades in 1 s after a choice is made,
 *                     stays visible; hovering anywhere re-expands row 1 above it.
 *
 * State: showChoices (hover) + subPillReady (1 s post-selection).
 * Layout: Framer Motion `layout` on the pill animates the width change smoothly.
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

const VIEW_LABELS = { map: 'Map', fullscreen: 'Story', timeline: 'Timeline', library: 'Library' };

export default function StoryViewPill({
    storyId,
    currentView   = 'map',
    isVisible     = false,
    subPill,
    onOpenStory    = null,
    onOpenMap      = null,
    onOpenTimeline = null,
    onOpenLibrary  = null,
}) {
    const [showChoices,  setShowChoices]  = useState(false);
    const [subPillReady, setSubPillReady] = useState(false);
    const timerRef = useRef(null);

    const clearTimer = () => {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };

    // Reset when pill hides
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
            icon:  Map,
            url:   onOpenMap ? null : createPageUrl(`StoryMapView?id=${storyId}`),
            onNav: onOpenMap || null,
        },
        {
            key:   'fullscreen',
            icon:  Maximize2,
            url:   onOpenStory ? null : createPageUrl(`StoryFullscreen?storyId=${storyId}`),
            onNav: onOpenStory || (() => sessionStorage.setItem(`return_scroll_${storyId}`, String(window.scrollY))),
        },
        ...(onOpenTimeline ? [{
            key:   'timeline',
            icon:  Clock,
            url:   null,
            onNav: onOpenTimeline,
        }] : []),
        ...(onOpenLibrary ? [{
            key:   'library',
            icon:  Library,
            url:   null,
            onNav: onOpenLibrary,
        }] : []),
    ];

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 16 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    // Fixed height reserves space for both rows so the pill stays
                    // pinned at the bottom as the sub-pill appears below it.
                    className="fixed left-6 z-[200020] flex flex-col items-start gap-2 pointer-events-auto"
                    style={{ bottom: 40, height: '120px' }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* Row 1 — Expandable pill: label at rest, choices on hover */}
                    <motion.div
                        layout
                        transition={{ layout: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } }}
                        className={pillShell}
                        style={{ overflow: 'hidden' }}
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            {showChoices ? (
                                <motion.div
                                    key="choices"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.12 }}
                                    className="flex items-center"
                                >
                                    {views.map(({ key, icon: Icon, url, onNav }) => {
                                        const label = VIEW_LABELS[key];
                                        const btnClass = cn(
                                            'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 whitespace-nowrap',
                                            currentView === key
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'text-white/70 hover:bg-white/20 hover:text-white'
                                        );
                                        const handleClick = () => {
                                            if (onNav) onNav();
                                            handleViewSelect();
                                        };
                                        return url ? (
                                            <Link key={key} to={url} onClick={handleClick} className={btnClass}>
                                                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                                                {label}
                                            </Link>
                                        ) : (
                                            <button key={key} onClick={handleClick} className={btnClass}>
                                                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                                                {label}
                                            </button>
                                        );
                                    })}
                                </motion.div>
                            ) : (
                                <motion.span
                                    key="label"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.12 }}
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white/80 select-none whitespace-nowrap"
                                >
                                    <Layers className="w-3.5 h-3.5 flex-shrink-0" />
                                    Story View
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Row 2 — Sub-pill (1 s after selection, persists) */}
                    <AnimatePresence>
                        {subPillReady && subPill && (
                            <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
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
