import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

/**
 * StoryViewPill — top-left nav pill, positioned just below the banner.
 *
 * Always-open: "Story View" label + Map | Story | Library buttons.
 * Active view is highlighted. No hover-expand behaviour.
 * Sub-pill (contextual controls) is rendered separately in StoryMapView.
 */

// ── Shared style tokens (imported by all sub-pill components) ────────────────
export const pillShell = [
    'flex items-center',
    'w-full h-full',
    'bg-black/30 backdrop-blur-xl',
    'border border-white/20',
    'shadow-xl',
].join(' ');

export const pillBtn = [
    'flex-1 h-full',
    'flex items-center justify-center',
    'transition-all duration-200',
    'text-white/70 hover:text-white hover:bg-white/15',
    'disabled:opacity-30 disabled:cursor-not-allowed',
].join(' ');

export const pillBtnActive = [
    'flex-1 h-full',
    'flex items-center justify-center',
    'transition-all duration-200',
    'bg-white text-slate-900',
].join(' ');

export const pillDivider = (
    <div className="w-px self-stretch bg-white/20 flex-shrink-0" />
);

// ─────────────────────────────────────────────────────────────────────────────

const VIEW_LABELS = { map: 'Map View', story: 'Story View', library: 'Library View' };

export default function StoryViewPill({
    storyId,
    currentView   = 'map',
    isVisible     = false,
    onOpenStory   = null,
    onOpenMap     = null,
    onOpenLibrary = null,
}) {
    if (!storyId) return null;

    const views = [
        {
            key:   'map',
            url:   onOpenMap ? null : createPageUrl(`StoryMapView?id=${storyId}`),
            onNav: onOpenMap || null,
        },
        {
            key:   'story',
            url:   onOpenStory ? null : createPageUrl(`StoryFullscreen?storyId=${storyId}`),
            onNav: onOpenStory || (() => sessionStorage.setItem(`return_scroll_${storyId}`, String(window.scrollY))),
        },
        ...(onOpenLibrary ? [{
            key:   'library',
            url:   null,
            onNav: onOpenLibrary,
        }] : []),
    ];

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="fixed left-0 z-[200020] pointer-events-auto"
                    style={{ top: 100, width: 380, height: 60 }}
                >
                    <div className={pillShell}>
                        {views.map(({ key, url, onNav }, idx) => {
                            const btnClass = cn(
                                'flex-1 h-full flex items-center justify-center text-sm font-medium transition-all duration-150 whitespace-nowrap',
                                currentView === key
                                    ? 'bg-white text-slate-900'
                                    : 'text-white/70 hover:bg-white/20 hover:text-white'
                            );
                            const handleClick = () => { if (onNav) onNav(); };
                            return (
                                <React.Fragment key={key}>
                                    {idx > 0 && pillDivider}
                                    {url ? (
                                        <Link to={url} onClick={handleClick} className={btnClass}>
                                            {VIEW_LABELS[key]}
                                        </Link>
                                    ) : (
                                        <button onClick={handleClick} className={btnClass}>
                                            {VIEW_LABELS[key]}
                                        </button>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
