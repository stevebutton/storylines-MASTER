import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';

const formatMonthYear = (dateStr) => {
    if (!dateStr) return null;
    // Add T12:00:00 to avoid UTC midnight off-by-one day issues
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
    });
};

export default function StoryTimeline() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const storyId = searchParams.get('storyId');

    const [story, setStory]             = useState(null);
    const [slides, setSlides]           = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading]         = useState(true);

    const filmstripRef = useRef(null);
    const thumbRefs    = useRef([]);

    // ── Load story + slides ────────────────────────────────────────────────────
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
                setStory(storyData);

                // Flatten + inject chapter_name
                const all = (chapters || []).flatMap(ch =>
                    (ch.slides || []).map(sl => ({ ...sl, chapter_name: ch.name }))
                );
                // Dated slides sorted ascending; undated appended at end
                const dated   = all.filter(s => s.story_date).sort((a, b) => a.story_date.localeCompare(b.story_date));
                const undated = all.filter(s => !s.story_date);
                setSlides([...dated, ...undated]);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [storyId]);

    // ── Keep active thumb centred in filmstrip ─────────────────────────────────
    useEffect(() => {
        const strip = filmstripRef.current;
        const thumb = thumbRefs.current[currentIndex];
        if (!strip || !thumb) return;
        strip.scrollTo({
            left: thumb.offsetLeft - strip.offsetWidth / 2 + thumb.offsetWidth / 2,
            behavior: 'smooth',
        });
    }, [currentIndex]);

    // ── Keyboard navigation ────────────────────────────────────────────────────
    useEffect(() => {
        const handle = (e) => {
            if (e.key === 'ArrowLeft')  setCurrentIndex(i => Math.max(0, i - 1));
            if (e.key === 'ArrowRight') setCurrentIndex(i => Math.min(slides.length - 1, i + 1));
        };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [slides.length]);

    const currentSlide = slides[currentIndex];
    const dateLabel    = currentSlide?.story_date
        ? formatMonthYear(currentSlide.story_date)
        : 'Undated';

    const goBack = () => navigate(
        storyId ? createPageUrl(`StoryMapView?id=${storyId}`) : createPageUrl('Stories')
    );

    // ── Loading ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    // ── No dated slides ────────────────────────────────────────────────────────
    if (!slides.length) {
        return (
            <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center gap-4 text-white">
                <Calendar className="w-12 h-12 text-slate-600" />
                <p className="text-slate-400">No slides found in this story.</p>
                <button onClick={goBack} className="text-amber-400 hover:text-amber-300 text-sm underline mt-2">
                    ← Back
                </button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black flex flex-col overflow-hidden select-none">

            {/* ── Header ────────────────────────────────────────────────────── */}
            <div className="flex-shrink-0 flex items-center gap-3 px-5 bg-black/70 backdrop-blur-sm border-b border-white/10 z-10"
                 style={{ height: 56 }}>
                <button
                    onClick={goBack}
                    className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="w-px h-4 bg-white/20" />
                <span className="text-white/80 text-sm font-medium truncate">{story?.title}</span>
                <div className="ml-auto flex items-center gap-1.5 text-amber-400/60">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-xs tracking-widest uppercase">Timeline</span>
                </div>
            </div>

            {/* ── Carousel ──────────────────────────────────────────────────── */}
            <div className="flex-1 relative min-h-0">

                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35 }}
                        className="absolute inset-0"
                    >
                        {/* Background image */}
                        {currentSlide?.image && (
                            <img
                                src={currentSlide.image}
                                alt={currentSlide.title}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        )}
                        {!currentSlide?.image && (
                            <div className="absolute inset-0 bg-slate-900" />
                        )}

                        {/* Gradient overlay — heavier at bottom for text legibility */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                        {/* Slide metadata */}
                        <div className="absolute bottom-0 left-0 right-0 px-10 pb-6">
                            {currentSlide?.chapter_name && (
                                <span className="block text-amber-400 text-xs uppercase tracking-widest font-medium mb-2">
                                    {currentSlide.chapter_name}
                                </span>
                            )}
                            {currentSlide?.title && (
                                <h2 className="text-white text-3xl md:text-4xl font-light leading-tight mb-1">
                                    {currentSlide.title}
                                </h2>
                            )}
                            {currentSlide?.location && (
                                <p className="text-white/50 text-sm">{currentSlide.location}</p>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* ← Prev */}
                <button
                    onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                    disabled={currentIndex === 0}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center transition-all z-10"
                >
                    <ChevronLeft className="w-5 h-5 text-white" />
                </button>

                {/* → Next */}
                <button
                    onClick={() => setCurrentIndex(i => Math.min(slides.length - 1, i + 1))}
                    disabled={currentIndex === slides.length - 1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center transition-all z-10"
                >
                    <ChevronRight className="w-5 h-5 text-white" />
                </button>

                {/* Slide count */}
                <div className="absolute top-4 right-5 text-white/30 text-xs z-10 tabular-nums">
                    {currentIndex + 1} / {slides.length}
                </div>
            </div>

            {/* ── Date bridge ───────────────────────────────────────────────── */}
            <div className="flex-shrink-0 flex items-center gap-5 px-8 bg-black" style={{ height: 48 }}>
                <div className="flex-1 h-px bg-white/12" />
                <AnimatePresence mode="wait">
                    <motion.span
                        key={dateLabel}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.2 }}
                        className="text-xs font-medium text-white/45 tracking-[0.18em] uppercase whitespace-nowrap"
                    >
                        {dateLabel}
                    </motion.span>
                </AnimatePresence>
                <div className="flex-1 h-px bg-white/12" />
            </div>

            {/* ── Filmstrip ─────────────────────────────────────────────────── */}
            <div className="flex-shrink-0 bg-black" style={{ paddingBottom: 16 }}>
                <div
                    ref={filmstripRef}
                    className="flex items-center gap-2 px-5 overflow-x-auto"
                    style={{ height: 104, scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {slides.map((slide, i) => {
                        const isCurrent = i === currentIndex;
                        const src = slide.video_thumbnail_url || slide.image;
                        return (
                            <button
                                key={slide.id}
                                ref={el => thumbRefs.current[i] = el}
                                onClick={() => setCurrentIndex(i)}
                                className="flex-shrink-0 rounded-lg overflow-hidden focus:outline-none transition-all duration-300"
                                style={{
                                    width:     isCurrent ? 114 : 80,
                                    height:    isCurrent ? 90  : 68,
                                    marginTop: isCurrent ? 0   : 11,
                                    opacity:   isCurrent ? 1   : 0.45,
                                    boxShadow: isCurrent ? '0 0 0 2px white, 0 2px 12px rgba(0,0,0,0.6)' : 'none',
                                }}
                            >
                                {src
                                    ? <img src={src} alt={slide.title} className="w-full h-full object-cover" />
                                    : <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                        <span className="text-slate-600 text-xs">—</span>
                                    </div>
                                }
                            </button>
                        );
                    })}
                </div>
            </div>

        </div>
    );
}
