import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StoryHeader from '@/components/storymap/StoryHeader';
import StoryMapBanner from '@/components/storymap/StoryMapBanner';
import FloatingNavButtons from '@/components/storymap/FloatingNavButtons';
import WhatIsStorylinesPanel from '@/components/storymap/WhatIsStorylinesPanel';
import InteractiveStoryMap from '@/components/storymap/InteractiveStoryMap';
import DocumentManagerContent from '@/components/documents/DocumentManagerContent';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, ChevronDown } from 'lucide-react';

export default function ProjectInterface() {
  const navigate = useNavigate();
  const [mainStory, setMainStory] = useState(null);
  const [allStories, setAllStories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageSections, setPageSections] = useState([]);
  const [isOtherStoriesOpen, setIsOtherStoriesOpen] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [isMapSectionVisible, setIsMapSectionVisible] = useState(false);
  const [showStorylinesPanel, setShowStorylinesPanel] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [stories, chapters, sections] = await Promise.all([
        base44.entities.Story.filter({ is_published: true }),
        base44.entities.Chapter.list('order'),
        base44.entities.HomePageSection.filter({ pageName: 'ProjectInterface' }, 'order')
      ]);

      const mainStoryData = stories.find(s => s.is_main_story);
      setMainStory(mainStoryData);

      // Attach coordinates to all stories
      const storiesWithCoords = stories.map(story => {
        const storyChapters = chapters.filter(c => c.story_id === story.id);
        const firstChapterWithCoords = storyChapters.find(c => c.coordinates && c.coordinates.length === 2);
        
        return {
          ...story,
          coordinates: story.coordinates || firstChapterWithCoords?.coordinates || null
        };
      }).filter(s => s.coordinates);

      setAllStories(storiesWithCoords);
      setPageSections(sections);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const heroHeight = window.innerHeight;
      setIsBannerVisible(window.scrollY > heroHeight * 0.5);

      const mapSection = document.getElementById('map-section');
      if (mapSection) {
        const rect = mapSection.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        setIsMapSectionVisible(isVisible);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToMap = () => {
    const wasOpen = showStorylinesPanel;
    setShowStorylinesPanel(false);

    const performScroll = () => {
      const mapSection = document.getElementById('map-section');
      if (!mapSection) return;

      const targetPosition = mapSection.getBoundingClientRect().top + window.scrollY;
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

    if (wasOpen) {
      setTimeout(performScroll, 1000);
    } else {
      performScroll();
    }
  };

  const scrollToTop = () => {
    const startPosition = window.scrollY;
    const duration = 2000;
    let startTime = null;
    
    const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    
    const animateScroll = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);
      
      window.scrollTo(0, startPosition - (startPosition * easedProgress));
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };
    
    requestAnimationFrame(animateScroll);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!mainStory) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-600">No main story set yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Storylines Logo - Fixed Position */}
      <Link to={createPageUrl('ProjectInterface')} className="fixed left-[65px] top-[40px] z-[120]">
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/f1188d1fa_storylines-frame.png" 
          alt="Storylines" 
          className="h-auto hover:opacity-80 transition-opacity cursor-pointer"
        />
      </Link>

      {/* Hero Section - StoryMap Opening */}
      <div className="relative h-screen">
        <StoryHeader
          title={mainStory.title}
          subtitle={mainStory.subtitle}
          titleImage="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/63254aa59_STORYLINES.png"
          subtitleImage="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/cf4d86142_storytellingfordevelopmentmadesimple.png"
          heroImage={mainStory.hero_image}
          heroVideo={mainStory.hero_video}
          heroType={mainStory.hero_type}
          onExplore={scrollToMap}
          onWhatIsStorylines={() => setShowStorylinesPanel(true)}
        />
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-[70] animate-bounce">
          <button 
            onClick={scrollToMap}
            className="text-white/80 hover:text-white transition-colors"
          >
            <ChevronDown className="w-8 h-8" />
          </button>
        </div>
      </div>

      {/* Dynamic Content Sections */}
      {pageSections.map((section) => (
        <div key={section.id} className="py-16 px-8 max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-800 mb-6">{section.title}</h2>
          <div className="text-lg text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: section.content }} />
          {section.image_url && (
            <img src={section.image_url} alt={section.title} className="mt-8 rounded-lg shadow-lg w-full" />
          )}
          {section.video_url && (
            <video src={section.video_url} controls className="mt-8 rounded-lg shadow-lg w-full" />
          )}
        </div>
      ))}

      {/* Map Section - StoriesMap */}
      <div id="map-section">
        <StoryMapBanner isVisible={isBannerVisible} />

        <FloatingNavButtons
          isChapterMenuOpen={isOtherStoriesOpen}
          onToggleChapterMenu={() => setIsOtherStoriesOpen(!isOtherStoriesOpen)}
          hasChapters={false}
          isVisible={isBannerVisible}
          onOpenLibrary={() => setShowLibraryModal(true)}
        />

        <InteractiveStoryMap
          stories={allStories}
          onScrollToTop={scrollToTop}
          isVisible={isMapSectionVisible}
        />
      </div>

      {/* What is Storylines Panel */}
      <WhatIsStorylinesPanel
        isOpen={showStorylinesPanel}
        onClose={() => setShowStorylinesPanel(false)}
      />

      {/* Document Library Modal */}
      {console.log('ProjectInterface: showLibraryModal state before Dialog:', showLibraryModal)}
      <Dialog open={showLibraryModal} onOpenChange={setShowLibraryModal}>
        <DialogContent className="w-[90vw] max-w-6xl h-[80vh] z-[100000]">
          <DialogHeader>
            <DialogTitle>Document Library</DialogTitle>
          </DialogHeader>
          <DocumentManagerContent />
        </DialogContent>
      </Dialog>
    </div>
  );
}