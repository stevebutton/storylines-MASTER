import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

const stripHtml = (html) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
};

export default function FloatingStorySlideshow({ isOpen, onClose, currentStoryId }) {
    const [stories, setStories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [scrollPosition, setScrollPosition] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [targetUrl, setTargetUrl] = useState(null);
    const scrollContainerRef = React.useRef(null);

    useEffect(() => {
        if (isOpen) {
            loadStories();
        }
    }, [isOpen, currentStoryId]);

    const loadStories = async () => {
        setIsLoading(true);
        try {
            const allStories = await base44.entities.Story.filter({ is_published: true });
            const otherStories = allStories.filter(s => s.id !== currentStoryId);

            // For stories without a hero image, fetch chapter 1 slide 1 as fallback
            const needFallback = otherStories.filter(s => !s.hero_image);
            const fallbackImages = {};

            await Promise.all(needFallback.map(async (story) => {
                try {
                    const chapters = await base44.entities.Chapter.filter({ story_id: story.id });
                    if (!chapters.length) return;
                    const firstChapter = chapters.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
                    const slides = await base44.entities.Slide.filter({ chapter_id: firstChapter.id });
                    if (!slides.length) return;
                    const firstSlide = slides.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
                    if (firstSlide.image) fallbackImages[story.id] = firstSlide.image;
                } catch {
                    // silently skip — thumbnail will just be absent
                }
            }));

            setStories(otherStories.map(s => ({
                ...s,
                display_image: s.hero_image || fallbackImages[s.id] || null
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
                        className="fixed inset-0 bg-black z-[9999] pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, ease: 'easeInOut' }}
                        onAnimationComplete={() => {
                            if (targetUrl) window.location.href = targetUrl;
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
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[65]"
                            onClick={onClose}
                        />

                        {/* Slideshow Container */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 z-[66] bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-2xl"
                            style={{ maxHeight: '50vh' }}
                        >
                            <div className="max-w-7xl mx-auto p-6">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <motion.h3
                                        className="text-2xl font-light text-slate-800"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
                                    >
                                        Explore Other Stories
                                    </motion.h3>
                                    <button
                                        onClick={onClose}
                                        className="bg-slate-100 hover:bg-slate-200 rounded-full p-3 transition-all"
                                    >
                                        <X className="w-6 h-6 text-slate-700" />
                                    </button>
                                </div>

                                {/* Category filter pills */}
                                {categories.length > 0 && (
                                    <motion.div
                                        className="flex items-center gap-2 mb-4 flex-wrap"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.55, duration: 0.4, ease: 'easeOut' }}
                                    >
                                        <button
                                            onClick={() => setSelectedCategory(null)}
                                            className={cn(
                                                'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                                                selectedCategory === null
                                                    ? 'bg-amber-600 text-white'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            )}
                                        >
                                            All
                                        </button>
                                        {categories.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedCategory(cat)}
                                                className={cn(
                                                    'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                                                    selectedCategory === cat
                                                        ? 'bg-amber-600 text-white'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                >
                                {filteredStories.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500">
                                        No stories available
                                    </div>
                                ) : (
                                    <div className="relative">
                                        {/* Navigation Buttons */}
                                        {filteredStories.length > 4 && (
                                            <>
                                                <button
                                                    onClick={() => scroll('left')}
                                                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white shadow-lg hover:bg-slate-50 transition-colors"
                                                    style={{ marginLeft: '-20px' }}
                                                >
                                                    <ChevronLeft className="w-5 h-5 text-slate-600" />
                                                </button>
                                                <button
                                                    onClick={() => scroll('right')}
                                                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white shadow-lg hover:bg-slate-50 transition-colors"
                                                    style={{ marginRight: '-20px' }}
                                                >
                                                    <ChevronRight className="w-5 h-5 text-slate-600" />
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
                                                    className="flex-shrink-0 w-60 bg-white rounded-xl border border-slate-200 overflow-hidden cursor-pointer shadow-sm hover:shadow-lg transition-shadow"
                                                    onClick={() => handleStoryClick(story.id)}
                                                >
                                                    {/* Thumbnail — hero image with chapter 1 slide 1 as fallback */}
                                                    {story.display_image && (
                                                        <div className="w-full h-32 bg-slate-200 overflow-hidden">
                                                            <img
                                                                src={story.display_image}
                                                                alt={story.title}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Content */}
                                                    <div className="p-3">
                                                        <h4 className="text-base font-semibold text-slate-800 mb-1 line-clamp-1">
                                                            {story.title}
                                                        </h4>
                                                        {story.subtitle && (
                                                            <p className="text-sm text-slate-600 line-clamp-2 mb-1">
                                                                {stripHtml(story.subtitle)}
                                                            </p>
                                                        )}
                                                        {story.author && (
                                                            <p className="text-xs text-slate-500">
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
