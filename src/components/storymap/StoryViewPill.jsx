import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Maximize2, Library } from 'lucide-react';
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
            icon:  Map,
            url:   onOpenMap ? null : createPageUrl(`StoryMapView?id=${storyId}`),
            onNav: onOpenMap || null,
        },
        {
            key:   'story',
            icon:  Maximize2,
            url:   onOpenStory ? null : createPageUrl(`StoryFullscreen?storyId=${storyId}`),
            onNav: onOpenStory || (() => sessionStorage.setItem(`return_scroll_${storyId}`, String(window.scrollY))),
        },
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
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="fixed left-6 z-[200020] pointer-events-auto"
                    style={{ top: 108 }}
                >
                    <div className={pillShell}>
                        {views.map(({ key, icon: Icon, url, onNav }) => {
                            const btnClass = cn(
                                'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 whitespace-nowrap',
                                currentView === key
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-white/70 hover:bg-white/20 hover:text-white'
                            );
                            const handleClick = () => { if (onNav) onNav(); };
                            return url ? (
                                <Link key={key} to={url} onClick={handleClick} className={btnClass}>
                                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                                    {VIEW_LABELS[key]}
                                </Link>
                            ) : (
                                <button key={key} onClick={handleClick} className={btnClass}>
                                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                                    {VIEW_LABELS[key]}
                                </button>
                            );
                        })}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
