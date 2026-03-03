import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';

// "June 2024" — used for edge labels
const formatLong = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'long', year: 'numeric',
    });
};

// "Jun '24" — used for tick labels
const formatShort = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short' }) + " '" + String(d.getFullYear()).slice(2);
};

const dateToMs = (dateStr) => new Date(dateStr + 'T12:00:00').getTime();

const dateToPercent = (dateStr, minMs, maxMs) => {
    if (minMs === maxMs) return 50;
    return Math.max(0, Math.min(100, ((dateToMs(dateStr) - minMs) / (maxMs - minMs)) * 100));
};

export default function StoryTimeline() {
    const [searchParams] = useSearchParams();
    const navigate       = useNavigate();
    const storyId        = searchParams.get('storyId');

    const [story, setStory]               = useState(null);
    const [slides, setSlides]             = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading]           = useState(true);

    const filmstripRef = useRef(null);
    const thumbRefs    = useRef([]);

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
                setStory(storyData);
                const all = (chapters || []).flatMap(ch =>
                    (ch.slides || []).map(sl => ({ ...sl, chapter_name: ch.name }))
                );
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

    // ── Filmstrip auto-scroll ──────────────────────────────────────────────────
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

    // ── Timeline data ─────────────────────────────────────────────────────────
    const { minDate, maxDate, minMs, maxMs, monthTicks } = useMemo(() => {
        const dated = slides.filter(s => s.story_date);
        if (!dated.length) return { minDate: null, maxDate: null, minMs: 0, maxMs: 0, monthTicks: [] };

        const minDate = dated[0].story_date;
        const maxDate = dated[dated.length - 1].story_date;
        const minMs   = dateToMs(minDate);
        const maxMs   = dateToMs(maxDate);

        // One tick per calendar month boundary between min and max
        const ticks = [];
        const d = new Date(minMs);
        d.setDate(1);
        d.setMonth(d.getMonth() + 1); // first boundary after minDate
        while (d.getTime() <= maxMs) {
            ticks.push({
                dateStr: d.toISOString().split('T')[0],
                label:   formatShort(d.toISOString().split('T')[0]),
            });
            d.setMonth(d.getMonth() + 1);
        }
        return { minDate, maxDate, minMs, maxMs, monthTicks: ticks };
    }, [slides]);

    const currentSlide   = slides[currentIndex];
    const cursorPercent  = currentSlide?.story_date && minDate
        ? dateToPercent(currentSlide.story_date, minMs, maxMs)
        : null;

    const goBack = () => navigate(
        storyId ? createPageUrl(`StoryMapView?id=${storyId}`) : createPageUrl('Stories')
    );

    // ── States ─────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

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

            {/* ── Header: 56px ──────────────────────────────────────────────── */}
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

            {/* ── Carousel: 70% of (100vh − fixed zones), 70% width centred ── */}
            {/*   Fixed zones: header 56 + timeline 72 + filmstrip 120 = 248px   */}
            {/*   Full carousel would be (100vh − 248px); 70% = calc(70vh − 174px) */}
            <div
                className="flex-shrink-0 flex items-stretch bg-black"
                style={{ height: 'calc(70vh - 174px)' }}
            >
                {/* ← Prev — in the black gutter */}
                <div className="flex items-center justify-center" style={{ width: '15%' }}>
                    <button
                        onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                        disabled={currentIndex === 0}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                    >
                        <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Centred image frame: 70% wide */}
                <div className="relative flex-1 overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.35 }}
                            className="absolute inset-0"
                        >
                            {currentSlide?.image
                                ? <img src={currentSlide.image} alt={currentSlide.title}
                                       className="absolute inset-0 w-full h-full object-cover" />
                                : <div className="absolute inset-0 bg-slate-900" />
                            }
                            {/* Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                            {/* Slide info */}
                            <div className="absolute bottom-0 left-0 right-0 px-8 pb-5">
                                {currentSlide?.chapter_name && (
                                    <span className="block text-amber-400 text-xs uppercase tracking-widest font-medium mb-2">
                                        {currentSlide.chapter_name}
                                    </span>
                                )}
                                {currentSlide?.title && (
                                    <h2 className="text-white text-2xl md:text-3xl font-light leading-tight mb-1">
                                        {currentSlide.title}
                                    </h2>
                                )}
                                {currentSlide?.location && (
                                    <p className="text-white/50 text-sm mb-2">{currentSlide.location}</p>
                                )}
                                {currentSlide?.description && (
                                    <div
                                        className="text-white/65 text-sm leading-relaxed prose prose-sm prose-invert max-w-none overflow-y-auto"
                                        style={{ maxHeight: 96 }}
                                        dangerouslySetInnerHTML={{ __html: currentSlide.description }}
                                    />
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Slide count */}
                    <div className="absolute top-4 right-4 text-white/30 text-xs z-10 tabular-nums">
                        {currentIndex + 1} / {slides.length}
                    </div>
                </div>

                {/* → Next — in the black gutter */}
                <div className="flex items-center justify-center" style={{ width: '15%' }}>
                    <button
                        onClick={() => setCurrentIndex(i => Math.min(slides.length - 1, i + 1))}
                        disabled={currentIndex === slides.length - 1}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                    >
                        <ChevronRight className="w-5 h-5 text-white" />
                    </button>
                </div>
            </div>

            {/* ── Timeline bar: 72px ────────────────────────────────────────── */}
            {/*                                                                  */}
            {/*  tick labels  Jun '24   Jul '24   Aug '24   Sep '24             */}
            {/*  tick marks      |         |         |         |                */}
            {/*  line      ──────┼─────────┼─────────●─────────┼──────          */}
            {/*  edge labels  Jun 2024                        Sep 2024          */}
            {/*                                                                  */}
            <div className="flex-shrink-0 bg-black relative" style={{ height: 72 }}>

                {/* Track line — positioned at top: 44, leaving 28px above for ticks/labels */}
                <div
                    className="absolute"
                    style={{ left: 40, right: 40, top: 44, height: 1, background: 'rgba(255,255,255,0.18)' }}
                >
                    {/* Month tick marks + labels (above line) */}
                    {monthTicks.map(tick => {
                        const pct = dateToPercent(tick.dateStr, minMs, maxMs);
                        return (
                            <React.Fragment key={tick.dateStr}>
                                {/* Tick mark */}
                                <div style={{
                                    position: 'absolute',
                                    left: `${pct}%`,
                                    top: -7,
                                    width: 1,
                                    height: 7,
                                    background: 'rgba(255,255,255,0.22)',
                                    transform: 'translateX(-50%)',
                                }} />
                                {/* Label */}
                                <span style={{
                                    position: 'absolute',
                                    left: `${pct}%`,
                                    top: -22,
                                    transform: 'translateX(-50%)',
                                    fontSize: 9,
                                    color: 'rgba(255,255,255,0.28)',
                                    whiteSpace: 'nowrap',
                                    pointerEvents: 'none',
                                }}>
                                    {tick.label}
                                </span>
                            </React.Fragment>
                        );
                    })}

                    {/* Amber cursor — animates along the line */}
                    {cursorPercent !== null && (
                        <div
                            style={{
                                position: 'absolute',
                                left: `${cursorPercent}%`,
                                top: -5,
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: '#f59e0b',
                                boxShadow: '0 0 10px rgba(245,158,11,0.55)',
                                transform: 'translateX(-50%)',
                                transition: 'left 0.45s cubic-bezier(0.34, 1.4, 0.64, 1)',
                            }}
                        />
                    )}

                    {/* Left edge label (below line) */}
                    {minDate && (
                        <span style={{
                            position: 'absolute',
                            left: 0,
                            top: 8,
                            transform: 'translateX(-50%)',
                            fontSize: 9,
                            color: 'rgba(255,255,255,0.4)',
                            whiteSpace: 'nowrap',
                        }}>
                            {formatLong(minDate)}
                        </span>
                    )}

                    {/* Right edge label (below line) */}
                    {maxDate && maxDate !== minDate && (
                        <span style={{
                            position: 'absolute',
                            right: 0,
                            top: 8,
                            transform: 'translateX(50%)',
                            fontSize: 9,
                            color: 'rgba(255,255,255,0.4)',
                            whiteSpace: 'nowrap',
                        }}>
                            {formatLong(maxDate)}
                        </span>
                    )}
                </div>
            </div>

            {/* ── Filmstrip: 120px ──────────────────────────────────────────── */}
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
                                className="flex-shrink-0 rounded-lg overflow-hidden focus:outline-none"
                                style={{
                                    width:     isCurrent ? 114 : 80,
                                    height:    isCurrent ? 90  : 68,
                                    marginTop: isCurrent ? 0   : 11,
                                    opacity:   isCurrent ? 1   : 0.45,
                                    boxShadow: isCurrent ? '0 0 0 2px white, 0 2px 12px rgba(0,0,0,0.6)' : 'none',
                                    transition: 'all 0.3s ease',
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
