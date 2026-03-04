import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import FullScreenImageViewer from '@/components/storymap/FullScreenImageViewer';
import StoryViewPill from '@/components/storymap/StoryViewPill';
import { Loader2 } from 'lucide-react';

/**
 * StoryFullscreen
 *
 * Standalone immersive story-reading route using FullScreenImageViewer as its
 * full-page shell.  All slides from every chapter are flattened into a single
 * sequence so the reader can navigate the whole story without leaving the view.
 *
 * URL params:
 *   storyId   – the story UUID  (required)
 *   chapterId – chapter to start at (optional; falls back to first chapter)
 *   slideId   – slide to start at within that chapter (optional; falls back to 0)
 *
 * On close (Escape, close button, or StoryViewPill → Map) the user is returned
 * to StoryMapView with the same scroll position they left from, if stored in
 * sessionStorage under "return_scroll_${storyId}".
 */
export default function StoryFullscreen() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const storyId   = searchParams.get('storyId');
    const chapterId = searchParams.get('chapterId');
    const slideId   = searchParams.get('slideId');

    const [story,        setStory]        = useState(null);
    const [slides,       setSlides]       = useState([]);   // flattened with chapter_name
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading,      setLoading]      = useState(true);
    const [mapStyle,     setMapStyle]     = useState('a');

    // ── Load ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!storyId) return;
        const load = async () => {
            setLoading(true);
            try {
                const [{ data: storyData }, { data: chapters }] = await Promise.all([
                    supabase.from('stories').select('*').eq('id', storyId).single(),
                    supabase.from('chapters')
                        .select('id, name, "order", slides(*)')
                        .eq('story_id', storyId)
                        .order('"order"'),
                ]);

                if (storyData) {
                    setStory(storyData);
                    setMapStyle(storyData.map_style || 'a');
                }

                // Flatten all slides, preserving chapter info
                const allSlides = (chapters || []).flatMap((ch, chIdx) =>
                    (ch.slides || [])
                        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                        .map(sl => ({
                            ...sl,
                            chapter_name: ch.name
                                ? `Chapter ${String(chIdx + 1).padStart(2, '0')}: ${ch.name}`
                                : `Chapter ${String(chIdx + 1).padStart(2, '0')}`,
                            _chapter_id: ch.id,
                        }))
                );
                setSlides(allSlides);

                // Find starting index
                let startIdx = 0;
                if (chapterId || slideId) {
                    const idx = allSlides.findIndex(sl =>
                        (chapterId ? sl._chapter_id === chapterId : true) &&
                        (slideId   ? sl.id         === slideId   : true)
                    );
                    if (idx !== -1) startIdx = idx;
                }
                setCurrentIndex(startIdx);
            } catch (e) {
                console.error('StoryFullscreen load error:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [storyId]);

    // ── Close handler — return to map, restore scroll ──────────────────────
    const handleClose = () => {
        if (storyId) {
            navigate(`/StoryMapView?id=${storyId}`);
        } else {
            navigate(-1);
        }
    };

    // ── Loading / empty states ─────────────────────────────────────────────
    if (loading) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
            </div>
        );
    }

    if (!slides.length) {
        return (
            <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center gap-4 text-white">
                <p className="text-slate-400">No slides found in this story.</p>
                <button onClick={handleClose} className="text-amber-400 hover:text-amber-300 text-sm underline mt-2">
                    ← Back to Map
                </button>
            </div>
        );
    }

    const currentChapterName = slides[currentIndex]?.chapter_name || '';

    return (
        <>
            {/* FullScreenImageViewer in always-open page mode */}
            <FullScreenImageViewer
                isOpen={true}
                onClose={handleClose}
                slides={slides}
                currentIndex={currentIndex}
                onNavigate={setCurrentIndex}
                chapterName={currentChapterName}
                mapStyle={mapStyle}
            />

            {/* Story View Pill — above the filmstrip bar */}
            <StoryViewPill
                storyId={storyId}
                currentView="fullscreen"
                isVisible={true}
                bottomClass="bottom-24"
            />
        </>
    );
}
