import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StoryHeader from '@/components/storymap/StoryHeader';
import StoryMapBanner from '@/components/storymap/StoryMapBanner';
import FloatingNavButtons from '@/components/storymap/FloatingNavButtons';
import CategoryFilter from '@/components/storymap/CategoryFilter';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loader2, ChevronDown } from 'lucide-react';

const MAPBOX_STYLE = 'mapbox://styles/stevebutton/clummsfw1002701mpbiw3exg7';
const MAPBOX_TOKEN = 'pk.eyJ1Ijoic3RldmVidXR0b24iLCJhIjoiNEw1T183USJ9.Sv_1qSC23JdXot8YIRPi8A';

mapboxgl.accessToken = MAPBOX_TOKEN;

export default function ProjectInterface() {
  const navigate = useNavigate();
  const [mainStory, setMainStory] = useState(null);
  const [allStories, setAllStories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const lines = useRef([]);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [isOtherStoriesOpen, setIsOtherStoriesOpen] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [stories, chapters] = await Promise.all([
        base44.entities.Story.filter({ is_published: true }),
        base44.entities.Chapter.list('order')
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

      // Extract unique categories
      const uniqueCategories = [...new Set(storiesWithCoords.map(s => s.category).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (allStories.length === 0 || !mapContainer.current) return;
    if (map.current) return;

    initializeMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [allStories]);

  useEffect(() => {
    if (map.current && mapInitialized) {
      addMarkers();
    }
  }, [selectedCategory]);

  useEffect(() => {
    const handleScroll = () => {
      const heroHeight = window.innerHeight;
      setIsBannerVisible(window.scrollY > heroHeight * 0.5);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const initializeMap = () => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAPBOX_STYLE,
      center: [0, 0],
      zoom: 2
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-left');

    map.current.on('load', () => {
      if (allStories.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        allStories.forEach(story => {
          if (story.coordinates) {
            bounds.extend([story.coordinates[1], story.coordinates[0]]);
          }
        });

        map.current.fitBounds(bounds, {
          padding: { top: 100, bottom: 100, left: 100, right: 100 },
          maxZoom: 12,
          duration: 2000
        });
      }

      addMarkers();
      setMapInitialized(true);
    });
  };

  const addMarkers = () => {
    if (!map.current || allStories.length === 0) return;

    // Fade out existing markers and lines
    markers.current.forEach(marker => {
      const el = marker.getElement();
      el.style.transition = 'opacity 500ms ease-out';
      el.style.opacity = '0';
    });
    lines.current.forEach(line => {
      line.style.transition = 'opacity 500ms ease-out';
      line.style.opacity = '0';
    });

    // Remove markers and lines after fade out
    setTimeout(() => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      lines.current.forEach(line => line.remove());
      lines.current = [];

      let initialZoom = map.current.getZoom();
      let initialCenter = map.current.getCenter();

      const filteredStories = selectedCategory === 'all' 
        ? allStories 
        : allStories.filter(s => s.category === selectedCategory);

      filteredStories.forEach((story) => {
        createMarker(story, initialZoom, initialCenter);
      });
    }, 500);
  };

  const createMarker = (story, initialZoom, initialCenter) => {
      if (!story.coordinates) return;

      const el = document.createElement('div');
      el.style.cssText = `
        width: 240px;
        height: 135px;
      `;

      const inner = document.createElement('div');
      inner.className = 'story-marker-inner';
      inner.style.cssText = `
        width: 100%;
        height: 100%;
        border-radius: 12px;
        overflow: hidden;
        cursor: pointer;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
        background: linear-gradient(135deg, #d97706 0%, #ea580c 100%);
        transform: translate(-50%, -50%);
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
      `;

      if (story.hero_image) {
        inner.style.backgroundImage = `url(${story.hero_image})`;
        inner.style.backgroundSize = 'cover';
        inner.style.backgroundPosition = 'center';
      }

      const titleOverlay = document.createElement('div');
      titleOverlay.style.cssText = `
        background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 100%);
        padding: 8px 12px;
        color: white;
        font-size: 16px;
        font-weight: 500;
        text-shadow: 0 1px 3px rgba(0,0,0,0.8);
        line-height: 1.05;
        text-align: left;
        max-height: 60%;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        margin-top: auto;
      `;
      titleOverlay.textContent = story.title;
      inner.appendChild(titleOverlay);

      el.addEventListener('mouseenter', () => {
        initialZoom = map.current.getZoom();
        initialCenter = map.current.getCenter();
        
        inner.style.transform = 'translate(-50%, -50%) scale(1.15)';
        inner.style.zIndex = '1000';
        inner.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
        
        const newZoom = initialZoom * 1.25;
        map.current.flyTo({
          center: [story.coordinates[1], story.coordinates[0]],
          zoom: newZoom,
          duration: 800,
          easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        });
      });

      el.addEventListener('mouseleave', () => {
        inner.style.transform = 'translate(-50%, -50%) scale(1)';
        inner.style.zIndex = 'auto';
        inner.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        
        map.current.flyTo({
          center: initialCenter,
          zoom: initialZoom,
          duration: 800,
          easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        });
      });

      el.appendChild(inner);

      el.addEventListener('click', () => {
        navigate(`${createPageUrl('StoryMapView')}?id=${story.id}`);
      });

      const popupContent = `
        <div style="min-width: 250px; font-family: system-ui, sans-serif;">
          ${story.hero_image ? `
            <img 
              src="${story.hero_image}" 
              alt="${story.title}" 
              style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px; margin-bottom: 12px;" 
            />
          ` : ''}
          <h3 style="font-weight: 600; color: #1e293b; margin: 0 0 6px 0; font-size: 16px;">${story.title}</h3>
          ${story.subtitle ? `
            <p style="font-size: 13px; color: #64748b; margin: 0 0 8px 0; line-height: 1.4;">${story.subtitle}</p>
          ` : ''}
          ${story.author ? `
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">By ${story.author}</p>
          ` : ''}
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
            <div style="display: inline-block; padding: 6px 12px; background: #d97706; color: white; border-radius: 6px; font-size: 12px; font-weight: 500;">
              View Story →
            </div>
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({ 
        offset: 85,
        closeButton: false,
        maxWidth: '300px'
      }).setHTML(popupContent);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([story.coordinates[1], story.coordinates[0]])
        .setPopup(popup)
        .addTo(map.current);

      // Create dotted line connecting marker to location
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
      `;
      
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('stroke', 'rgba(255, 255, 255, 0.6)');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('stroke-dasharray', '5,5');
      svg.appendChild(line);
      
      mapContainer.current.appendChild(svg);
      lines.current.push(svg);

      // Function to update line position
      const updateLine = () => {
        const markerPos = map.current.project([story.coordinates[1], story.coordinates[0]]);
        const markerElement = el.getBoundingClientRect();
        const mapRect = mapContainer.current.getBoundingClientRect();
        
        // Calculate marker center (accounting for the transform offset)
        const markerCenterX = markerElement.left - mapRect.left + markerElement.width / 2;
        const markerCenterY = markerElement.top - mapRect.top + markerElement.height / 2;
        
        line.setAttribute('x1', markerCenterX);
        line.setAttribute('y1', markerCenterY);
        line.setAttribute('x2', markerPos.x);
        line.setAttribute('y2', markerPos.y);
      };

      // Update line on map move
      map.current.on('move', updateLine);
      map.current.on('zoom', updateLine);
      
      // Initial line position
      setTimeout(updateLine, 50);

      // Fade in new marker and line
      el.style.opacity = '0';
      svg.style.opacity = '0';
      el.style.transition = 'opacity 500ms ease-in';
      svg.style.transition = 'opacity 500ms ease-in';
      setTimeout(() => {
        el.style.opacity = '1';
        svg.style.opacity = '1';
      }, 10);

      markers.current.push(marker);
  };

  const scrollToMap = () => {
    const mapSection = document.getElementById('map-section');
    if (mapSection) {
      mapSection.scrollIntoView({ behavior: 'smooth' });
    }
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
      {/* Hero Section - StoryMap Opening */}
      <div className="relative h-screen">
        <StoryHeader
          title={mainStory.title}
          subtitle={mainStory.subtitle}
          author={mainStory.author}
          heroImage={mainStory.hero_image}
          heroVideo={mainStory.hero_video}
          heroType={mainStory.hero_type}
          onExplore={scrollToMap}
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

      {/* Map Section - StoriesMap */}
      <div id="map-section" className="relative h-screen w-full flex items-center justify-center">
        <StoryMapBanner isVisible={isBannerVisible} />
        
        <FloatingNavButtons
          isChapterMenuOpen={isOtherStoriesOpen}
          onToggleChapterMenu={() => setIsOtherStoriesOpen(!isOtherStoriesOpen)}
          hasChapters={false}
          isVisible={isBannerVisible}
        />

        <div ref={mapContainer} className="h-[80vh] w-full" />

        {categories.length > 0 && (
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        )}

        {allStories.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <p className="text-slate-600 text-lg">No published stories available</p>
          </div>
        )}
      </div>

      <style>{`
        .mapboxgl-popup-content {
          padding: 16px !important;
          border-radius: 12px !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.2) !important;
        }
        .mapboxgl-popup-tip {
          display: none !important;
        }
      `}</style>
    </div>
  );
}