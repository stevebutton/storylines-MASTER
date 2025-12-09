import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

export default function FloatingStorySlideshow({ isOpen, onClose, currentStoryId }) {
    const [stories, setStories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [scrollPosition, setScrollPosition] = useState(0);
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
            // Filter out current story
            const otherStories = allStories.filter(s => s.id !== currentStoryId);
            setStories(otherStories);
        } catch (error) {
            console.error('Failed to load stories:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const scroll = (direction) => {
        if (!scrollContainerRef.current) return;
        const scrollAmount = 400;
        const newPosition = direction === 'left' 
            ? scrollPosition - scrollAmount 
            : scrollPosition + scrollAmount;
        
        scrollContainerRef.current.scrollTo({
            left: newPosition,
            behavior: 'smooth'
        });
        setScrollPosition(newPosition);
    };

    const handleStoryClick = (storyId) => {
        window.location.href = createPageUrl('StoryMapView') + '?id=' + storyId;
    };

    return (
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
                        className="fixed bottom-0 left-0 right-0 z-[65] bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-2xl"
                        style={{ maxHeight: '50vh' }}
                    >
                        <div className="max-w-7xl mx-auto p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-light text-slate-800">
                                    Explore Other Stories
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-600" />
                                </button>
                            </div>

                            {/* Stories Carousel */}
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
                                </div>
                            ) : stories.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    No other published stories available
                                </div>
                            ) : (
                                <div className="relative">
                                    {/* Navigation Buttons */}
                                    {stories.length > 3 && (
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

                                    {/* Stories Grid */}
                                    <div
                                        ref={scrollContainerRef}
                                        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
                                        style={{ scrollbarWidth: 'none' }}
                                    >
                                        {stories.map((story) => (
                                            <motion.div
                                                key={story.id}
                                                whileHover={{ scale: 1.02 }}
                                                className="flex-shrink-0 w-80 bg-white rounded-xl border border-slate-200 overflow-hidden cursor-pointer shadow-sm hover:shadow-lg transition-shadow"
                                                onClick={() => handleStoryClick(story.id)}
                                            >
                                                {/* Thumbnail */}
                                                {story.hero_image && (
                                                    <div className="w-full h-40 bg-slate-200 overflow-hidden">
                                                        <img
                                                            src={story.hero_image}
                                                            alt={story.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                )}

                                                {/* Content */}
                                                <div className="p-4">
                                                    <h4 className="text-lg font-semibold text-slate-800 mb-2 line-clamp-1">
                                                        {story.title}
                                                    </h4>
                                                    {story.subtitle && (
                                                        <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                                                            {story.subtitle}
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
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}