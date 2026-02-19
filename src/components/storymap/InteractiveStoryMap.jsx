import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import CategoryFilter from '@/components/storymap/CategoryFilter';
import StoryMarker from '@/components/storymap/StoryMarker';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MAPBOX_STYLE = 'mapbox://styles/stevebutton/clummsfw1002701mpbiw3exg7';

mapboxgl.accessToken = import.meta.env.MAPBOX_API_KEY;

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
  const shouldRotateRef = useRef(false);

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
  }, [selectedCategory, stories, mapInitialized]);

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

  const pauseRotation = () => {
    if (rotationIntervalRef.current) {
      clearInterval(rotationIntervalRef.current);
      rotationIntervalRef.current = null;
    }
  };

  const resumeRotation = () => {
    if (shouldRotateRef.current && !rotationIntervalRef.current) {
      const rotateMap = () => {
        if (map.current) {
          const currentCenter = map.current.getCenter();
          map.current.setCenter([currentCenter.lng - 0.171, currentCenter.lat]);
        }
      };
      rotationIntervalRef.current = setInterval(rotateMap, 16.67);
    }
  };

  const stopRotation = () => {
    shouldRotateRef.current = false;
    pauseRotation();
  };

  useEffect(() => {
    if (!map.current || !mapInitialized) return;

    if (isVisible) {
      shouldRotateRef.current = true;
      resumeRotation();

      map.current.on('mousedown', stopRotation);
      map.current.on('touchstart', stopRotation);
      map.current.on('wheel', stopRotation);
    } else {
      shouldRotateRef.current = false;
      pauseRotation();
    }

    return () => {
      pauseRotation();
      if (map.current) {
        map.current.off('mousedown', stopRotation);
        map.current.off('touchstart', stopRotation);
        map.current.off('wheel', stopRotation);
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
            55,
            3,
            70,
            5,
            90
          ],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.6,
          'circle-opacity-transition': {
            duration: 500
          }
        }
      });

      // Cluster count number layer
      map.current.addLayer({
        id: 'cluster-count-number',
        type: 'symbol',
        source: 'stories',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 40,
          'text-offset': [-0.6, 0]
        },
        paint: {
          'text-color': '#ffffff'
        }
      });

      // Cluster "stories" label layer
      map.current.addLayer({
        id: 'cluster-count-label',
        type: 'symbol',
        source: 'stories',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': 'stories',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 18,
          'text-offset': [1.0, 0]
        },
        paint: {
          'text-color': '#ffffff'
        }
      });

      // Unclustered points layer (hidden - custom HTML markers are used instead)
      map.current.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'stories',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#d97706',
          'circle-radius': 0,
          'circle-stroke-width': 0,
          'circle-stroke-color': '#fff'
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
            
            // Update markers after zoom animation completes
            setTimeout(() => {
              updateUnclusteredMarkers();
            }, 850);
          }
        );
      });

      // Change cursor on cluster hover and pause rotation
      map.current.on('mouseenter', 'clusters', () => {
        map.current.getCanvas().style.cursor = 'pointer';
        pauseRotation();
      });
      map.current.on('mouseleave', 'clusters', () => {
        map.current.getCanvas().style.cursor = '';
        resumeRotation();
      });

      setMapInitialized(true);
    });

    // Populate initial data after map is fully initialized
    // Wait for state update before calling
    setTimeout(() => {
      if (map.current && map.current.getSource('stories')) {
        updateStoryData();
      }
    }, 0);
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
    
    const story = stories.find(s => s.id === storyProps.id);
    const publicationDate = story?.created_date 
      ? new Date(story.created_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';

    let initialZoom, initialCenter;

    const handleMouseEnter = () => {
      if (!map.current) return;
      pauseRotation();
      initialZoom = map.current.getZoom();
      initialCenter = map.current.getCenter();
      
      const newZoom = initialZoom * 1.25;
      map.current.flyTo({
        center: coordinates,
        zoom: newZoom,
        duration: 1500,
        easing: (t) => t * t * t
      });
    };

    const handleMouseLeave = () => {
      if (!map.current) return;
      map.current.flyTo({
        center: initialCenter,
        zoom: initialZoom,
        duration: 1500,
        easing: (t) => t * t * t
      });
      resumeRotation();
    };

    const handleClick = () => {
      navigate(`${createPageUrl('StoryMapView')}?id=${storyProps.id}`);
    };

    const root = ReactDOM.createRoot(el);
    root.render(
      <StoryMarker 
        storyProps={storyProps}
        publicationDate={publicationDate}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />
    );

    const marker = new mapboxgl.Marker(el)
      .setLngLat(coordinates)
      .addTo(map.current);

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
          padding: 0 !important;
          border-radius: 10px !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.25) !important;
          overflow: hidden;
        }
        .mapboxgl-popup-tip {
          display: none !important;
        }
      `}</style>
    </div>
  );
}