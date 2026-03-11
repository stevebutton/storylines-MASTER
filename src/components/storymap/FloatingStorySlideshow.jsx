import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const stripHtml = (html) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
};

export default function FloatingStorySlideshow({ isOpen, onClose, currentStoryId }) {
    const navigate = useNavigate();
    const [stories, setStories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [scrollPosition, setScrollPosition] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [targetUrl, setTargetUrl] = useState(null);
    const scrollContainerRef = React.useRef(null);

    // When the panel closes (including after an in-page navigation), clear transition state
    useEffect(() => {
        if (!isOpen) {
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
            const { data: allStories, error } = await supabase
                .from('stories')
                .select('*')
                .eq('is_published', true)
                .neq('id', currentStoryId ?? '');
            if (error) throw error;
            const otherStories = allStories;
            setStories(otherStories.map(s => ({
                ...s,
                display_image: s.thumbnail || s.hero_image || null
            })));
        } catch (error) {
            console.error('Failed to load stories:', error);
        } finally {
            setIsLoading(false);
        }
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
        const url = createPageUrl('StoryMapView') + '?id=' + storyId;
        setTargetUrl(url);
        setIsTransitioning(true);
    };

    const categories = [...new Set(stories.map(s => s.category).filter(Boolean))].sort();
    const filteredStories = selectedCategory
        ? stories.filter(s => s.category === selectedCategory)
        : stories;

    return (
        <>
            {/* Full-screen dissolve transition overlay */}
            <AnimatePresence>
                {isTransitioning && (
                    <motion.div
                        className="fixed inset-0 bg-black pointer-events-none"
                        style={{ zIndex: 200040 }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, ease: 'easeInOut' }}
                        onAnimationComplete={() => {
                            if (targetUrl) {
                                // SPA navigation — no page reload, no grey flash.
                                // StoryMapView's reset effect will show its own black overlay
                                // the moment the storyId changes in useSearchParams.
                                navigate(targetUrl);
                            }
                        }}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                            style={{ zIndex: 200025 }}
                            onClick={onClose}
                        />

                        {/* Slideshow Container */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ duration: 2, ease: 'easeIn' }}
                            className="fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t border-white/10 shadow-2xl overflow-hidden"
                            style={{ height: '50vh', zIndex: 200030, background: 'rgba(0,0,0,0.20)' }}
                        >
                            <div className="max-w-7xl mx-auto p-6">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <motion.div
                                        className="flex items-center gap-3"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
                                    >
                                        <img
                                            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/91ab42d74_logoadjustedpng.png"
                                            alt="Storylines"
                                            className="h-8 w-auto"
                                        />
                                        <h3 className="text-2xl font-light text-white">Explore Other Stories</h3>
                                    </motion.div>
                                    <button
                                        onClick={onClose}
                                        className="bg-white/15 hover:bg-white/25 rounded-full p-3 transition-all"
                                    >
                                        <X className="w-6 h-6 text-white" />
                                    </button>
                                </div>

                                {/* Category filter pills */}
                                {categories.length > 0 && (
                                    <motion.div
                                        className="flex items-center gap-2 mb-5 flex-wrap"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.55, duration: 0.4, ease: 'easeOut' }}
                                    >
                                        <button
                                            onClick={() => setSelectedCategory(null)}
                                            className={cn(
                                                'px-3 py-1 rounded-full text-sm font-medium transition-colors border',
                                                selectedCategory === null
                                                    ? 'bg-amber-600 text-white border-amber-600'
                                                    : 'bg-white/15 text-white border-white/20 hover:bg-white/25 backdrop-blur-sm'
                                            )}
                                        >
                                            All
                                        </button>
                                        {categories.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedCategory(cat)}
                                                className={cn(
                                                    'px-3 py-1 rounded-full text-sm font-medium transition-colors border',
                                                    selectedCategory === cat
                                                        ? 'bg-amber-600 text-white border-amber-600'
                                                        : 'bg-white/15 text-white border-white/20 hover:bg-white/25 backdrop-blur-sm'
                                                )}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}

                                {/* Stories Carousel — slides in once data is ready */}
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
                                        {/* Navigation Buttons */}
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

                                        {/* Stories row */}
                                        <div
                                            ref={scrollContainerRef}
                                            className="flex gap-4 overflow-x-auto pb-4"
                                            style={{ scrollbarWidth: 'none' }}
                                        >
                                            {filteredStories.map((story) => (
                                                <motion.div
                                                    key={story.id}
                                                    whileHover={{ scale: 1.02 }}
                                                    className="flex-shrink-0 w-60 bg-white/10 rounded-xl border border-white/20 overflow-hidden cursor-pointer backdrop-blur-sm hover:bg-white/15 transition-colors"
                                                    onClick={() => handleStoryClick(story.id)}
                                                >
                                                    {/* Thumbnail */}
                                                    {story.display_image && (
                                                        <div className="w-full h-32 bg-white/10 overflow-hidden">
                                                            <img
                                                                src={story.display_image}
                                                                alt={story.title}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Content */}
                                                    <div className="p-3">
                                                        <h4 className="text-base font-semibold text-white mb-1 leading-tight">
                                                            {story.title}
                                                        </h4>
                                                        {story.subtitle && (
                                                            <p className="text-sm text-white/80 line-clamp-2 mb-1">
                                                                {stripHtml(story.subtitle)}
                                                            </p>
                                                        )}
                                                        {story.author && (
                                                            <p className="text-xs text-white/60">
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
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
