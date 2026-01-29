import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import CategoryFilter from '@/components/storymap/CategoryFilter';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ChevronUp } from 'lucide-react';

const MAPBOX_STYLE = 'mapbox://styles/stevebutton/clummsfw1002701mpbiw3exg7';
const MAPBOX_TOKEN = 'pk.eyJ1Ijoic3RldmVidXR0b24iLCJhIjoiNEw1T183USJ9.Sv_1qSC23JdXot8YIRPi8A';

mapboxgl.accessToken = MAPBOX_TOKEN;

export default function InteractiveStoryMap({ 
  stories = [], 
  initialCenter = [26.33845, 21.32637],
  initialZoom = 1.80,
  onScrollToTop,
  isVisible = true
}) {
  const navigate = useNavigate();
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const rotationIntervalRef = useRef(null);

  useEffect(() => {
    const uniqueCategories = [...new Set(stories.map(s => s.category).filter(Boolean))];
    setCategories(uniqueCategories);
  }, [stories]);

  useEffect(() => {
    if (stories.length === 0 || !mapContainer.current) return;
    if (map.current) return;

    initializeMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [stories]);

  useEffect(() => {
    if (map.current && mapInitialized) {
      addMarkers();
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (!map.current || !mapInitialized) return;

    const handleMapMove = () => {
      const filteredStories = selectedCategory === 'all' 
        ? stories 
        : stories.filter(s => s.category === selectedCategory);
      updateConnectionLines(filteredStories);
    };

    map.current.on('move', handleMapMove);
    map.current.on('zoom', handleMapMove);

    return () => {
      if (map.current) {
        map.current.off('move', handleMapMove);
        map.current.off('zoom', handleMapMove);
      }
    };
  }, [selectedCategory, stories, mapInitialized]);

  useEffect(() => {
    if (!map.current || !mapInitialized) return;

    if (isVisible) {
      const rotateMap = () => {
        if (map.current) {
          const currentCenter = map.current.getCenter();
          map.current.setCenter([currentCenter.lng - 0.171, currentCenter.lat]);
        }
      };

      rotationIntervalRef.current = setInterval(rotateMap, 16.67);

      const stopRotation = () => {
        if (rotationIntervalRef.current) {
          clearInterval(rotationIntervalRef.current);
          rotationIntervalRef.current = null;
        }
      };

      map.current.on('mousedown', stopRotation);
      map.current.on('touchstart', stopRotation);
      map.current.on('wheel', stopRotation);
    } else {
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
        rotationIntervalRef.current = null;
      }
    }

    return () => {
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
        rotationIntervalRef.current = null;
      }
      if (map.current) {
        map.current.off('mousedown');
        map.current.off('touchstart');
        map.current.off('wheel');
      }
    };
  }, [isVisible, mapInitialized]);

  const initializeMap = () => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAPBOX_STYLE,
      center: initialCenter,
      zoom: initialZoom
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-left');

    map.current.on('load', () => {
      if (stories.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        stories.forEach(story => {
          if (story.coordinates) {
            bounds.extend([story.coordinates[1], story.coordinates[0]]);
          }
        });

        map.current.fitBounds(bounds, {
          padding: { top: 100, bottom: 100, left: 100, right: 100 },
          maxZoom: 2,
          duration: 2000
        });
      }

      map.current.addSource('marker-lines', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      map.current.addLayer({
        id: 'marker-lines-layer',
        type: 'line',
        source: 'marker-lines',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#00ff00',
          'line-width': 8
        }
      });

      addMarkers();
      setMapInitialized(true);
    });
  };

  const addMarkers = () => {
    if (!map.current || stories.length === 0) return;

    markers.current.forEach(marker => {
      const el = marker.getElement();
      el.style.transition = 'opacity 500ms ease-out';
      el.style.opacity = '0';
    });

    setTimeout(() => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];

      let initialZoom = map.current.getZoom();
      let initialCenter = map.current.getCenter();

      const filteredStories = selectedCategory === 'all' 
        ? stories 
        : stories.filter(s => s.category === selectedCategory);

      filteredStories.forEach((story) => {
        createMarker(story, initialZoom, initialCenter);
      });

      updateConnectionLines(filteredStories);
    }, 500);
  };

  const updateConnectionLines = (storiesToShow) => {
    if (!map.current) return;

    const features = storiesToShow.map(story => {
      if (!story.coordinates) return null;
      
      const geoLngLat = [story.coordinates[1], story.coordinates[0]];
      const geoScreenPoint = map.current.project(geoLngLat);
      
      const thumbnailBottomY = geoScreenPoint.y + 67.5;
      const lineStartLngLat = map.current.unproject([geoScreenPoint.x, thumbnailBottomY]);
      
      const lineEndY = thumbnailBottomY + 50;
      const lineEndLngLat = map.current.unproject([geoScreenPoint.x, lineEndY]);
      
      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [lineStartLngLat.lng, lineStartLngLat.lat],
            [lineEndLngLat.lng, lineEndLngLat.lat]
          ]
        }
      };
    }).filter(Boolean);

    const source = map.current.getSource('marker-lines');
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features
      });
    }
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

    el.style.opacity = '0';
    el.style.transition = 'opacity 500ms ease-in';
    setTimeout(() => {
      el.style.opacity = '1';
    }, 10);

    markers.current.push(marker);
  };

  return (
    <div className="relative h-screen w-full flex items-center justify-center">
      <div ref={mapContainer} className="h-[80vh] w-full" />

      {categories.length > 0 && (
        <div className="absolute top-1/2 -translate-y-1/2 left-4 z-[130]">
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </div>
      )}

      {stories.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <p className="text-slate-600 text-lg">No published stories available</p>
        </div>
      )}

      {onScrollToTop && (
        <button
          onClick={onScrollToTop}
          className="absolute bottom-8 right-8 z-30 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all hover:shadow-xl"
        >
          <ChevronUp className="w-6 h-6 text-slate-800" />
        </button>
      )}

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