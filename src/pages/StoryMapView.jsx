import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import MapBackground from '@/components/storymap/MapContainer';
import StoryChapter from '@/components/storymap/StoryChapter';
import ChapterNavigation from '@/components/storymap/ChapterNavigation';
import StoryHeader from '@/components/storymap/StoryHeader';
import StoryFooter from '@/components/storymap/StoryFooter';
import StoryMapBanner from '@/components/storymap/StoryMapBanner';
import ChapterProgress from '@/components/storymap/ChapterProgress';
import FloatingStorySlideshow from '@/components/storymap/FloatingStorySlideshow';
import FloatingNavButtons from '@/components/storymap/FloatingNavButtons';
import { Loader2 } from 'lucide-react';

export default function StoryMapView() {
    const urlParams = new URLSearchParams(window.location.search);
    const storyId = urlParams.get('id');

    const [story, setStory] = useState(null);
    const [chapters, setChapters] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeChapter, setActiveChapter] = useState(0);
    const [mapConfig, setMapConfig] = useState({
        center: [0, 0],
        zoom: 2,
        mapStyle: 'light',
        shouldRotate: false,
        flyDuration: 12
    });
    const [isChapterMenuOpen, setIsChapterMenuOpen] = useState(false);
    const [isBannerVisible, setIsBannerVisible] = useState(false);
    const [isStorySlideshowOpen, setIsStorySlideshowOpen] = useState(false);
    
    const chapterRefs = useRef([]);
    const containerRef = useRef(null);

    useEffect(() => {
        loadStory();
    }, [storyId]);

    const loadStory = async () => {
        if (!storyId) {
            setIsLoading(false);
            return;
        }

        try {
            const [storyData, chaptersData, slidesData] = await Promise.all([
                base44.entities.Story.filter({ id: storyId }),
                base44.entities.Chapter.filter({ story_id: storyId }, 'order'),
                base44.entities.Slide.list('order')
            ]);

            if (storyData.length > 0) {
                setStory(storyData[0]);
            }

            // Attach slides to chapters
            const chapterIds = chaptersData.map(c => c.id);
            const relevantSlides = slidesData.filter(s => chapterIds.includes(s.chapter_id));
            
            const chaptersWithSlides = chaptersData.map(chapter => ({
                ...chapter,
                slides: relevantSlides
                    .filter(s => s.chapter_id === chapter.id)
                    .sort((a, b) => a.order - b.order)
                    .map(s => ({
                        image: s.image,
                        title: s.title,
                        description: s.description,
                        location: s.location
                    }))
            }));

            setChapters(chaptersWithSlides);

            // Animate to first chapter after a brief delay
            if (chaptersWithSlides.length > 0) {
                setTimeout(() => {
                    const first = chaptersWithSlides[0];
                    setMapConfig({
                        center: first.coordinates || [0, 0],
                        zoom: first.zoom || 12,
                        bearing: first.bearing || 0,
                        pitch: first.pitch || 0,
                        mapStyle: first.map_style || 'light',
                        shouldRotate: true,
                        flyDuration: first.fly_duration || 12
                    });
                }, 3000);
            }
        } catch (error) {
            console.error('Failed to load story:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (chapters.length === 0) return;

        const handleScroll = () => {
            const scrollPosition = window.scrollY + window.innerHeight / 2;
            
            // Show banner once we've scrolled past the header (first screen)
            const headerHeight = window.innerHeight;
            setIsBannerVisible(window.scrollY > headerHeight * 0.5);

            chapterRefs.current.forEach((ref, index) => {
                if (ref) {
                    const rect = ref.getBoundingClientRect();
                    const elementTop = rect.top + window.scrollY;
                    const elementBottom = elementTop + rect.height;
                    
                    if (scrollPosition >= elementTop && scrollPosition < elementBottom) {
                        if (activeChapter !== index) {
                            setActiveChapter(index);
                            const chapter = chapters[index];
                            setMapConfig({
                                center: chapter.coordinates || [0, 0],
                                zoom: chapter.zoom || 12,
                                bearing: chapter.bearing || 0,
                                pitch: chapter.pitch || 0,
                                mapStyle: chapter.map_style || 'light',
                                shouldRotate: true,
                                flyDuration: chapter.fly_duration || 12
                            });
                        }
                    }
                }
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [activeChapter, chapters]);

    const navigateToChapter = (index) => {
        const element = chapterRefs.current[index];
        if (!element) return;
        
        const elementRect = element.getBoundingClientRect();
        const absoluteElementTop = elementRect.top + window.scrollY;
        const targetPosition = absoluteElementTop - (window.innerHeight / 2) + (elementRect.height / 2);
        
        const startPosition = window.scrollY;
        const distance = targetPosition - startPosition;
        const duration = 2000;
        let startTime = null;
        
        const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        
        const animateScroll = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeInOutCubic(progress);
            
            window.scrollTo(0, startPosition + (distance * easedProgress));
            
            if (progress < 1) {
                requestAnimationFrame(animateScroll);
            }
        };
        
        requestAnimationFrame(animateScroll);
    };



    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            </div>
        );
    }

    if (!story) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <p className="text-slate-500">Story not found</p>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="relative">
            {/* Top Banner */}
            <StoryMapBanner
                isVisible={isBannerVisible}
                storyTitle={story.title}
            />

            {/* Floating Navigation Buttons */}
            <FloatingNavButtons
                isChapterMenuOpen={isChapterMenuOpen}
                onToggleChapterMenu={() => setIsChapterMenuOpen(!isChapterMenuOpen)}
                hasChapters={chapters.length > 0}
                isVisible={isBannerVisible}
                onViewOtherStories={() => setIsStorySlideshowOpen(true)}
            />

            {/* Map Background */}
            <MapBackground
                center={mapConfig.center}
                zoom={mapConfig.zoom}
                bearing={mapConfig.bearing}
                pitch={mapConfig.pitch}
                mapStyle={mapConfig.mapStyle}
                shouldRotate={mapConfig.shouldRotate}
                flyDuration={mapConfig.flyDuration}
            />
            
            {/* Story Content */}
            <div className="relative z-[60]">
                {/* Header */}
                <StoryHeader
                    title={story.title}
                    subtitle={story.subtitle}
                    author={story.author}
                    heroImage={story.hero_image}
                    onExplore={() => navigateToChapter(0)}
                />
                
                {/* Chapters */}
                {chapters.map((chapter, index) => (
                    <div 
                        key={chapter.id}
                        ref={el => chapterRefs.current[index] = el}
                    >
                        <StoryChapter
                            chapter={chapter}
                            isActive={activeChapter === index}
                            alignment={chapter.alignment}
                            index={index}
                            delay={index === 0 ? 3000 : 0}
                            onSlideChange={(slide) => {
                                if (slide.coordinates && 
                                    Array.isArray(slide.coordinates) && 
                                    slide.coordinates.length === 2 &&
                                    !isNaN(slide.coordinates[0]) && 
                                    !isNaN(slide.coordinates[1])) {
                                    setMapConfig({
                                        center: slide.coordinates,
                                        zoom: slide.zoom || chapter.zoom || 12,
                                        bearing: slide.bearing || 0,
                                        pitch: slide.pitch || 0,
                                        mapStyle: chapter.map_style || 'light',
                                        shouldRotate: false,
                                        flyDuration: slide.fly_duration !== undefined ? slide.fly_duration : chapter.fly_duration || 12
                                    });
                                }
                            }}
                        />
                    </div>
                ))}
                
                {/* Footer */}
                <StoryFooter onRestart={scrollToTop} />
            </div>
            
            {/* Chapter Navigation */}
            <ChapterNavigation
                chapters={chapters}
                activeIndex={activeChapter}
                isOpen={isChapterMenuOpen}
                onNavigate={(index) => {
                    navigateToChapter(index);
                    setIsChapterMenuOpen(false);
                }}
            />

            {/* Chapter Progress Indicator */}
            {isBannerVisible && chapters.length > 0 && (
                <ChapterProgress
                    totalChapters={chapters.length}
                    activeIndex={activeChapter}
                    onNavigate={navigateToChapter}
                />
            )}

            {/* Floating Story Slideshow */}
            <FloatingStorySlideshow
                isOpen={isStorySlideshowOpen}
                onClose={() => setIsStorySlideshowOpen(false)}
                currentStoryId={storyId}
            />
            </div>
            );
            }