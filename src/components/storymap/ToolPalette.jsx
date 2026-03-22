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
    bottom = 78,       // px from bottom of viewport
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
                    className="fixed right-6 z-[200025] pointer-events-auto"
                    style={{ bottom }}
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0,  scale: 1    }}
                    exit={   { opacity: 0, y: 6,  scale: 0.96 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                >
                    <div className="bg-black/50 backdrop-blur-xl border border-white/20 shadow-2xl rounded-xl overflow-hidden min-w-[200px]">
                        {tools.map(({ icon: Icon, label, onClick, enabled, hint }, idx) => (
                            <button
                                key={label}
                                onClick={() => { if (enabled) { onClick(); onClose(); } }}
                                disabled={!enabled}
                                title={hint || label}
                                className={[
                                    'flex items-center gap-3 w-full px-4 py-3 text-sm text-left whitespace-nowrap',
                                    'transition-colors duration-150',
                                    idx > 0 ? 'border-t border-white/10' : '',
                                    enabled
                                        ? 'text-white/80 hover:text-white hover:bg-white/10 cursor-pointer'
                                        : 'text-white/25 cursor-not-allowed',
                                ].join(' ')}
                            >
                                <Icon className="w-4 h-4 flex-shrink-0" />
                                <span>{label}</span>
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
