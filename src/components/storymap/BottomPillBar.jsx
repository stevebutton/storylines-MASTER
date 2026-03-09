import React from 'react';
import { motion } from 'framer-motion';
import { Navigation, MapPin, SlidersHorizontal, Plus, Minus, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pillShell, pillDivider } from './StoryViewPill';

/**
 * BottomPillBar — Map context sub-pill.
 *
 * Single 80px-tall row. When layers are present the five control buttons
 * shrink to a fixed 44px (icon-only) and each layer button gets an equal
 * share of the remaining width via flex-1, so all buttons always fit.
 * Text truncates with ellipsis when buttons are narrow (5+ layers).
 */

const ctrl = (hasLayers, active) => cn(
    'h-full flex items-center justify-center transition-all duration-200',
    hasLayers ? 'flex-none w-11' : 'flex-1',
    active
        ? 'bg-white text-slate-900'
        : 'text-white/70 hover:text-white hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed'
);

export default function BottomPillBar({
    onZoomIn,
    onZoomOut,
    onResetNorth,
    showRoute   = true,
    onToggleRoute,
    showMarkers = true,
    onToggleMarkers,
    onOpenMapEditor,
    pinnedLayers = [],
    onToggleLayer,
}) {
    const hasLayers = pinnedLayers.length > 0;

    return (
        <div className={pillShell}>

            {/* Map controls */}
            <button onClick={onZoomIn}     className={ctrl(hasLayers, false)} title="Zoom in">
                <Plus className="w-4 h-4" />
            </button>
            <button onClick={onZoomOut}    className={ctrl(hasLayers, false)} title="Zoom out">
                <Minus className="w-4 h-4" />
            </button>
            <button onClick={onResetNorth} className={ctrl(hasLayers, false)} title="Reset north">
                <Compass className="w-4 h-4" />
            </button>

            {pillDivider}

            <button onClick={onToggleRoute}   className={ctrl(hasLayers, showRoute)}   title="Toggle route">
                <Navigation className="w-4 h-4" />
            </button>
            <button onClick={onToggleMarkers} className={ctrl(hasLayers, showMarkers)} title="Toggle markers">
                <MapPin className="w-4 h-4" />
            </button>

            {onOpenMapEditor && (
                <>
                    {pillDivider}
                    <button onClick={onOpenMapEditor} className={ctrl(hasLayers, false)} title="Map editor">
                        <SlidersHorizontal className="w-4 h-4" />
                    </button>
                </>
            )}

            {/* Layer toggles — each button is flex-1 so all N layers always fit */}
            {hasLayers && (
                <>
                    {pillDivider}
                    {pinnedLayers.map((layer, idx) => (
                        <React.Fragment key={layer.id}>
                            {idx > 0 && pillDivider}
                            <motion.button
                                onClick={() => onToggleLayer?.(layer.id)}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                                className={cn(
                                    'flex-none h-full px-3',
                                    'flex flex-col items-center justify-center',
                                    'transition-colors duration-200',
                                    layer.visible
                                        ? 'bg-white text-slate-900'
                                        : 'text-white/70 hover:text-white hover:bg-white/15'
                                )}
                                title={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
                            >
                                <MapPin className="w-3 h-3 flex-shrink-0 mb-0.5" />
                                <span className="text-xs font-medium leading-none whitespace-nowrap">
                                    {layer.name}
                                </span>
                            </motion.button>
                        </React.Fragment>
                    ))}
                </>
            )}
        </div>
    );
}
