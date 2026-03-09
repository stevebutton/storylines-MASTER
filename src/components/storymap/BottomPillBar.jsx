import React from 'react';
import { Navigation, MapPin, SlidersHorizontal, Plus, Minus, Compass, Layers } from 'lucide-react';
import { pillShell, pillBtn, pillBtnActive, pillDivider } from './StoryViewPill';

/**
 * BottomPillBar — Map context sub-pill.
 *
 * Map controls: zoom ± / reset north / route / markers / map editor.
 * When layers are present, a second row shows layer toggle buttons.
 *
 * No positioning — rendered inside the bottom-pill motion.div in StoryMapView.
 */
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
        <div className="flex flex-col w-full h-full">
            {/* Layer toggle row — shown above controls when layers exist */}
            {hasLayers && (
                <div
                    className="flex items-center w-full bg-black/30 backdrop-blur-xl border border-white/20 border-b-0"
                    style={{ height: 36, flexShrink: 0 }}
                >
                    <div className="flex items-center px-3 gap-1 flex-shrink-0">
                        <Layers className="w-3.5 h-3.5 text-white/50" />
                    </div>
                    <div className="flex items-center gap-1.5 px-2 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
                        {pinnedLayers.map(layer => (
                            <button
                                key={layer.id}
                                onClick={() => onToggleLayer?.(layer.id)}
                                className={[
                                    'flex-shrink-0 px-2.5 py-0.5 rounded text-xs font-medium transition-all duration-150 whitespace-nowrap',
                                    layer.visible
                                        ? 'bg-white text-slate-900'
                                        : 'bg-white/15 text-white/60 hover:bg-white/25 hover:text-white',
                                ].join(' ')}
                                title={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
                            >
                                {layer.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Main controls row */}
            <div
                className={pillShell}
                style={{ flex: 1, borderTopLeftRadius: hasLayers ? 0 : undefined, borderTopRightRadius: hasLayers ? 0 : undefined }}
            >
                <button onClick={onZoomIn}     className={pillBtn} title="Zoom in">
                    <Plus className="w-4 h-4" />
                </button>
                <button onClick={onZoomOut}    className={pillBtn} title="Zoom out">
                    <Minus className="w-4 h-4" />
                </button>
                <button onClick={onResetNorth} className={pillBtn} title="Reset north">
                    <Compass className="w-4 h-4" />
                </button>

                {pillDivider}

                <button
                    onClick={onToggleRoute}
                    className={showRoute ? pillBtnActive : pillBtn}
                    title="Toggle route"
                >
                    <Navigation className="w-4 h-4" />
                </button>
                <button
                    onClick={onToggleMarkers}
                    className={showMarkers ? pillBtnActive : pillBtn}
                    title="Toggle markers"
                >
                    <MapPin className="w-4 h-4" />
                </button>

                {onOpenMapEditor && (
                    <>
                        {pillDivider}
                        <button onClick={onOpenMapEditor} className={pillBtn} title="Map editor">
                            <SlidersHorizontal className="w-4 h-4" />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
