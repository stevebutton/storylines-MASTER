import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

const stripHtml = (html) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
};

const CATEGORY_COLORS = [
    '#3b82f6', '#10b981', '#8b5cf6', '#ec4899',
    '#06b6d4', '#84cc16', '#f97316',
];
const ALL_COLOR = '#64748b';

const pillStyle = (color, selected) => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 14px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: selected ? 700 : 400,
    cursor: 'pointer',
    border: 'none',
    outline: 'none',
    background: color,
    color: 'white',
    boxShadow: selected ? '0 0 0 2px white' : 'none',
    filter: selected ? 'none' : 'saturate(0.3)',
    transition: 'box-shadow 0.2s, filter 0.2s',
    textTransform: 'capitalize',
    whiteSpace: 'nowrap',
});

export default function FloatingStorySlideshow({ isOpen, onClose, currentStoryId }) {
    const navigate = useNavigate();
    const [stories, setStories] = useState([]);
    const [seriesList, setSeriesList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [scrollPosition, setScrollPosition] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [targetUrl, setTargetUrl] = useState(null);

    // isPanelOpen drives the panel's AnimatePresence separately from isOpen.
    // This lets us start the panel slide-out BEFORE initiating the black
    // transition overlay, giving the desired exit sequence:
    //   1. Explore panel slides down (visible)
    //   2. Black overlay fades in at z-200020 (above story view, below panel)
    //   3. Navigate to new story
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    const navigatingRef   = useRef(false); // true while a story-click navigation is in progress
    const hasNavigatedRef = useRef(false); // guard against double-navigate on onAnimationComplete
    const scrollContainerRef = useRef(null);
    const seriesScrollRef    = useRef(null);

    // Sync internal panel state with isOpen prop (open/close from parent).
    useEffect(() => {
        if (isOpen) setIsPanelOpen(true);
    }, [isOpen]);

    // On normal close (not a story navigation), clear transition state immediately.
    useEffect(() => {
        if (!isOpen && !navigatingRef.current) {
            setIsPanelOpen(false);
            setIsTransitioning(false);
            setTargetUrl(null);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            loadStories();
        }
    }, [isOpen, currentStoryId]);

    const loadStories = async () => {
        setIsLoading(true);
        try {
            const [{ data: allStories, error }, { data: seriesData }] = await Promise.all([
                supabase.from('stories').select('*').eq('is_published', true).neq('id', currentStoryId ?? ''),
                supabase.from('series').select('id, title, subtitle, description, cover_image').eq('is_published', true).order('title'),
            ]);
            if (error) throw error;
            setSeriesList(seriesData || []);

            // Assign a display_image for each story.
            // Priority: thumbnail → hero_image (if not a video hero) → first slide image.
            const storiesWithStatic = allStories.map(s => ({
                ...s,
                display_image: s.thumbnail || (s.hero_type !== 'video' ? s.hero_image : null) || null,
            }));

            // For stories still lacking an image, fetch the first available slide image
            // via two targeted queries (no N+1).
            const needsFallback = storiesWithStatic.filter(s => !s.display_image);
            const fallbackByStory = {};

            if (needsFallback.length > 0) {
                const ids = needsFallback.map(s => s.id);

                // Step 1: first chapter per story
                const { data: chapters } = await supabase
                    .from('chapters')
                    .select('id, story_id, order')
                    .in('story_id', ids)
                    .order('order');

                const firstChapterByStory = {};
                for (const ch of chapters || []) {
                    if (!firstChapterByStory[ch.story_id]) {
                        firstChapterByStory[ch.story_id] = ch.id;
                    }
                }

                // Step 2: first slide with an image per chapter
                const chapterIds = Object.values(firstChapterByStory);
                if (chapterIds.length > 0) {
                    const { data: slides } = await supabase
                        .from('slides')
                        .select('chapter_id, image, order')
                        .in('chapter_id', chapterIds)
                        .not('image', 'is', null)
                        .order('order');

                    const firstSlideByChapter = {};
                    for (const sl of slides || []) {
                        if (!firstSlideByChapter[sl.chapter_id]) {
                            firstSlideByChapter[sl.chapter_id] = sl.image;
                        }
                    }

                    for (const [storyId, chapterId] of Object.entries(firstChapterByStory)) {
                        fallbackByStory[storyId] = firstSlideByChapter[chapterId] || null;
                    }
                }
            }

            setStories(storiesWithStatic.map(s => ({
                ...s,
                display_image: s.display_image || fallbackByStory[s.id] || null,
            })));
        } catch (error) {
            console.error('Failed to load stories:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const scrollSeries = (direction) => {
        if (!seriesScrollRef.current) return;
        seriesScrollRef.current.scrollBy({ left: direction === 'left' ? -420 : 420, behavior: 'smooth' });
    };

    const scroll = (direction) => {
        if (!scrollContainerRef.current) return;
        const scrollAmount = 300;
        const newPosition = direction === 'left'
            ? scrollPosition - scrollAmount
            : scrollPosition + scrollAmount;
        scrollContainerRef.current.scrollTo({ left: newPosition, behavior: 'smooth' });
        setScrollPosition(newPosition);
    };

    const handleStoryClick = (storyId) => {
        navigatingRef.current   = true;
        hasNavigatedRef.current = false;
        const url = createPageUrl('StoryMapView') + '?id=' + storyId;
        setTargetUrl(url);
        // Panel slides out immediately (visible exit).
        // Black transition overlay starts at the same moment at z-200020,
        // sitting below the panel but above the story view — covers the background
        // while the panel exits on top.
        setIsPanelOpen(false);
        // Let panel fully exit (1s) before starting the black overlay.
        setTimeout(() => setIsTransitioning(true), 1000);
    };

    const categories = [...new Set(stories.map(s => s.category).filter(Boolean))].sort();
    const filteredStories = selectedCategory
        ? stories.filter(s => s.category === selectedCategory)
        : stories;

    return (
        <>
            {/* Black transition overlay — z-200020: below the panel (z-200030) so the
                panel slides out visibly on top, above the story view (z-200000) to cover it.
                Exits instantly once the new story's own black overlay is active. */}
            <AnimatePresence>
                {isTransitioning && (
                    <motion.div
                        className="fixed inset-0 bg-black pointer-events-none"
                        style={{ zIndex: 200020 }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 1.0, ease: 'easeIn' } }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        onAnimationComplete={() => {
                            if (targetUrl && !hasNavigatedRef.current) {
                                hasNavigatedRef.current = true;
                                navigate(targetUrl);
                                // Wait 600ms for the story overlay exit (0.6s) to finish,
                                // then fade out smoothly over 1s to dissolve into the new story.
                                setTimeout(() => {
                                    setIsTransitioning(false);
                                    setTargetUrl(null);
                                    navigatingRef.current   = false;
                                    hasNavigatedRef.current = false;
                                }, 600);
                            }
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Backdrop — tied to isOpen (stays until parent closes the modal) */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                        style={{ zIndex: 200025 }}
                        onClick={onClose}
                    />
                )}
            </AnimatePresence>

            {/* Panel — tied to isPanelOpen for independent exit timing */}
            <AnimatePresence>
                {isPanelOpen && (
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%', transition: { duration: 1.0, ease: 'easeIn' } }}
                        transition={{ duration: 2, ease: 'easeIn' }}
                        className="fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t border-white/10 shadow-2xl overflow-hidden"
                        style={{ top: 100, zIndex: 200030, background: 'rgba(255,255,255,0.15)' }}
                    >
                        <div className="max-w-7xl mx-auto p-6">
                            {/* Series section */}
                            {seriesList.length > 0 && (
                                <motion.div
                                    style={{ marginBottom: 60 }}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.25, duration: 0.4, ease: 'easeOut' }}
                                >
                                    {/* Logo + Featured Series heading + close button on one row */}
                                    <div className="flex items-center gap-4 mb-4">
                                        <img
                                            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/91ab42d74_logoadjustedpng.png"
                                            alt="Storylines"
                                            style={{ width: 250, height: 100, objectFit: 'contain' }}
                                        />
                                        <h3 className="text-3xl font-light text-white">Watch the Featured Series</h3>
                                        <button
                                            onClick={onClose}
                                            className="ml-auto bg-white/15 hover:bg-white/25 rounded-full p-3 transition-all"
                                        >
                                            <X className="w-6 h-6 text-white" />
                                        </button>
                                    </div>
                                    {/* Series cards */}
                                    <div className="relative">
                                        {seriesList.length > 1 && (
                                            <>
                                                <button
                                                    onClick={() => scrollSeries('left')}
                                                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/25 transition-colors"
                                                    style={{ marginLeft: -50 }}
                                                >
                                                    <ChevronLeft className="w-5 h-5 text-white" />
                                                </button>
                                                <button
                                                    onClick={() => scrollSeries('right')}
                                                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/25 transition-colors"
                                                    style={{ marginRight: -50 }}
                                                >
                                                    <ChevronRight className="w-5 h-5 text-white" />
                                                </button>
                                            </>
                                        )}
                                    <div ref={seriesScrollRef} className="flex overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', gap: 25 }}>
                                        {seriesList.map(s => (
                                            <div key={s.id} className="flex-shrink-0 flex gap-3" style={{ height: 200 }}>
                                                {/* Card */}
                                                <motion.div
                                                    whileHover={{ scale: 1.02 }}
                                                    onClick={() => navigate(createPageUrl('SeriesView') + '?id=' + s.id)}
                                                    className="flex-shrink-0 rounded-xl border border-white/20 overflow-hidden cursor-pointer hover:border-white/40 transition-colors relative"
                                                    style={{ height: 200, width: 370 }}
                                                >
                                                    {s.cover_image ? (
                                                        <img
                                                            src={s.cover_image}
                                                            alt={s.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-white/10" />
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                                    <div className="absolute bottom-0 left-0 right-0 p-3">
                                                        <div style={{
                                                            fontFamily:    'Raleway, sans-serif',
                                                            fontSize:      15,
                                                            fontWeight:    400,
                                                            letterSpacing: '0.06em',
                                                            color:         'rgba(245,158,11,0.95)',
                                                            marginBottom:  4,
                                                        }}>
                                                            a <span style={{ fontWeight: 700 }}>Storylines</span> series
                                                        </div>
                                                        <h4 className="text-3xl font-semibold text-white" style={{ maxWidth: '50%', lineHeight: 1 }}>
                                                            {s.title}
                                                        </h4>
                                                        {s.subtitle && (
                                                            <p className="text-white/70 text-sm line-clamp-1 mt-0.5">
                                                                {s.subtitle}
                                                            </p>
                                                        )}
                                                    </div>
                                                </motion.div>
                                                {/* Description column */}
                                                {s.description && (
                                                    <div className="flex-shrink-0 flex flex-col justify-center" style={{ width: 176 }}>
                                                        <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-2">
                                                            About the series
                                                        </p>
                                                        <p className="text-white text-sm leading-snug">
                                                            {s.description}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    </div>{/* end relative arrow wrapper */}
                                </motion.div>
                            )}

                            {/* Explore Other Stories heading + category pills */}
                            <motion.div
                                className="flex items-center gap-4 mb-4 flex-wrap"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.35, duration: 0.4, ease: 'easeOut' }}
                            >
                                <h3 className="text-3xl font-light text-white" style={{ marginLeft: 50 }}>Explore Other Stories</h3>
                                {seriesList.length === 0 && (
                                    <button
                                        onClick={onClose}
                                        className="ml-auto bg-white/15 hover:bg-white/25 rounded-full p-3 transition-all"
                                    >
                                        <X className="w-6 h-6 text-white" />
                                    </button>
                                )}
                                {categories.length > 0 && (
                                    <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
                                        {categories.map((cat, i) => (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedCategory(cat)}
                                                style={pillStyle(CATEGORY_COLORS[i % CATEGORY_COLORS.length], selectedCategory === cat)}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => setSelectedCategory(null)}
                                            style={pillStyle(ALL_COLOR, selectedCategory === null)}
                                        >
                                            All
                                        </button>
                                    </div>
                                )}
                            </motion.div>

                            {/* Stories Carousel */}
                            <AnimatePresence>
                            {!isLoading && (
                            <motion.div
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                            >
                            {filteredStories.length === 0 ? (
                                <div className="text-center py-12 text-white/60">
                                    No stories available
                                </div>
                            ) : (
                                <div className="relative">
                                    {filteredStories.length > 4 && (
                                        <>
                                            <button
                                                onClick={() => scroll('left')}
                                                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/25 transition-colors"
                                                style={{ marginLeft: '-50px' }}
                                            >
                                                <ChevronLeft className="w-5 h-5 text-white" />
                                            </button>
                                            <button
                                                onClick={() => scroll('right')}
                                                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/25 transition-colors"
                                                style={{ marginRight: '-50px' }}
                                            >
                                                <ChevronRight className="w-5 h-5 text-white" />
                                            </button>
                                        </>
                                    )}

                                    <div
                                        ref={scrollContainerRef}
                                        className="flex gap-4 overflow-x-auto pb-4"
                                        style={{ scrollbarWidth: 'none' }}
                                    >
                                        {filteredStories.map((story) => (
                                            <motion.div
                                                key={story.id}
                                                whileHover={{ scale: 1.02 }}
                                                className="flex-shrink-0 w-44 bg-white/10 rounded-xl border border-white/20 overflow-hidden cursor-pointer backdrop-blur-sm hover:bg-white/15 transition-colors"
                                                onClick={() => handleStoryClick(story.id)}
                                            >
                                                {story.display_image && (
                                                    <div className="w-full h-24 bg-white/10 overflow-hidden">
                                                        <img
                                                            src={story.display_image}
                                                            alt={story.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                )}
                                                <div className="p-2">
                                                    <h4 className="text-base font-semibold text-white mb-0.5 leading-tight">
                                                        {story.title}
                                                    </h4>
                                                    {story.subtitle && (
                                                        <p className="text-sm text-white/80 line-clamp-2 mb-0.5">
                                                            {stripHtml(story.subtitle)}
                                                        </p>
                                                    )}
                                                    {story.author && (
                                                        <p className="text-sm text-white/60">
                                                            by {story.author}
                                                        </p>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            </motion.div>
                            )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
