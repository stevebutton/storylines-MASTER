import React from 'react';
import { Navigation, MapPin, SlidersHorizontal, BookOpen, Library, Pencil, LogIn, LogOut } from 'lucide-react';

/**
 * BottomPillBar
 *
 * Persistent bottom-centre control bar — two pills in a single row.
 *
 * Pill 1 — Map controls: toggle route, toggle markers, open map editor
 * Pill 2 — Global: more stories, library, edit story, sign in/out
 *
 * Hidden when the fullscreen image viewer is open (isVisible = false).
 */
export default function BottomPillBar({
    isVisible = true,
    // Map controls
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

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 pointer-events-auto">

            {/* ── Map Controls Pill ── */}
            <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md rounded-full px-2 py-2 shadow-2xl">
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
            <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md rounded-full px-2 py-2 shadow-2xl">
                <button
                    onClick={onViewOtherStories}
                    className={`${btnBase} ${idleClass}`}
                    title="More stories"
                >
                    <BookOpen className="w-4 h-4" />
                </button>

                <button
                    onClick={onOpenLibrary}
                    className={`${btnBase} ${idleClass}`}
                    title="Library"
                >
                    <Library className="w-4 h-4" />
                </button>

                <button
                    onClick={onEditStory}
                    className={`${btnBase} ${idleClass}`}
                    title="Edit story"
                >
                    <Pencil className="w-4 h-4" />
                </button>

                {user ? (
                    <button
                        onClick={onLogout}
                        className={`${btnBase} ${idleClass}`}
                        title="Sign out"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                ) : (
                    <button
                        onClick={onLogin}
                        className={`${btnBase} ${idleClass}`}
                        title="Sign in"
                    >
                        <LogIn className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
