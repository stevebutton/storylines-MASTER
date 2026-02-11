import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import CategoryFilter from '@/components/storymap/CategoryFilter';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MAPBOX_STYLE = 'mapbox://styles/stevebutton/clummsfw1002701mpbiw3exg7';
const MAPBOX_TOKEN = 'pk.eyJ1Ijoic3RldmVidXR0b24iLCJhIjoiNEw1T183USJ9.Sv_1qSC23JdXot8YIRPi8A';

mapboxgl.accessToken = MAPBOX_TOKEN;

export default function InteractiveStoryMap({ 
  stories = [], 
  initialCenter = [26.33845, 21.32637],
  initialZoom = 1.80,
  onScrollToTop,
  isVisible = true,
  showCategories = true
}) {
  const navigate = useNavigate();
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef({});
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
      updateStoryData();
    }
  }, [selectedCategory, stories]);

  useEffect(() => {
    if (!map.current || !mapInitialized) return;

    const handleZoom = () => {
      updateUnclusteredMarkers();
    };

    map.current.on('zoom', handleZoom);

    return () => {
      if (map.current) {
        map.current.off('zoom', handleZoom);
      }
    };
  }, [mapInitialized]);

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
        let hasValidCoords = false;
        
        stories.forEach(story => {
          if (story.coordinates && Array.isArray(story.coordinates) && 
              story.coordinates.length === 2 &&
              !isNaN(story.coordinates[0]) && !isNaN(story.coordinates[1]) &&
              isFinite(story.coordinates[0]) && isFinite(story.coordinates[1])) {
            bounds.extend([story.coordinates[1], story.coordinates[0]]);
            hasValidCoords = true;
          }
        });

        if (hasValidCoords) {
          map.current.fitBounds(bounds, {
            padding: { top: 100, bottom: 100, left: 100, right: 100 },
            maxZoom: 2,
            duration: 2000
          });
        }
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

      // Add stories source with clustering
      map.current.addSource('stories', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 10,
        clusterRadius: 80
      });

      // Cluster circles layer
      map.current.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'stories',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#d97706',
            3,
            '#c2410c',
            5,
            '#9a3412'
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            25,
            3,
            32,
            5,
            40
          ],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#fff'
        }
      });

      // Cluster count layer
      map.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'stories',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': [
            'concat',
            ['get', 'point_count'],
            [
              'case',
              ['==', ['get', 'point_count'], 1],
              ' story',
              ' stories'
            ]
          ],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 11
        },
        paint: {
          'text-color': '#ffffff'
        }
      });

      // Handle cluster clicks
      map.current.on('click', 'clusters', (e) => {
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ['clusters']
        });
        const clusterId = features[0].properties.cluster_id;
        map.current.getSource('stories').getClusterExpansionZoom(
          clusterId,
          (err, zoom) => {
            if (err) return;

            map.current.easeTo({
              center: features[0].geometry.coordinates,
              zoom: zoom,
              duration: 800
            });
          }
        );
      });

      // Change cursor on cluster hover
      map.current.on('mouseenter', 'clusters', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'clusters', () => {
        map.current.getCanvas().style.cursor = '';
      });

      setMapInitialized(true);
      
      // Populate initial data immediately after map loads
      setTimeout(() => {
        updateStoryData();
      }, 100);
    });
  };

  const updateStoryData = () => {
    if (!map.current || !mapInitialized) return;

    const filteredStories = selectedCategory === 'all' 
      ? stories 
      : stories.filter(s => s.category === selectedCategory);

    const features = filteredStories
      .filter(story => 
        story.coordinates && 
        Array.isArray(story.coordinates) && 
        story.coordinates.length === 2 &&
        !isNaN(story.coordinates[0]) && 
        !isNaN(story.coordinates[1]) &&
        isFinite(story.coordinates[0]) && 
        isFinite(story.coordinates[1])
      )
      .map(story => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [story.coordinates[1], story.coordinates[0]]
        },
        properties: {
          id: story.id,
          title: story.title,
          subtitle: story.subtitle,
          author: story.author,
          hero_image: story.hero_image,
          category: story.category
        }
      }));

    const source = map.current.getSource('stories');
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features
      });
      
      updateUnclusteredMarkers();
    }
  };

  const updateUnclusteredMarkers = () => {
    if (!map.current) return;

    const features = map.current.querySourceFeatures('stories', {
      filter: ['!', ['has', 'point_count']]
    });

    // Remove markers that are no longer visible
    Object.keys(markers.current).forEach(id => {
      const stillVisible = features.find(f => f.properties.id === id);
      if (!stillVisible) {
        markers.current[id].remove();
        delete markers.current[id];
      }
    });

    // Add/update markers for visible unclustered points
    features.forEach(feature => {
      const id = feature.properties.id;
      if (!markers.current[id]) {
        createMarker(feature.properties, feature.geometry.coordinates);
      }
    });
  };

  const createMarker = (storyProps, coordinates) => {
    const el = document.createElement('div');
    el.style.cssText = `
      width: 240px;
      height: 40px;
      border-radius: 10px;
      background-color: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: flex;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.3s ease;
      transform: translate(-50%, -50%);
    `;

    // Image container (left side - 40px)
    const imageContainer = document.createElement('div');
    imageContainer.style.cssText = `
      width: 40px;
      height: 100%;
      flex-shrink: 0;
      overflow: hidden;
    `;

    if (storyProps.hero_image) {
      const img = document.createElement('img');
      img.src = storyProps.hero_image;
      img.alt = storyProps.title;
      img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
      `;
      imageContainer.appendChild(img);
    }
    el.appendChild(imageContainer);

    // Title container (right side - 200px)
    const titleContainer = document.createElement('div');
    titleContainer.style.cssText = `
      width: 200px;
      height: 100%;
      display: flex;
      align-items: center;
      padding-left: 15px;
      font-size: 0.875rem;
      color: #1e293b;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    titleContainer.textContent = storyProps.title;
    el.appendChild(titleContainer);

    let initialZoom, initialCenter;

    el.addEventListener('mouseenter', () => {
      initialZoom = map.current.getZoom();
      initialCenter = map.current.getCenter();
      
      el.style.transform = 'translate(-50%, -50%) scale(1.15)';
      el.style.zIndex = '1000';
      el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
      
      const newZoom = initialZoom * 1.25;
      map.current.flyTo({
        center: coordinates,
        zoom: newZoom,
        duration: 800,
        easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      });
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = 'translate(-50%, -50%) scale(1)';
      el.style.zIndex = 'auto';
      el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      
      map.current.flyTo({
        center: initialCenter,
        zoom: initialZoom,
        duration: 800,
        easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      });
    });

    el.addEventListener('click', () => {
      navigate(`${createPageUrl('StoryMapView')}?id=${storyProps.id}`);
    });

    const popupContent = `
      <div style="min-width: 250px; font-family: system-ui, sans-serif;">
        ${storyProps.hero_image ? `
          <img 
            src="${storyProps.hero_image}" 
            alt="${storyProps.title}" 
            style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px; margin-bottom: 12px;" 
          />
        ` : ''}
        <h3 style="font-weight: 600; color: #1e293b; margin: 0 0 6px 0; font-size: 16px;">${storyProps.title}</h3>
        ${storyProps.subtitle ? `
          <p style="font-size: 13px; color: #64748b; margin: 0 0 8px 0; line-height: 1.4;">${storyProps.subtitle}</p>
        ` : ''}
        ${storyProps.author ? `
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">By ${storyProps.author}</p>
        ` : ''}
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
          <div style="display: inline-block; padding: 6px 12px; background: #d97706; color: white; border-radius: 6px; font-size: 12px; font-weight: 500;">
            View Story →
          </div>
        </div>
      </div>
    `;

    const popup = new mapboxgl.Popup({ 
      offset: [0, -20],
      closeButton: false,
      maxWidth: '300px'
    }).setHTML(popupContent);

    const marker = new mapboxgl.Marker(el)
      .setLngLat(coordinates)
      .setPopup(popup)
      .addTo(map.current);

    el.style.opacity = '0';
    el.style.transition = 'opacity 500ms ease-in';
    setTimeout(() => {
      el.style.opacity = '1';
    }, 10);

    markers.current[storyProps.id] = marker;
  };

  return (
    <div className="relative h-screen w-full flex items-center justify-center">
      <div ref={mapContainer} className="h-[80vh] w-full" />

      <AnimatePresence>
        {categories.length > 0 && showCategories && (
          <motion.div 
            className="fixed bottom-[15%] left-1/2 z-[130]"
            initial={{ y: 100, opacity: 0, x: "-50%" }}
            animate={{ y: 0, opacity: 1, x: "-50%" }}
            exit={{ y: 100, opacity: 0, x: "-50%" }}
            transition={{ duration: 2, ease: "easeOut", delay: 1 }}
          >
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </motion.div>
        )}
      </AnimatePresence>

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