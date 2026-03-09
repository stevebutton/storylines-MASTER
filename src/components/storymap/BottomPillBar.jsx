import React from 'react';
import { Navigation, MapPin, SlidersHorizontal, Plus, Minus, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pillShell, pillBtn, pillBtnActive, pillDivider } from './StoryViewPill';

/**
 * BottomPillBar — Map context sub-pill.
 *
 * Single row: zoom ± / reset north / route / markers / map editor,
 * then a divider and layer-toggle buttons when layers are present.
 * Layer buttons match the pill button style — icon + label, full height.
 *
 * No positioning — rendered inside the bottom-pill motion.div in StoryMapView.
 */

// Control buttons are narrower when sharing the row with layer labels
const ctrlBtn = (hasLayers, active) => cn(
    'h-full flex items-center justify-center transition-all duration-200 flex-shrink-0',
    hasLayers ? 'w-11' : 'flex-1',
    active
        ? 'bg-white text-slate-900'
        : 'text-white/70 hover:text-white hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed'
);

export default function BottomPillBar({
    onZoomIn,
    onZoomOut,
    onResetNorth,
    showRoute = true,
    onToggleRoute,
    showMarkers = true,
    onToggleMarkers,
    onOpenMapEditor,
    pinnedLayers = [],
    onToggleLayer,
}) {
    const hasLayers = pinnedLayers.length > 0;

    return (
        <div className={cn(pillShell, 'overflow-x-auto')} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

            {/* Map controls */}
            <button onClick={onZoomIn}     className={ctrlBtn(hasLayers, false)} title="Zoom in">
                <Plus className="w-4 h-4" />
            </button>
            <button onClick={onZoomOut}    className={ctrlBtn(hasLayers, false)} title="Zoom out">
                <Minus className="w-4 h-4" />
            </button>
            <button onClick={onResetNorth} className={ctrlBtn(hasLayers, false)} title="Reset north">
                <Compass className="w-4 h-4" />
            </button>

            {pillDivider}

            <button onClick={onToggleRoute}   className={ctrlBtn(hasLayers, showRoute)}   title="Toggle route">
                <Navigation className="w-4 h-4" />
            </button>
            <button onClick={onToggleMarkers} className={ctrlBtn(hasLayers, showMarkers)} title="Toggle markers">
                <MapPin className="w-4 h-4" />
            </button>

            {onOpenMapEditor && (
                <>
                    {pillDivider}
                    <button onClick={onOpenMapEditor} className={ctrlBtn(hasLayers, false)} title="Map editor">
                        <SlidersHorizontal className="w-4 h-4" />
                    </button>
                </>
            )}

            {/* Layer toggle buttons */}
            {hasLayers && (
                <>
                    {pillDivider}
                    {pinnedLayers.map((layer, idx) => (
                        <React.Fragment key={layer.id}>
                            {idx > 0 && pillDivider}
                            <button
                                onClick={() => onToggleLayer?.(layer.id)}
                                className={cn(
                                    'h-full flex-shrink-0 flex items-center justify-center gap-1.5 px-3',
                                    'text-sm font-medium whitespace-nowrap transition-all duration-200',
                                    layer.visible
                                        ? 'bg-white text-slate-900'
                                        : 'text-white/70 hover:text-white hover:bg-white/15'
                                )}
                                title={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
                            >
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                {layer.name}
                            </button>
                        </React.Fragment>
                    ))}
                </>
            )}
        </div>
    );
}
