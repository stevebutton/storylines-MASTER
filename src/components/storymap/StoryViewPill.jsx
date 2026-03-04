import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Maximize2, Calendar } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

/**
 * StoryViewPill — Master navigation pill + optional sub-pill stack.
 *
 * Fixed bottom-center anchor. The master row (Map / Story / Timeline) is always
 * at the bottom; an optional `subPill` node renders directly above it with an
 * 8px gap, growing the stack upward.
 *
 * All child pills should use the shared `pillShell` and `pillBtn` helpers
 * exported below so every pill in the app shares the same dark frosted glass
 * style.
 *
 * Props:
 *   storyId     – story UUID (required)
 *   currentView – 'map' | 'fullscreen' | 'timeline'
 *   isVisible   – show/hide flag (AnimatePresence)
 *   subPill     – ReactNode rendered above master; context-specific controls
 */

// ── Shared style tokens — import these in sub-pill components ───────────────
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

export default function StoryViewPill({
    storyId,
    currentView = 'map',
    isVisible = false,
    subPill,
}) {
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
            onClick: () => {
                sessionStorage.setItem(`return_scroll_${storyId}`, String(window.scrollY));
            },
        },
        {
            key: 'timeline',
            label: 'Timeline',
            icon: Calendar,
            url: createPageUrl(`StoryTimeline?storyId=${storyId}`),
            onClick: () => {
                sessionStorage.setItem(`return_scroll_${storyId}`, String(window.scrollY));
            },
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
                >
                    {/* Sub-pill — context controls, renders above master */}
                    {subPill && (
                        <div className="pointer-events-auto">
                            {subPill}
                        </div>
                    )}

                    {/* Master navigation pill */}
                    <div className={cn(pillShell, 'pointer-events-auto')}>
                        {views.map(({ key, label, icon: Icon, url, onClick }) => {
                            const isActive = currentView === key;
                            return (
                                <Link
                                    key={key}
                                    to={url}
                                    onClick={onClick}
                                    className={cn(
                                        'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                                        isActive
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-white/70 hover:text-white hover:bg-white/15'
                                    )}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {label}
                                </Link>
                            );
                        })}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
