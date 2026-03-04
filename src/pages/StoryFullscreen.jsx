import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import FullScreenImageViewer from '@/components/storymap/FullScreenImageViewer';
import StoryViewPill from '@/components/storymap/StoryViewPill';
import FullscreenNavPill from '@/components/storymap/FullscreenNavPill';
import StoryMapBanner from '@/components/storymap/StoryMapBanner';
import ScaleBar from '@/components/storymap/ScaleBar';
import { Loader2 } from 'lucide-react';

/**
 * StoryFullscreen
 *
 * Immersive story-reading route with three modes:
 *   'picture'  — pure photo, no text overlay, no scale bar
 *   'story'    — photo + text carousel + chapter scale bar
 *   'timeline' — photo + text carousel + date scale bar (slides re-ordered by story_date)
 *
 * URL params:
 *   storyId   – story UUID  (required)
 *   chapterId – chapter to start at (optional)
 *   slideId   – slide to start at (optional)
 */
export default function StoryFullscreen() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const storyId   = searchParams.get('storyId');
    const chapterId = searchParams.get('chapterId');
    const slideId   = searchParams.get('slideId');

    const [story,        setStory]        = useState(null);
    const [slides,       setSlides]       = useState([]);   // chapter-ordered
    const [chapters,     setChapters]     = useState([]);   // [{id, name, slideCount}]
    const [currentIndex, setCurrentIndex] = useState(0);
    const [mode,         setMode]         = useState('story'); // 'picture' | 'story' | 'timeline'
    const [loading,      setLoading]      = useState(true);
    const [mapStyle,     setMapStyle]     = useState('a');

    // ── Load ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!storyId) return;
        const load = async () => {
            setLoading(true);
            try {
                const [{ data: storyData }, { data: chapterData }] = await Promise.all([
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

                const allSlides = (chapterData || []).flatMap((ch, chIdx) =>
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

                setChapters((chapterData || []).map(ch => ({
                    id: ch.id,
                    name: ch.name || '',
                    slideCount: ch.slides?.length || 0,
                })));

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

    // ── Derived: timeline slide order ─────────────────────────────────────────
    // Re-sort by story_date → capture_date → original order
    const timelineSlides = useMemo(() => {
        const dated = slides.filter(sl => sl.story_date || sl.capture_date);
        if (dated.length < 2) return slides;
        return [...slides].sort((a, b) => {
            const da = a.story_date || a.capture_date;
            const db = b.story_date || b.capture_date;
            if (da && db) return new Date(da) - new Date(db);
            if (da) return -1;
            if (db) return  1;
            return 0;
        });
    }, [slides]);

    const activeSlides = mode === 'timeline' ? timelineSlides : slides;

    // ── ScaleBar: chapter segments (story mode) ───────────────────────────────
    const scaleSegments = useMemo(() => {
        const total = slides.length;
        if (!total || !chapters.length) return [];
        let running = 0;
        return chapters
            .filter(ch => ch.slideCount > 0)
            .map((ch, i) => {
                const startIdx = running;
                const widthPercent = (ch.slideCount / total) * 100;
                running += ch.slideCount;
                return {
                    id: ch.id,
                    label: ch.name || `Ch ${i + 1}`,
                    widthPercent,
                    onClick: () => setCurrentIndex(startIdx),
                };
            });
    }, [chapters, slides.length]);

    // ── ScaleBar: date ticks (timeline mode) ──────────────────────────────────
    const { scaleTicks, scaleStartLabel, scaleEndLabel } = useMemo(() => {
        if (!timelineSlides.length) return { scaleTicks: [], scaleStartLabel: '', scaleEndLabel: '' };

        const times = timelineSlides
            .map(sl => sl.story_date || sl.capture_date)
            .filter(Boolean)
            .map(d => new Date(d).getTime())
            .filter(t => !isNaN(t));

        if (times.length < 2) return { scaleTicks: [], scaleStartLabel: '', scaleEndLabel: '' };

        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const range   = maxTime - minTime;

        // Month ticks between min and max dates
        const ticks = [];
        const cur = new Date(minTime);
        cur.setDate(1);
        cur.setHours(0, 0, 0, 0);
        const endDate = new Date(maxTime);

        while (cur <= endDate) {
            const pct = ((cur.getTime() - minTime) / range) * 100;
            if (pct >= 0 && pct <= 100) {
                const isYear = cur.getMonth() === 0;
                ticks.push({
                    percent: pct,
                    label:   isYear
                        ? cur.getFullYear().toString()
                        : cur.toLocaleString('default', { month: 'short' }),
                    isYear,
                });
            }
            cur.setMonth(cur.getMonth() + 1);
        }

        const fmt = d => new Date(d).toLocaleString('default', { month: 'short', year: 'numeric' });
        return {
            scaleTicks:      ticks,
            scaleStartLabel: fmt(minTime),
            scaleEndLabel:   fmt(maxTime),
        };
    }, [timelineSlides]);

    // ── ScaleBar cursor position ───────────────────────────────────────────────
    const cursorPercent = useMemo(() => {
        if (!activeSlides.length) return 0;

        if (mode === 'timeline') {
            const currentSlide = activeSlides[currentIndex];
            const times = timelineSlides
                .map(sl => sl.story_date || sl.capture_date)
                .filter(Boolean)
                .map(d => new Date(d).getTime())
                .filter(t => !isNaN(t));

            if (times.length < 2) {
                return activeSlides.length > 1 ? (currentIndex / (activeSlides.length - 1)) * 100 : 0;
            }
            const minTime = Math.min(...times);
            const maxTime = Math.max(...times);
            const slDate  = currentSlide?.story_date || currentSlide?.capture_date;
            if (!slDate) return 50;
            const t = new Date(slDate).getTime();
            return Math.max(0, Math.min(100, ((t - minTime) / (maxTime - minTime)) * 100));
        }

        return activeSlides.length > 1 ? (currentIndex / (activeSlides.length - 1)) * 100 : 0;
    }, [mode, currentIndex, activeSlides, timelineSlides]);

    // ── Mode switching ─────────────────────────────────────────────────────────
    const handleModeChange = (newMode) => {
        if (newMode === mode) return;
        const currentSlide = activeSlides[currentIndex];
        const newSlides    = newMode === 'timeline' ? timelineSlides : slides;
        const newIdx       = currentSlide
            ? newSlides.findIndex(sl => sl.id === currentSlide.id)
            : 0;
        setCurrentIndex(newIdx !== -1 ? newIdx : 0);
        setMode(newMode);
    };

    // ── Navigation ─────────────────────────────────────────────────────────────
    const handlePrev  = () => setCurrentIndex(i => Math.max(0, i - 1));
    const handleNext  = () => setCurrentIndex(i => Math.min(activeSlides.length - 1, i + 1));
    const handleClose = () => {
        if (storyId) navigate(`/StoryMapView?id=${storyId}`);
        else navigate(-1);
    };

    // ── Loading / empty states ─────────────────────────────────────────────────
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

    return (
        <>
            {/* Banner */}
            <StoryMapBanner
                isVisible={true}
                storyTitle={story?.title || ''}
                storyId={storyId}
                hasChapters={false}
                onViewOtherStories={() => navigate(`/StoryMapView?id=${storyId}`)}
                onOpenLibrary={() => navigate('/ProjectInterface')}
                onEditStory={() => navigate(`/StoryMapView?id=${storyId}`)}
            />

            {/* Viewer */}
            <FullScreenImageViewer
                isOpen={true}
                onClose={handleClose}
                slides={activeSlides}
                currentIndex={currentIndex}
                onNavigate={setCurrentIndex}
                chapterName={activeSlides[currentIndex]?.chapter_name || ''}
                mapStyle={mapStyle}
                hideControlStrip={true}
                hideTextPanel={mode === 'picture'}
            />

            {/* ScaleBar — fixed above filmstrip, hidden in Picture mode */}
            {mode !== 'picture' && (
                <div
                    className="fixed z-[9999] pointer-events-none"
                    style={{ left: 380, right: 0, bottom: 140 }}
                >
                    <ScaleBar
                        mode={mode === 'timeline' ? 'dates' : 'chapters'}
                        cursorPercent={cursorPercent}
                        segments={scaleSegments}
                        ticks={scaleTicks}
                        startLabel={scaleStartLabel}
                        endLabel={scaleEndLabel}
                        height={95}
                    />
                </div>
            )}

            {/* Master pill + nav/mode sub-pill */}
            <StoryViewPill
                storyId={storyId}
                currentView="fullscreen"
                isVisible={true}
                subPill={
                    <FullscreenNavPill
                        onPrev={handlePrev}
                        onNext={handleNext}
                        onClose={handleClose}
                        hasMultiple={activeSlides.length > 1}
                        current={currentIndex + 1}
                        total={activeSlides.length}
                        mode={mode}
                        onModeChange={handleModeChange}
                    />
                }
            />
        </>
    );
}
