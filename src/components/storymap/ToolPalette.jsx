import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, Move, MessageSquarePlus } from 'lucide-react';

/**
 * ToolPalette — context-aware editing tool menu anchored above the user pill.
 *
 * Map view:   Map Editor · Adjust Image Position
 * Story view: Add / Edit Tooltip
 */
export default function ToolPalette({
    isOpen,
    onClose,
    view,              // 'map' | 'story'
    hasActiveSlide,    // enables image position tool (map view)
    onOpenMapEditor,
    onOpenImagePosition,
    onAddTooltip,
    top = 160,         // px from top — flush below StoryViewPill (top:100 + height:60)
}) {
    const ref = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen, onClose]);

    const tools = view === 'map'
        ? [
            {
                icon: SlidersHorizontal,
                label: 'Map Editor',
                onClick: onOpenMapEditor,
                enabled: true,
                keepOpen: true,   // palette stays visible while editor is open
            },
            {
                icon: Move,
                label: 'Adjust Image Position',
                onClick: onOpenImagePosition,
                enabled: !!hasActiveSlide,
                hint: hasActiveSlide ? null : 'Scroll to a slide first',
            },
        ]
        : [
            {
                icon: MessageSquarePlus,
                label: 'Add / Edit Tooltip',
                onClick: onAddTooltip,
                enabled: true,
            },
        ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={ref}
                    className="fixed left-0 z-[200025] pointer-events-auto"
                    style={{ top, width: 380 }}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0  }}
                    exit={   { opacity: 0, y: -6 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                >
                    <div className="flex items-stretch bg-black/30 backdrop-blur-xl border border-white/20 overflow-hidden" style={{ width: 380, height: 60 }}>
                        {tools.map(({ icon: Icon, label, onClick, enabled, hint, keepOpen }, idx) => (
                            <React.Fragment key={label}>
                                {idx > 0 && <div className="w-px self-stretch bg-white/20 flex-shrink-0" />}
                                <button
                                    onClick={() => { if (enabled) { onClick(); if (!keepOpen) onClose(); } }}
                                    disabled={!enabled}
                                    title={hint || label}
                                    className={[
                                        'flex-1 h-full flex items-center justify-center gap-2 text-sm whitespace-nowrap',
                                        'transition-colors duration-150',
                                        enabled
                                            ? 'text-white/70 hover:text-white hover:bg-white/15 cursor-pointer'
                                            : 'text-white/25 cursor-not-allowed',
                                    ].join(' ')}
                                >
                                    <Icon className="w-4 h-4 flex-shrink-0" />
                                    <span>{label}</span>
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
