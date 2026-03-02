import React from 'react';
import { Navigation, MapPin, SlidersHorizontal, BookOpen, Library, Pencil, LogIn, LogOut, Plus, Minus, Compass } from 'lucide-react';

/**
 * BottomPillBar
 *
 * Bottom-left control bar — two pills in a single row.
 *
 * Pill 1 — Map controls: zoom in/out, reset north, toggle route, toggle markers, map editor
 * Pill 2 — Global: more stories, library, edit story, sign in/out
 *
 * Appears when the first chapter activates (controlled by parent via isVisible).
 * Hidden when the fullscreen image viewer is open.
 */
export default function BottomPillBar({
    isVisible = true,
    // Map zoom / orientation (bound to mapInstanceRef in parent)
    onZoomIn,
    onZoomOut,
    onResetNorth,
    // Map data toggles
    showRoute = true,
    onToggleRoute,
    showMarkers = true,
    onToggleMarkers,
    onOpenMapEditor,
    // Global
    onViewOtherStories,
    onOpenLibrary,
    onEditStory,
    // Auth (stubbed — wired up when Supabase Auth is implemented)
    user = null,
    onLogin,
    onLogout,
}) {
    if (!isVisible) return null;

    const activeClass = 'bg-amber-100 text-amber-600';
    const idleClass   = 'text-slate-500 hover:bg-black/10 hover:text-slate-800';
    const btnBase     = 'w-10 h-10 rounded-full flex items-center justify-center transition-colors';
    const divider     = <div className="w-px h-5 bg-slate-200 mx-1 flex-shrink-0" />;

    return (
        <div className="fixed bottom-8 left-8 z-[9999] flex items-center gap-3 pointer-events-auto">

            {/* ── Map Controls Pill ── */}
            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-full px-3 py-2 shadow-2xl">
                {/* Zoom */}
                <button onClick={onZoomIn}  className={`${btnBase} ${idleClass}`} title="Zoom in">
                    <Plus className="w-4 h-4" />
                </button>
                <button onClick={onZoomOut} className={`${btnBase} ${idleClass}`} title="Zoom out">
                    <Minus className="w-4 h-4" />
                </button>
                <button onClick={onResetNorth} className={`${btnBase} ${idleClass}`} title="Reset north">
                    <Compass className="w-4 h-4" />
                </button>

                {divider}

                {/* Data toggles */}
                <button
                    onClick={onToggleRoute}
                    className={`${btnBase} ${showRoute ? activeClass : idleClass}`}
                    title="Toggle route"
                >
                    <Navigation className="w-4 h-4" />
                </button>
                <button
                    onClick={onToggleMarkers}
                    className={`${btnBase} ${showMarkers ? activeClass : idleClass}`}
                    title="Toggle markers"
                >
                    <MapPin className="w-4 h-4" />
                </button>

                {onOpenMapEditor && (
                    <button
                        onClick={onOpenMapEditor}
                        className={`${btnBase} ${idleClass}`}
                        title="Map editor"
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* ── Global Pill ── */}
            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-full px-3 py-2 shadow-2xl">
                <button onClick={onViewOtherStories} className={`${btnBase} ${idleClass}`} title="More stories">
                    <BookOpen className="w-4 h-4" />
                </button>
                <button onClick={onOpenLibrary} className={`${btnBase} ${idleClass}`} title="Library">
                    <Library className="w-4 h-4" />
                </button>
                <button onClick={onEditStory} className={`${btnBase} ${idleClass}`} title="Edit story">
                    <Pencil className="w-4 h-4" />
                </button>

                {divider}

                {user ? (
                    <button onClick={onLogout} className={`${btnBase} ${idleClass}`} title="Sign out">
                        <LogOut className="w-4 h-4" />
                    </button>
                ) : (
                    <button onClick={onLogin} className={`${btnBase} ${idleClass}`} title="Sign in">
                        <LogIn className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
