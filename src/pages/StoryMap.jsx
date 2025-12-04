import React, { useState, useEffect, useRef } from 'react';
import MapBackground from '@/components/storymap/MapContainer';
import StoryChapter from '@/components/storymap/StoryChapter';
import ChapterNavigation from '@/components/storymap/ChapterNavigation';
import StoryHeader from '@/components/storymap/StoryHeader';
import StoryFooter from '@/components/storymap/StoryFooter';
import BottomMenuBar from '@/components/storymap/BottomMenuBar';
import { defaultStory } from '@/components/storymap/storyData';

export default function StoryMap() {
    const [activeChapter, setActiveChapter] = useState(0);
    const [mapConfig, setMapConfig] = useState({
        center: defaultStory.chapters[0].coordinates,
        zoom: defaultStory.chapters[0].zoom,
        mapStyle: defaultStory.chapters[0].mapStyle
    });
    const chapterRefs = useRef([]);
    const containerRef = useRef(null);

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
                            const chapter = defaultStory.chapters[index];
                            setMapConfig({
                                center: chapter.coordinates,
                                zoom: chapter.zoom,
                                mapStyle: chapter.mapStyle
                            });
                        }
                    }
                }
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [activeChapter]);

    const navigateToChapter = (index) => {
        chapterRefs.current[index]?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'center'
        });
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div ref={containerRef} className="relative">
            {/* Fixed Title */}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
                <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-slate-200/50 px-6 py-3">
                    <h1 className="text-lg font-semibold text-slate-800 tracking-wide">A Storymap</h1>
                </div>
            </div>

            {/* Map Background */}
            <MapBackground 
                center={mapConfig.center}
                zoom={mapConfig.zoom}
                mapStyle={mapConfig.mapStyle}
            />
            
            {/* Story Content */}
            <div className="relative z-10">
                {/* Header */}
                <StoryHeader 
                    title={defaultStory.title}
                    subtitle={defaultStory.subtitle}
                    author={defaultStory.author}
                />
                
                {/* Chapters */}
                {defaultStory.chapters.map((chapter, index) => (
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
            
            {/* Navigation */}
            <ChapterNavigation 
                chapters={defaultStory.chapters}
                activeIndex={activeChapter}
                onNavigate={navigateToChapter}
            />
            
            {/* Bottom Menu Bar */}
            <BottomMenuBar />
        </div>
    );
}