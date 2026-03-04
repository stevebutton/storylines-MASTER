import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Maximize2, Calendar, Layers } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

/**
 * StoryViewPill — Master navigation pill + optional sub-pill stack.
 *
 * Collapsed (default): compact pill showing "Story View" label.
 * Hover: smoothly expands to reveal Map / Story / Timeline segments.
 * Mouse leave: contracts back to collapsed state.
 *
 * The optional `subPill` node renders below the master (context controls).
 *
 * Shared style tokens are exported so all sub-pills in the app use the
 * same dark frosted-glass visual language.
 */

// ── Shared style tokens ──────────────────────────────────────────────────────
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

const VIEW_ICONS = {
    map: Map,
    fullscreen: Maximize2,
    timeline: Calendar,
};

export default function StoryViewPill({
    storyId,
    currentView = 'map',
    isVisible = false,
    subPill,
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!storyId) return null;

    const views = [
        {
            key: 'map',
            label: 'Map',
            icon: Map,
            url: createPageUrl(`StoryMapView?id=${storyId}`),
            onClick: null,
        },
        {
            key: 'fullscreen',
            label: 'Story',
            icon: Maximize2,
            url: createPageUrl(`StoryFullscreen?storyId=${storyId}`),
            onClick: () => sessionStorage.setItem(`return_scroll_${storyId}`, String(window.scrollY)),
        },
        {
            key: 'timeline',
            label: 'Timeline',
            icon: Calendar,
            url: createPageUrl(`StoryTimeline?storyId=${storyId}`),
            onClick: () => sessionStorage.setItem(`return_scroll_${storyId}`, String(window.scrollY)),
        },
    ];

    const ActiveIcon = VIEW_ICONS[currentView] || Layers;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 24 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100020] flex flex-col items-center gap-2 pointer-events-none"
                >
                    {/* ── Master pill — hover to expand ── */}
                    <motion.div
                        layout
                        transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
                        className={cn(pillShell, 'pointer-events-auto')}
                        style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                        onMouseEnter={() => setIsExpanded(true)}
                        onMouseLeave={() => setIsExpanded(false)}
                    >
                        <AnimatePresence mode="popLayout" initial={false}>
                            {!isExpanded ? (
                                /* Collapsed: "Story View" label */
                                <motion.span
                                    key="collapsed"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white/70 select-none cursor-default"
                                >
                                    <ActiveIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                    Story View
                                </motion.span>
                            ) : (
                                /* Expanded: three segments */
                                views.map(({ key, label, icon: Icon, url, onClick }) => {
                                    const isActive = currentView === key;
                                    return (
                                        <motion.div
                                            key={key}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            <Link
                                                to={url}
                                                onClick={onClick}
                                                className={cn(
                                                    'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                                                    isActive
                                                        ? 'bg-white text-slate-900 shadow-sm'
                                                        : 'text-white/70 hover:text-white hover:bg-white/15'
                                                )}
                                            >
                                                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                                                {label}
                                            </Link>
                                        </motion.div>
                                    );
                                })
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Sub-pill — context controls, always shown below master */}
                    {subPill && (
                        <div className="pointer-events-auto">
                            {subPill}
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
