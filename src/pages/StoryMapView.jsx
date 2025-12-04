import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import MapBackground from '@/components/storymap/MapContainer';
import StoryChapter from '@/components/storymap/StoryChapter';
import ChapterNavigation from '@/components/storymap/ChapterNavigation';
import StoryHeader from '@/components/storymap/StoryHeader';
import StoryFooter from '@/components/storymap/StoryFooter';
import MapSearchBar from '@/components/storymap/MapSearchBar';
import BottomMenuBar from '@/components/storymap/BottomMenuBar';
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
        zoom: 12,
        mapStyle: 'light'
    });
    const [isChapterMenuOpen, setIsChapterMenuOpen] = useState(false);
    
    const chapterRefs = useRef([]);

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

            // Set initial map config
            if (chaptersWithSlides.length > 0) {
                const first = chaptersWithSlides[0];
                setMapConfig({
                    center: first.coordinates || [0, 0],
                    zoom: first.zoom || 12,
                    mapStyle: first.map_style || 'light'
                });
            }
        } catch (error) {
            console.error('Failed to load story:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.scrollY + window.innerHeight / 2;
            
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
                                mapStyle: chapter.map_style || 'light'
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
        chapterRefs.current[index]?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'center'
        });
        setActiveChapter(index);
        const chapter = chapters[index];
        if (chapter) {
            setMapConfig({
                center: chapter.coordinates || [0, 0],
                zoom: chapter.zoom || 12,
                mapStyle: chapter.map_style || 'light'
            });
        }
    };

    // Build markers from chapters
    const markers = useMemo(() => {
        return chapters.map(chapter => ({
            coordinates: chapter.coordinates || [0, 0],
            title: chapter.slides?.[0]?.title || 'Chapter',
            location: chapter.slides?.[0]?.location || '',
            description: chapter.slides?.[0]?.description || '',
            image: chapter.slides?.[0]?.image || ''
        }));
    }, [chapters]);

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
        <div className="relative">
            {/* Fixed Title */}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
                <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-slate-200/50 px-6 py-3">
                    <h1 className="text-lg font-semibold text-slate-800 tracking-wide">{story.title}</h1>
                </div>
            </div>

            {/* Search Bar */}
            <MapSearchBar 
                chapters={chapters} 
                onLocationSelect={navigateToChapter} 
            />

            {/* Map Background */}
            <MapBackground 
                center={mapConfig.center}
                zoom={mapConfig.zoom}
                mapStyle={mapConfig.mapStyle}
                markers={markers}
                activeMarkerIndex={activeChapter}
                onMarkerClick={navigateToChapter}
            />
            
            {/* Story Content */}
            <div className="relative z-10">
                {/* Header */}
                <StoryHeader 
                    title={story.title}
                    subtitle={story.subtitle}
                    author={story.author}
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
                        />
                    </div>
                ))}
                
                {/* Footer */}
                <StoryFooter onRestart={scrollToTop} />
            </div>
            
            {/* Chapters Button */}
                            {chapters.length > 0 && (
                                <button
                                    onClick={() => setIsChapterMenuOpen(!isChapterMenuOpen)}
                                    className="fixed left-6 top-1/2 -translate-y-1/2 z-40 bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-slate-200/50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors hidden md:block"
                                >
                                    Chapters
                                </button>
                            )}

                            {/* Navigation */}
                            {chapters.length > 0 && isChapterMenuOpen && (
                                <ChapterNavigation 
                                    chapters={chapters}
                                    activeIndex={activeChapter}
                                    onNavigate={(index) => {
                                        navigateToChapter(index);
                                        setIsChapterMenuOpen(false);
                                    }}
                                />
                            )}
            
            {/* Bottom Menu Bar */}
            <BottomMenuBar />
            </div>
            );
}