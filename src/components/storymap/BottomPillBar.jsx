import React from 'react';
import { Navigation, MapPin, SlidersHorizontal, BookOpen, Library, Pencil, Plus, Minus, Compass } from 'lucide-react';
import { pillShell, pillBtn, pillBtnActive, pillDivider } from './StoryViewPill';

/**
 * BottomPillBar — Map context sub-pill.
 *
 * Renders two dark frosted-glass pill groups side-by-side:
 *   Pill 1 (Map) — zoom ± / reset north / route / markers / map editor
 *   Pill 2 (Editorial) — other stories / library / edit story
 *
 * No positioning logic — parent (StoryViewPill subPill slot) handles placement.
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
    onViewOtherStories,
    onOpenLibrary,
    onEditStory,
}) {
    return (
        <div className="flex items-center gap-2">

            {/* ── Map Controls ── */}
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

            {/* ── Editorial ── */}
            <div className={pillShell}>
                <button onClick={onViewOtherStories} className={pillBtn} title="More stories">
                    <BookOpen className="w-4 h-4" />
                </button>
                <button onClick={onOpenLibrary}      className={pillBtn} title="Library">
                    <Library className="w-4 h-4" />
                </button>
                <button onClick={onEditStory}        className={pillBtn} title="Edit story">
                    <Pencil className="w-4 h-4" />
                </button>
            </div>

        </div>
    );
}
