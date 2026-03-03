import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import MapBackground from '@/components/storymap/MapContainer';
import StoryChapter from '@/components/storymap/StoryChapter';
import ChapterNavigation from '@/components/storymap/ChapterNavigation';
import StoryHeader from '@/components/storymap/StoryHeader';
import StoryFooter from '@/components/storymap/StoryFooter';
import StoryMapBanner from '@/components/storymap/StoryMapBanner';
import ChapterProgress from '@/components/storymap/ChapterProgress';
import FloatingNavButtons from '@/components/storymap/FloatingNavButtons';
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
    bearing: 0,
    pitch: 0,
    mapStyle: 'light'
  });
  const [isChapterMenuOpen, setIsChapterMenuOpen] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const chapterRefs = useRef([]);
  const containerRef = useRef(null);

  useEffect(() => {
    loadMainStory();
  }, []);

  const loadMainStory = async () => {
    try {
      const { data: stories, error: storyErr } = await supabase
        .from('stories')
        .select('*')
        .eq('is_main_story', true)
        .limit(1);

      if (storyErr) throw storyErr;

      if (stories.length > 0) {
        const mainStory = stories[0];
        setStory(mainStory);

        const { data: chaptersData, error: chapErr } = await supabase
          .from('chapters')
          .select('*')
          .eq('story_id', mainStory.id)
          .order('order');

        if (chapErr) throw chapErr;

        const chapterIds = chaptersData.map(c => c.id);

        const { data: relevantSlides, error: slideErr } = await supabase
          .from('slides')
          .select('*')
          .in('chapter_id', chapterIds)
          .order('order');

        if (slideErr) throw slideErr;

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
              pitch: s.pitch
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
            {/* Top Banner */}
            <StoryMapBanner
                isVisible={isBannerVisible}
            />

            {/* Floating Navigation Buttons */}
            <FloatingNavButtons
                isChapterMenuOpen={isChapterMenuOpen}
                onToggleChapterMenu={() => setIsChapterMenuOpen(!isChapterMenuOpen)}
                hasChapters={chapters.length > 0}
                isVisible={isBannerVisible}
                storyId={story?.id ?? null}
            />

            {/* Map Background */}
            <MapBackground
        center={mapConfig.center}
        zoom={mapConfig.zoom}
        bearing={mapConfig.bearing}
        pitch={mapConfig.pitch}
        mapStyle={mapConfig.mapStyle} />

            
            {/* Story Content */}
            <div className="relative z-[60]">
                {/* Header */}
                <StoryHeader
                title={story.title}
                subtitle={story.subtitle}
                author={story.author}
                heroImage={story.hero_image}
                heroVideo={story.hero_video}
                heroType={story.hero_type}
                onExplore={() => navigateToChapter(0)} />

                
                {/* Chapters */}
                <div className="pt-20" />
                {chapters.map((chapter, index) =>
                <div
                key={chapter.id}
                ref={(el) => chapterRefs.current[index] = el}>

                            <StoryChapter
                        chapter={chapter}
                        isActive={activeChapter === index}
                        alignment={chapter.alignment}
                        index={index}
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
                            mapStyle: chapter.map_style || 'light'
                        });
                        }
                        }} />

                    </div>
        )}
                
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
        </div>);

}