import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';
import StoryMapBanner from '@/components/storymap/StoryMapBanner';
import StoryViewPill from '@/components/storymap/StoryViewPill';

// "June 2024" — used for edge labels and slide date display
const formatLong = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'long', year: 'numeric',
    });
};

// "Jun 2024" — used for regular month tick labels
const formatMedium = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
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

    const filmstripRef  = useRef(null);
    const thumbRefs     = useRef([]);
    const [hoveredThumb, setHoveredThumb] = useState(null);

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

        const ticks = [];
        const d = new Date(minMs);
        d.setDate(1);
        d.setMonth(d.getMonth() + 1);
        while (d.getTime() <= maxMs) {
            ticks.push({
                dateStr: d.toISOString().split('T')[0],
                label:   formatMedium(d.toISOString().split('T')[0]),
            });
            d.setMonth(d.getMonth() + 1);
        }
        return { minDate, maxDate, minMs, maxMs, monthTicks: ticks };
    }, [slides]);

    const currentSlide  = slides[currentIndex];
    const cursorPercent = currentSlide?.story_date && minDate
        ? dateToPercent(currentSlide.story_date, minMs, maxMs)
        : null;

    const goBack = () => navigate(-1);

    // ── Loading / empty states ─────────────────────────────────────────────────
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
        <div className="fixed inset-0 overflow-hidden select-none">

            {/* ── Hero background ───────────────────────────────────────────── */}
            {story?.hero_image && (
                <div
                    className="absolute inset-0 bg-cover bg-center z-0"
                    style={{ backgroundImage: `url(${story.hero_image})` }}
                />
            )}
            {/* 20% dark overlay — lighter so hero shows through */}
            <div className="absolute inset-0 z-0" style={{ background: 'rgba(0,0,0,0.20)' }} />

            {/* Blur + black gradient — from bottom 30% to mid-viewport */}
            <div
                className="absolute inset-0 z-[1] pointer-events-none"
                style={{
                    background:           'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.3) 35%, transparent 55%)',
                    backdropFilter:       'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    maskImage:            'linear-gradient(to top, black 0%, black 30%, transparent 55%)',
                    WebkitMaskImage:      'linear-gradient(to top, black 0%, black 30%, transparent 55%)',
                }}
            />

            {/* ── Banner ────────────────────────────────────────────────────── */}
            <StoryMapBanner
                isVisible={true}
                storyTitle={story?.title || ''}
                storyId={storyId}
                hasChapters={false}
            />

            {/* ── Back button — top-left gap beside banner logo ─────────────── */}
            <button
                onClick={goBack}
                className="fixed top-0 left-0 z-[100020] h-[100px] flex items-center px-5 gap-1.5 text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium"
            >
                <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {/* ── "Project Timeline" heading — below banner, aligned with story title ── */}
            {/*   Spacer (382px) pushes text past the logo area, matching banner layout   */}
            <div
                className="fixed left-0 right-0 z-[9999] flex items-center px-6 md:px-12"
                style={{ top: 100, height: 72 }}
            >
                <span className="hidden md:block flex-shrink-0" style={{ width: 382 }} />
                <h1
                    className="text-white font-light text-3xl md:text-5xl"
                    style={{ fontFamily: 'Raleway, sans-serif' }}
                >
                    Project Timeline
                </h1>
            </div>

            {/* ── Main content ──────────────────────────────────────────────── */}
            {/*   top: 172px (100 banner + 72 heading), bottom: 150px reserved  */}
            {/*   padding: 50px all round for breathing room                    */}
            <div
                className="absolute left-0 right-0 flex flex-col z-10"
                style={{ top: 172, bottom: 150, paddingTop: 50, paddingRight: 50, paddingBottom: 50, paddingLeft: 250 }}
            >

                {/* ── Carousel: fixed clamp height, right-aligned at 50% width ── */}
                {/* clamp(360px, 100vh-600px, 550px) keeps it portrait-ish */}
                <div className="flex-shrink-0 flex items-stretch"
                     style={{ height: 'clamp(360px, calc(100vh - 600px), 550px)' }}>

                    {/* Left panel — Project Overview */}
                    <div className="flex-1 flex flex-col justify-end pr-10 pb-6">
                        {story?.project_overview && (
                            <>
                                <span className="block text-amber-400 text-xs uppercase tracking-widest font-medium mb-3">
                                    Project Overview
                                </span>
                                <div
                                    className="text-white/80 text-sm leading-relaxed overflow-y-auto"
                                    style={{ maxHeight: '70%' }}
                                >
                                    {story.project_overview}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Right panel: 50% wide, 1px white border */}
                    <div
                        className="relative overflow-hidden rounded-2xl shadow-2xl"
                        style={{ width: '50%', border: '1px solid rgba(255,255,255,0.5)' }}
                    >
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
                                    ? <img
                                        src={currentSlide.image}
                                        alt={currentSlide.title}
                                        className="absolute inset-0 w-full h-full object-cover"
                                      />
                                    : <div className="absolute inset-0 bg-slate-900/80" />
                                }
                                {/* Bottom gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                                {/* Slide info: chapter → title → description → date */}
                                {/* Text constrained to 60% of carousel width */}
                                <div className="absolute bottom-0 left-0 right-0 px-7 pb-6" style={{ maxWidth: '60%' }}>
                                    {currentSlide?.chapter_name && (
                                        <span className="block text-amber-400 text-xs uppercase tracking-widest font-medium mb-1">
                                            {currentSlide.chapter_name}
                                        </span>
                                    )}
                                    {currentSlide?.title && (
                                        <h2 className="text-white text-2xl md:text-3xl font-light leading-tight mb-2">
                                            {currentSlide.title}
                                        </h2>
                                    )}
                                    {currentSlide?.description && (
                                        <div
                                            className="text-white/65 text-sm leading-relaxed prose prose-sm prose-invert max-w-none overflow-y-auto"
                                            style={{ maxHeight: 72 }}
                                            dangerouslySetInnerHTML={{ __html: currentSlide.description }}
                                        />
                                    )}
                                    {currentSlide?.story_date && (
                                        <span className="block text-amber-300 text-2xl md:text-3xl font-bold leading-tight mt-2">
                                            {formatLong(currentSlide.story_date)}
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {/* Prev arrow — overlaid on image left */}
                        <button
                            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                            disabled={currentIndex === 0}
                            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/30 hover:bg-black/60 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                        >
                            <ChevronLeft className="w-5 h-5 text-white" />
                        </button>

                        {/* Next arrow — overlaid on image right */}
                        <button
                            onClick={() => setCurrentIndex(i => Math.min(slides.length - 1, i + 1))}
                            disabled={currentIndex === slides.length - 1}
                            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/30 hover:bg-black/60 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                        >
                            <ChevronRight className="w-5 h-5 text-white" />
                        </button>

                        {/* Slide count */}
                        <div className="absolute top-4 right-4 text-white/30 text-xs z-10 tabular-nums">
                            {currentIndex + 1} / {slides.length}
                        </div>
                    </div>
                </div>

                {/* ── Timeline bar ─────────────────────────────────────────── */}
                {/* Height 95px: line at y=20, year labels end at ~82px, 13px spare  */}
                <div
                    className="flex-shrink-0 relative mt-3"
                    style={{ height: 95 }}
                >
                    {/* Track line — at y=20, ticks + labels hang DOWN */}
                    <div
                        className="absolute"
                        style={{ left: 48, right: 48, top: 20, height: 2, background: 'rgba(255,255,255,0.6)' }}
                    >
                        {monthTicks.map(tick => {
                            const pct    = dateToPercent(tick.dateStr, minMs, maxMs);
                            const isYear = tick.dateStr.slice(5, 7) === '01';
                            return (
                                <React.Fragment key={tick.dateStr}>
                                    <div style={{
                                        position:   'absolute',
                                        left:       `${pct}%`,
                                        top:        2,
                                        width:      isYear ? 3 : 1,
                                        height:     isYear ? 30 : 20,
                                        background: isYear ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)',
                                        transform:  'translateX(-50%)',
                                    }} />
                                    <span style={{
                                        position:      'absolute',
                                        left:          `${pct}%`,
                                        top:           isYear ? 36 : 26,
                                        transform:     'translateX(-50%)',
                                        fontSize:      isYear ? 26 : 18,
                                        fontWeight:    isYear ? 700 : 400,
                                        color:         isYear ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.8)',
                                        whiteSpace:    'nowrap',
                                        letterSpacing: isYear ? '0.05em' : '0.02em',
                                        pointerEvents: 'none',
                                        lineHeight:    1,
                                    }}>
                                        {isYear ? tick.dateStr.slice(0, 4) : formatMedium(tick.dateStr)}
                                    </span>
                                </React.Fragment>
                            );
                        })}

                        {/* Amber cursor */}
                        {cursorPercent !== null && (
                            <div style={{
                                position:     'absolute',
                                left:         `${cursorPercent}%`,
                                top:          -12,
                                width:        16,
                                height:       16,
                                borderRadius: '50%',
                                background:   '#f59e0b',
                                boxShadow:    '0 0 16px rgba(245,158,11,0.85)',
                                transform:    'translateX(-50%)',
                                transition:   'left 0.45s cubic-bezier(0.34, 1.4, 0.64, 1)',
                                zIndex:       2,
                            }} />
                        )}

                        {/* Start label */}
                        {minDate && (
                            <span style={{
                                position: 'absolute', left: 0, top: 26,
                                transform: 'translateX(-50%)', fontSize: 14,
                                color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', letterSpacing: '0.04em',
                            }}>
                                {formatLong(minDate)}
                            </span>
                        )}

                        {/* End label */}
                        {maxDate && maxDate !== minDate && (
                            <span style={{
                                position: 'absolute', right: 0, top: 26,
                                transform: 'translateX(50%)', fontSize: 14,
                                color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', letterSpacing: '0.04em',
                            }}>
                                {formatLong(maxDate)}
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Filmstrip — landscape thumbs with slide title below left ── */}
                <div className="flex-shrink-0 mt-2">
                    <div
                        ref={filmstripRef}
                        className="flex items-end gap-2 px-4 overflow-x-auto"
                        style={{ height: 140, scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {slides.map((slide, i) => {
                            const isCurrent = i === currentIndex;
                            const isHovered = hoveredThumb === i;
                            const src       = slide.video_thumbnail_url || slide.image;
                            const thumbW    = isCurrent ? 114 : 80;
                            const thumbH    = isCurrent ? 90  : 68;

                            return (
                                <div
                                    key={slide.id}
                                    ref={el => thumbRefs.current[i] = el}
                                    className="flex-shrink-0 flex flex-col"
                                    style={{ width: thumbW, gap: 4, transition: 'width 0.2s ease' }}
                                >
                                    {/* Landscape image thumb */}
                                    <button
                                        onClick={() => setCurrentIndex(i)}
                                        onMouseEnter={() => setHoveredThumb(i)}
                                        onMouseLeave={() => setHoveredThumb(null)}
                                        className="flex-shrink-0 rounded-lg overflow-hidden focus:outline-none"
                                        style={{
                                            width:      thumbW,
                                            height:     thumbH,
                                            opacity:    isCurrent ? 1 : (isHovered ? 0.85 : 0.5),
                                            boxShadow:  isCurrent
                                                ? '0 0 0 2px white, 0 2px 12px rgba(0,0,0,0.6)'
                                                : (isHovered ? '0 0 0 2px rgba(255,255,255,0.65)' : 'none'),
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        {src
                                            ? <img src={src} alt={slide.title} className="w-full h-full object-cover" />
                                            : <div className="w-full h-full bg-slate-800/60" />
                                        }
                                    </button>

                                    {/* Slide title below, left-aligned, 2-line clamp */}
                                    <span
                                        className="text-left text-white/70 leading-tight"
                                        style={{
                                            fontSize:          14,
                                            display:           '-webkit-box',
                                            WebkitLineClamp:   2,
                                            WebkitBoxOrient:   'vertical',
                                            overflow:          'hidden',
                                            opacity:           isCurrent ? 1 : (isHovered ? 0.8 : 0.5),
                                            transition:        'opacity 0.2s ease',
                                        }}
                                    >
                                        {slide.title || ''}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>

            {/* Story View Pill — always visible in timeline view */}
            <StoryViewPill
                storyId={storyId}
                currentView="timeline"
                isVisible={true}
            />
        </div>
    );
}
