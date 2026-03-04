import React from 'react';
import { Navigation, MapPin, SlidersHorizontal, Plus, Minus, Compass } from 'lucide-react';
import { pillShell, pillBtn, pillBtnActive, pillDivider } from './StoryViewPill';

/**
 * BottomPillBar — Map context sub-pill.
 *
 * Map controls only: zoom ± / reset north / route / markers / map editor.
 * Editorial actions (more stories, library, edit) are in EditorialPill (bottom-right).
 *
 * No positioning — rendered inside StoryViewPill's subPill slot.
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
}) {
    return (
        <div className={pillShell}>
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
    );
}
