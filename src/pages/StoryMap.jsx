import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import MapBackground from '@/components/storymap/MapContainer';
import StoryChapter from '@/components/storymap/StoryChapter';
import ChapterNavigation from '@/components/storymap/ChapterNavigation';
import StoryHeader from '@/components/storymap/StoryHeader';
import StoryFooter from '@/components/storymap/StoryFooter';
import BottomMenuBar from '@/components/storymap/BottomMenuBar';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function StoryMap() {
  const [story, setStory] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeChapter, setActiveChapter] = useState(0);
  const [mapConfig, setMapConfig] = useState({
    center: [41.8902, 12.4922],
    zoom: 12,
    mapStyle: 'light'
  });
  const [isChapterMenuOpen, setIsChapterMenuOpen] = useState(false);
  const chapterRefs = useRef([]);
  const containerRef = useRef(null);

  useEffect(() => {
    loadMainStory();
  }, []);

  const loadMainStory = async () => {
    try {
      // Find the main story
      const stories = await base44.entities.Story.filter({ is_main_story: true });
      
      if (stories.length > 0) {
        const mainStory = stories[0];
        setStory(mainStory);

        // Load chapters and slides
        const [chaptersData, slidesData] = await Promise.all([
          base44.entities.Chapter.filter({ story_id: mainStory.id }, 'order'),
          base44.entities.Slide.list('order')
        ]);

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

        if (chaptersWithSlides.length > 0) {
          const first = chaptersWithSlides[0];
          setMapConfig({
            center: first.coordinates || [41.8902, 12.4922],
            zoom: first.zoom || 12,
            mapStyle: first.map_style || 'light'
          });
        }
      }
    } catch (error) {
      console.error('Failed to load main story:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (chapters.length === 0) return;

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 gap-4">
        <p className="text-slate-500">No main story set yet.</p>
        <Link 
          to={createPageUrl('Stories')}
          className="text-amber-600 hover:text-amber-700 underline"
        >
          Go to Stories to create one
        </Link>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
            {/* Fixed Title */}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
                <div className="bg-white/95 px-6 py-3 opacity-55 rounded-xl backdrop-blur-xl shadow-lg border border-slate-200/50">
                    <h1 className="text-slate-800 text-4xl font-thin tracking-wide opacity-100">mapflow</h1>
                </div>
            </div>

            {/* Map Background */}
            <MapBackground
        center={mapConfig.center}
        zoom={mapConfig.zoom}
        mapStyle={mapConfig.mapStyle} />

            
            {/* Story Content */}
            <div className="relative z-10">
                {/* Header */}
                <StoryHeader
          title={story.title}
          subtitle={story.subtitle}
          author={story.author} />

                
                {/* Chapters */}
                {chapters.map((chapter, index) =>
        <div
          key={chapter.id}
          ref={(el) => chapterRefs.current[index] = el}>

                        <StoryChapter
            chapter={chapter}
            isActive={activeChapter === index}
            alignment={chapter.alignment}
            index={index} />

                    </div>
        )}
                
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
            {isChapterMenuOpen && (
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
        </div>);

}