import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Maximize2, Calendar } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

/**
 * StoryViewPill
 *
 * Three-segment bottom pill for switching between the three story views:
 *   Map → StoryMapView (geographic)
 *   Story → StoryFullscreen (immersive reading)
 *   Timeline → StoryTimeline (temporal)
 *
 * Appears after scroll to chapter one (same trigger as banner visibility).
 * The active segment is visually highlighted.
 *
 * Props:
 *   storyId      – the story's UUID (required for URL building)
 *   currentView  – 'map' | 'fullscreen' | 'timeline'
 *   isVisible    – AnimatePresence show/hide flag
 *   bottomClass  – Tailwind bottom-* class (default 'bottom-6');
 *                  pass 'bottom-24' in StoryFullscreen to clear the filmstrip bar
 */
export default function StoryViewPill({
    storyId,
    currentView = 'map',
    isVisible = false,
    bottomClass = 'bottom-6',
}) {
    if (!storyId) return null;

    const views = [
        {
            key: 'map',
            label: 'Map',
            icon: Map,
            url: createPageUrl(`StoryMapView?id=${storyId}`),
            // Save scroll on leaving the map so we can restore on return
            onClick: null,
        },
        {
            key: 'fullscreen',
            label: 'Story',
            icon: Maximize2,
            url: createPageUrl(`StoryFullscreen?storyId=${storyId}`),
            onClick: () => {
                // Preserve scroll position so returning from Fullscreen lands back here
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
                    className={cn(
                        'fixed left-1/2 -translate-x-1/2 z-[100020] pointer-events-auto',
                        bottomClass
                    )}
                >
                    <div className="flex items-center gap-0.5 bg-black/30 backdrop-blur-xl border border-white/20 rounded-full px-1.5 py-1.5 shadow-xl">
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
