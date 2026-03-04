import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Maximize2, Calendar, Layers } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

/**
 * StoryViewPill — Master navigation pill + optional sub-pill stack.
 *
 * Collapsed (default): small pill showing "Story View" + current-view icon.
 * Hover: smoothly expands via CSS max-width transition to reveal all three
 * segments; the sub-pill slides in below the master.
 * Mouse leave: both contract/hide.
 *
 * CSS max-width transitions are used instead of framer-motion layout
 * animations to avoid layout-recalculation jank on the inner items.
 * The outer entrance/exit (fade + slide) still uses framer-motion.
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

const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';
const DUR  = '0.3s';

const VIEW_ICONS = {
    map:        Map,
    fullscreen: Maximize2,
    timeline:   Calendar,
};

export default function StoryViewPill({
    storyId,
    currentView = 'map',
    isVisible   = false,
    subPill,
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!storyId) return null;

    const ActiveIcon = VIEW_ICONS[currentView] || Layers;

    const views = [
        {
            key:     'map',
            label:   'Map',
            icon:    Map,
            url:     createPageUrl(`StoryMapView?id=${storyId}`),
            onClick: null,
        },
        {
            key:     'fullscreen',
            label:   'Story',
            icon:    Maximize2,
            url:     createPageUrl(`StoryFullscreen?storyId=${storyId}`),
            onClick: () => sessionStorage.setItem(`return_scroll_${storyId}`, String(window.scrollY)),
        },
        {
            key:     'timeline',
            label:   'Timeline',
            icon:    Calendar,
            url:     createPageUrl(`StoryTimeline?storyId=${storyId}`),
            onClick: () => sessionStorage.setItem(`return_scroll_${storyId}`, String(window.scrollY)),
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
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100020] flex flex-col items-center gap-2 pointer-events-none"
                    onMouseEnter={() => setIsExpanded(true)}
                    onMouseLeave={() => setIsExpanded(false)}
                >

                    {/* ── Master pill ── */}
                    <div className={cn(pillShell, 'pointer-events-auto overflow-hidden')}>

                        {/* Collapsed label — "Story View" */}
                        <div style={{
                            maxWidth:   isExpanded ? 0 : '180px',
                            opacity:    isExpanded ? 0 : 1,
                            overflow:   'hidden',
                            transition: `max-width ${DUR} ${EASE}, opacity 0.15s ease`,
                            whiteSpace: 'nowrap',
                        }}>
                            <span className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white/70 select-none cursor-default">
                                <ActiveIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                Story View
                            </span>
                        </div>

                        {/* Expanded segments — Map / Story / Timeline */}
                        {views.map(({ key, label, icon: Icon, url, onClick }) => {
                            const isActive = currentView === key;
                            return (
                                <div
                                    key={key}
                                    style={{
                                        maxWidth:   isExpanded ? '200px' : 0,
                                        opacity:    isExpanded ? 1 : 0,
                                        overflow:   'hidden',
                                        transition: `max-width ${DUR} ${EASE}, opacity 0.2s ease`,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    <Link
                                        to={url}
                                        onClick={onClick}
                                        className={cn(
                                            'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-150',
                                            isActive
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'text-white/70 hover:text-white hover:bg-white/15'
                                        )}
                                    >
                                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                                        {label}
                                    </Link>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Sub-pill — slides in below master when expanded ── */}
                    <AnimatePresence>
                        {subPill && isExpanded && (
                            <motion.div
                                key="sub-pill"
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                                className="pointer-events-auto"
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
