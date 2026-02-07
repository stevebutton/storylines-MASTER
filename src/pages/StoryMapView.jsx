import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import MapBackground from '@/components/storymap/MapContainer';
import StoryChapter from '@/components/storymap/StoryChapter';
import ChapterNavigation from '@/components/storymap/ChapterNavigation';
import StoryHeader from '@/components/storymap/StoryHeader';
import StoryFooter from '@/components/storymap/StoryFooter';
import StoryMapBanner from '@/components/storymap/StoryMapBanner';
import ChapterProgress from '@/components/storymap/ChapterProgress';
import FloatingStorySlideshow from '@/components/storymap/FloatingStorySlideshow';
import FloatingNavButtons from '@/components/storymap/FloatingNavButtons';
import DocumentManagerContent from '@/components/documents/DocumentManagerContent';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [clearRoute, setClearRoute] = useState(false);
    const previousChapterRef = useRef(-1);
    const [isChapterMenuOpen, setIsChapterMenuOpen] = useState(false);
    const [isBannerVisible, setIsBannerVisible] = useState(false);
    const [isStorySlideshowOpen, setIsStorySlideshowOpen] = useState(false);
    const [showLibraryModal, setShowLibraryModal] = useState(false);
    const [heroMediaLoaded, setHeroMediaLoaded] = useState(false);
    const [showBlackOverlay, setShowBlackOverlay] = useState(true);
    const [hasExplored, setHasExplored] = useState(false);
    
    const chapterRefs = useRef([]);
    const containerRef = useRef(null);

    useEffect(() => {
        loadStory();
    }, [storyId]);

    // Update og:image meta tag for social media sharing
    useEffect(() => {
        if (story && story.hero_image) {
            // Update or create og:image meta tag
            let ogImage = document.querySelector('meta[property="og:image"]');
            if (!ogImage) {
                ogImage = document.createElement('meta');
                ogImage.setAttribute('property', 'og:image');
                document.head.appendChild(ogImage);
            }
            ogImage.setAttribute('content', story.hero_image);

            // Also set og:title
            let ogTitle = document.querySelector('meta[property="og:title"]');
            if (!ogTitle) {
                ogTitle = document.createElement('meta');
                ogTitle.setAttribute('property', 'og:title');
                document.head.appendChild(ogTitle);
            }
            ogTitle.setAttribute('content', story.title);

            // And og:description
            let ogDescription = document.querySelector('meta[property="og:description"]');
            if (!ogDescription) {
                ogDescription = document.createElement('meta');
                ogDescription.setAttribute('property', 'og:description');
                document.head.appendChild(ogDescription);
            }
            ogDescription.setAttribute('content', story.subtitle || story.title);

            // Twitter card meta tags
            let twitterCard = document.querySelector('meta[name="twitter:card"]');
            if (!twitterCard) {
                twitterCard = document.createElement('meta');
                twitterCard.setAttribute('name', 'twitter:card');
                document.head.appendChild(twitterCard);
            }
            twitterCard.setAttribute('content', 'summary_large_image');

            let twitterImage = document.querySelector('meta[name="twitter:image"]');
            if (!twitterImage) {
                twitterImage = document.createElement('meta');
                twitterImage.setAttribute('name', 'twitter:image');
                document.head.appendChild(twitterImage);
            }
            twitterImage.setAttribute('content', story.hero_image);
        }
    }, [story]);

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
                        location: s.location,
                        coordinates: s.coordinates,
                        zoom: s.zoom,
                        bearing: s.bearing,
                        pitch: s.pitch,
                        fly_duration: s.fly_duration,
                        pdf_url: s.pdf_url,
                        video_url: s.video_url,
                        video_thumbnail_url: s.video_thumbnail_url
                    }))
            }));

            setChapters(chaptersWithSlides);
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
                            // Check if we're moving to a new chapter
                            if (previousChapterRef.current !== -1 && previousChapterRef.current !== index) {
                                // Clear route when moving to a new chapter
                                setClearRoute(true);
                                setRouteCoordinates([]);
                                setTimeout(() => setClearRoute(false), 100);
                            }
                            
                            previousChapterRef.current = index;
                            setActiveChapter(index);
                            const chapter = chapters[index];
                            
                            // Initialize route with chapter coordinates
                            if (chapter.coordinates) {
                                setRouteCoordinates([chapter.coordinates]);
                            }
                            
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
            {/* Black Overlay - Fades out when hero loads */}
            <AnimatePresence>
                {showBlackOverlay && (
                    <motion.div
                        className="fixed inset-0 bg-black z-[50] pointer-events-none"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                )}
            </AnimatePresence>

            {/* Top Banner */}
            <div className="pointer-events-auto">
            <StoryMapBanner
                isVisible={isBannerVisible}
                storyTitle={story.title}
                hasExplored={hasExplored}
                storyId={storyId}
                isShareable={story.is_shareable}
            />
            </div>

            {/* Floating Navigation Buttons */}
            <div className="pointer-events-auto">
            <FloatingNavButtons
                isChapterMenuOpen={isChapterMenuOpen}
                onToggleChapterMenu={() => setIsChapterMenuOpen(!isChapterMenuOpen)}
                hasChapters={chapters.length > 0}
                isVisible={isBannerVisible}
                onViewOtherStories={() => setIsStorySlideshowOpen(true)}
                onOpenLibrary={() => setShowLibraryModal(true)}
            />
            </div>

            {/* Map Background */}
            <MapBackground
                center={mapConfig.center}
                zoom={mapConfig.zoom}
                bearing={mapConfig.bearing}
                pitch={mapConfig.pitch}
                mapStyle={mapConfig.mapStyle}
                shouldRotate={mapConfig.shouldRotate}
                flyDuration={mapConfig.flyDuration}
                routeCoordinates={routeCoordinates}
                clearRoute={clearRoute}
            />
            
            {/* Story Content */}
            <div className="relative z-[60] pointer-events-none">
                {/* Header */}
                <div className="pointer-events-auto">
                <StoryHeader
                    title={story.title}
                    subtitle={story.subtitle}
                    author={story.author}
                    heroImage={story.hero_image}
                    heroVideo={story.hero_video}
                    heroType={story.hero_type}
                    heroVideoLoop={story.hero_video_loop}
                    onExplore={() => {
                        setHasExplored(true);
                        navigateToChapter(0);
                        
                        // Animate to first chapter
                        if (chapters.length > 0) {
                            const first = chapters[0];
                            setMapConfig({
                                center: first.coordinates || [0, 0],
                                zoom: first.zoom || 12,
                                bearing: first.bearing || 0,
                                pitch: first.pitch || 0,
                                mapStyle: first.map_style || 'light',
                                shouldRotate: true,
                                flyDuration: first.fly_duration || 12
                            });
                        }
                    }}
                    onHeroLoaded={() => {
                        setHeroMediaLoaded(true);
                        setTimeout(() => setShowBlackOverlay(false), 6000);
                    }}
                />
                </div>
                
                {/* Chapters */}
                {chapters.map((chapter, index) => (
                    <div 
                        key={chapter.id}
                        ref={el => chapterRefs.current[index] = el}
                        className="pointer-events-auto"
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
                                    // Add slide coordinates to route
                                    setRouteCoordinates(prev => {
                                        const lastCoord = prev[prev.length - 1];
                                        // Only add if it's different from the last coordinate
                                        if (!lastCoord || 
                                            lastCoord[0] !== slide.coordinates[0] || 
                                            lastCoord[1] !== slide.coordinates[1]) {
                                            return [...prev, slide.coordinates];
                                        }
                                        return prev;
                                    });
                                    
                                    setMapConfig({
                                        center: slide.coordinates,
                                        zoom: slide.zoom !== undefined ? slide.zoom : (chapter.zoom || 12),
                                        bearing: slide.bearing !== undefined ? slide.bearing : 0,
                                        pitch: slide.pitch !== undefined ? slide.pitch : 0,
                                        mapStyle: chapter.map_style || 'light',
                                        shouldRotate: false,
                                        flyDuration: slide.fly_duration !== undefined ? slide.fly_duration : (chapter.fly_duration || 12)
                                    });
                                }
                            }}
                        />
                    </div>
                ))}
                
                {/* Footer */}
                <div className="pointer-events-auto">
                <StoryFooter onRestart={scrollToTop} />
                </div>
            </div>
            
            {/* Chapter Navigation */}
            <div className="pointer-events-auto">
            <ChapterNavigation
                chapters={chapters}
                activeIndex={activeChapter}
                isOpen={isChapterMenuOpen}
                onNavigate={(index) => {
                    navigateToChapter(index);
                    setIsChapterMenuOpen(false);
                }}
            />
            </div>

            {/* Chapter Progress Indicator */}
            {isBannerVisible && chapters.length > 0 && (
                <div className="pointer-events-auto">
                <ChapterProgress
                    totalChapters={chapters.length}
                    activeIndex={activeChapter}
                    onNavigate={navigateToChapter}
                />
                </div>
            )}

            {/* Floating Story Slideshow */}
            <div className="pointer-events-auto">
            <FloatingStorySlideshow
                isOpen={isStorySlideshowOpen}
                onClose={() => setIsStorySlideshowOpen(false)}
                currentStoryId={storyId}
            />
            </div>

            {/* Document Library Modal */}
            <Dialog open={showLibraryModal} onOpenChange={setShowLibraryModal}>
                <DialogContent className="max-w-6xl h-[80vh] z-[100000]">
                    <DialogHeader>
                        <DialogTitle>Document Library</DialogTitle>
                    </DialogHeader>
                    <DocumentManagerContent />
                </DialogContent>
            </Dialog>
            </div>
            );
            }