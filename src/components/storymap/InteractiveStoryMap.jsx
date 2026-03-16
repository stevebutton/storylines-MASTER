import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import CategoryFilter from '@/components/storymap/CategoryFilter';
import StoryMarker from '@/components/storymap/StoryMarker';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ChevronUp, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MAP_STYLES = {
  a: 'mapbox://styles/stevebutton/clummsfw1002701mpbiw3exg7',
  b: 'mapbox://styles/stevebutton/cktf8ygms085117nnzm4a97d0',
  c: 'mapbox://styles/stevebutton/ckn1s2y342eq018tidycnavti',
  d: 'mapbox://styles/stevebutton/cmm9edvor004m01sc0wyug8vz',
  e: 'mapbox://styles/stevebutton/cmmanazrf000f01qvaghi0jhv',
  f: 'mapbox://styles/stevebutton/cmmd2lwzp001m01s24puoahpd',
  g: 'mapbox://styles/stevebutton/cmmd3clf0001o01s2biib8ju2',
  h: 'mapbox://styles/stevebutton/ck9i8wv640t4c1iqeiphu3soc',
  i: 'mapbox://styles/stevebutton/cllw84jo600f401r7afyy7ef4',
  j: 'mapbox://styles/stevebutton/cmmg2352g002q01s82q1d6zzo',
  k: 'mapbox://styles/stevebutton/cmmmcnbw5009z01sb3xf72ldy',
};

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_API_KEY || 'pk.eyJ1Ijoic3RldmVidXR0b24iLCJhIjoiNEw1T183USJ9.Sv_1qSC23JdXot8YIRPi8A';

export default function InteractiveStoryMap({
  stories = [],
  initialCenter = [8, 40],
  initialZoom = 1.80,
  initialPitch = 30,
  onScrollToTop,
  isVisible = true,
  showCategories = true,
  showMarkers = true,
  mapStyle = 'a',
  rotationSpeed = 1.0,  // 0 = stopped, 0–1 = fraction of normal, 1 = full speed
}) {
  const navigate = useNavigate();
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef({});
  const [mapInitialized, setMapInitialized] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('featured');
  const showMarkersRef = useRef(showMarkers);
  const selectedCategoryRef = useRef('featured');
  const filteredStoriesRef = useRef([]);
  const [categories, setCategories] = useState([]);
  const rotationIntervalRef = useRef(null);
  const shouldRotateRef = useRef(false);
  const rotationSpeedRef = useRef(rotationSpeed); // target multiplier (0–1)
  const currentStepRef = useRef(0);               // actual lerped step (degrees/tick)

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

  // Keep ref in sync so event callbacks always read the current category
  useEffect(() => {
    selectedCategoryRef.current = selectedCategory;
  }, [selectedCategory]);

  // Keep ref in sync with showMarkers prop
  useEffect(() => {
    showMarkersRef.current = showMarkers;
  }, [showMarkers]);

  useEffect(() => {
    if (map.current && mapInitialized) {
      updateStoryData();
    }
  }, [selectedCategory, stories, mapInitialized, showMarkers]);

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

  const BASE_STEP = 0.171; // degrees per tick at full speed

  // Lerp toward target each tick — faster decel, gentler accel
  const rotateMap = () => {
    if (!map.current) return;
    const target = shouldRotateRef.current ? rotationSpeedRef.current * BASE_STEP : 0;
    const rate = currentStepRef.current > target ? 0.015 : 0.015;
    currentStepRef.current += (target - currentStepRef.current) * rate;
    if (Math.abs(currentStepRef.current) > 0.0002) {
      const c = map.current.getCenter();
      map.current.setCenter([c.lng - currentStepRef.current, c.lat]);
    }
  };

  const pauseRotation = () => {
    if (rotationIntervalRef.current) {
      clearInterval(rotationIntervalRef.current);
      rotationIntervalRef.current = null;
    }
    currentStepRef.current = 0; // hard stop on explicit pause
  };

  const resumeRotation = () => {
    if (shouldRotateRef.current && !rotationIntervalRef.current) {
      rotationIntervalRef.current = setInterval(rotateMap, 16.67);
    }
  };

  const stopRotation = () => {
    shouldRotateRef.current = false;
    pauseRotation();
  };

  // Sync rotationSpeed prop → ref so rotateMap always reads the latest value
  useEffect(() => {
    rotationSpeedRef.current = rotationSpeed;
    // If speed has been restored and the globe is visible but interval was
    // stopped (e.g. came to rest at speed 0), restart it
    if (rotationSpeed > 0 && shouldRotateRef.current && !rotationIntervalRef.current) {
      rotationIntervalRef.current = setInterval(rotateMap, 16.67);
    }
  }, [rotationSpeed]);

  const resetGlobe = () => {
    if (!map.current) return;
    stopRotation();
    map.current.flyTo({
      center: initialCenter,
      zoom: initialZoom,
      pitch: initialPitch,
      padding: { top: 0, bottom: 280, left: 0, right: 0 },
      duration: 2000,
      easing: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    });
    map.current.once('moveend', () => {
      shouldRotateRef.current = true;
      resumeRotation();
    });
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

    // Re-resolve overlaps after every pan/zoom when in featured mode
    map.current.on('moveend', resolveMarkerOverlaps);

    return () => {
      pauseRotation();
      if (map.current) {
        map.current.off('mousedown', stopRotation);
        map.current.off('touchstart', stopRotation);
        map.current.off('wheel', stopRotation);
        map.current.off('moveend', resolveMarkerOverlaps);
      }
    };
  }, [isVisible, mapInitialized]);

  const initializeMap = () => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLES[mapStyle] || MAP_STYLES.a,
      center: initialCenter,
      zoom: initialZoom,
      pitch: initialPitch,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-left');

    map.current.on('load', () => {
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

      // Shift effective viewport centre 140 px upward so northern-hemisphere
      // content sits higher in the frame despite the pitch tilt.
      map.current.easeTo({
        padding: { top: 0, bottom: 280, left: 0, right: 0 },
        duration: 0,
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

    const isFeatured = selectedCategory === 'featured';

    const filteredStories = selectedCategory === 'all'
      ? stories
      : stories.filter(s => s.category === selectedCategory);

    // Store for direct marker creation in featured mode
    filteredStoriesRef.current = filteredStories;

    // Toggle cluster layers: hidden for featured (no clustering), visible otherwise
    const clusterViz = isFeatured ? 'none' : 'visible';
    ['clusters', 'cluster-count-number', 'cluster-count-label'].forEach(layerId => {
      if (map.current?.getLayer(layerId)) {
        map.current.setLayoutProperty(layerId, 'visibility', clusterViz);
      }
    });

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
          location: story.location,
          author: story.author,
          hero_image: story.hero_image,
          category: story.category
        }
      }));

    const source = map.current.getSource('stories');
    if (source) {
      source.setData({ type: 'FeatureCollection', features });
      updateUnclusteredMarkers();
      if (isFeatured) setTimeout(resolveMarkerOverlaps, 120);
    }
  };

  // Screen-space overlap resolution for HTML markers.
  // Groups overlapping markers via union-find, then lays each group out in a
  // grid of max MAX_ROWS rows — overflow spills into additional columns so that
  // dense clusters (e.g. many stories in one country) never scroll off-screen.
  const resolveMarkerOverlaps = () => {
    if (!map.current || selectedCategoryRef.current !== 'featured') return;

    const W        = 256; // bounding-box width per card
    const H        = 76;  // bounding-box height per card
    const MAX_ROWS = 3;   // max vertical stack before adding a new column
    const COL_STEP = W + 8; // horizontal distance between column centres

    const entries = Object.values(markers.current).map(marker => {
      const lngLat = marker.getLngLat();
      const orig   = map.current.project(lngLat);
      return { marker, origX: orig.x, origY: orig.y, simX: orig.x, simY: orig.y };
    });

    // Union-Find — group all transitively-overlapping markers
    const parent = entries.map((_, i) => i);
    const find = (i) => {
      while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
      return i;
    };
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        if (Math.abs(entries[i].origX - entries[j].origX) < W &&
            Math.abs(entries[i].origY - entries[j].origY) < H) {
          parent[find(i)] = find(j);
        }
      }
    }

    // Collect groups keyed by root index
    const groupMap = {};
    entries.forEach((entry, i) => {
      const root = find(i);
      if (!groupMap[root]) groupMap[root] = [];
      groupMap[root].push(entry);
    });

    // Lay out each group as a grid: rows fill first (top→bottom), then columns
    Object.values(groupMap).forEach(group => {
      if (group.length <= 1) return;

      // Sort by latitude (north→south) — stable across map moves/rotations.
      // Sorting by origY (screen px) caused stories to swap grid slots on
      // every pan because minor position changes flipped the sort order.
      group.sort((a, b) => b.marker.getLngLat().lat - a.marker.getLngLat().lat);

      const numCols  = Math.ceil(group.length / MAX_ROWS);
      const centerX  = group.reduce((s, e) => s + e.origX, 0) / group.length;
      const centerY  = group.reduce((s, e) => s + e.origY, 0) / group.length;

      // Spread columns symmetrically around the group centroid
      const startX = centerX - (numCols - 1) * COL_STEP / 2;

      group.forEach((entry, idx) => {
        const col           = Math.floor(idx / MAX_ROWS);
        const row           = idx % MAX_ROWS;
        const itemsInCol    = Math.min(MAX_ROWS, group.length - col * MAX_ROWS);
        const colHeight     = itemsInCol * H;

        entry.simX = startX + col * COL_STEP;
        entry.simY = centerY - colHeight / 2 + row * H + H / 2;
      });
    });

    entries.forEach(({ marker, origX, origY, simX, simY }) => {
      marker.setOffset([simX - origX, simY - origY]);
    });
  };

  const updateUnclusteredMarkers = () => {
    if (!map.current) return;

    // When markers are hidden, remove all and bail
    if (!showMarkersRef.current) {
      Object.keys(markers.current).forEach(id => {
        markers.current[id].remove();
        delete markers.current[id];
      });
      return;
    }

    const isFeatured = selectedCategoryRef.current === 'featured';

    let markerItems; // [{ props, lngLat }]

    if (isFeatured) {
      // Bypass Mapbox source clustering — create markers directly from the stories array
      // so all featured stories appear regardless of Mapbox's internal cluster state.
      markerItems = filteredStoriesRef.current
        .filter(s =>
          s.coordinates && Array.isArray(s.coordinates) && s.coordinates.length === 2 &&
          !isNaN(s.coordinates[0]) && !isNaN(s.coordinates[1]) &&
          isFinite(s.coordinates[0]) && isFinite(s.coordinates[1])
        )
        .map(s => ({
          props: {
            id: s.id,
            title: s.title,
            subtitle: s.subtitle,
            location: s.location,
            author: s.author,
            hero_image: s.hero_image,
            category: s.category,
          },
          lngLat: [s.coordinates[1], s.coordinates[0]],
        }));
    } else {
      const features = map.current.querySourceFeatures('stories', {
        filter: ['!', ['has', 'point_count']]
      });
      markerItems = features.map(f => ({
        props: f.properties,
        lngLat: f.geometry.coordinates,
      }));
    }

    // Remove markers no longer needed
    Object.keys(markers.current).forEach(id => {
      const stillVisible = markerItems.find(m => m.props.id === id);
      if (!stillVisible) {
        markers.current[id].remove();
        delete markers.current[id];
      }
    });

    // Add new markers
    markerItems.forEach(({ props, lngLat }) => {
      if (!markers.current[props.id]) {
        createMarker(props, lngLat);
      }
    });
  };

  const createMarker = (storyProps, coordinates) => {
    const el = document.createElement('div');
    el.style.opacity = '0';
    el.style.transition = 'opacity 1s ease 1s';
    
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
        duration: 3500,
        easing: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      });
    };

    const handleMouseLeave = () => {
      if (!map.current) return;
      map.current.flyTo({
        center: initialCenter,
        zoom: initialZoom,
        duration: 3500,
        easing: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
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
        mapStyle={mapStyle}
      />
    );

    const marker = new mapboxgl.Marker(el)
      .setLngLat(coordinates)
      .addTo(map.current);

    // Dissolve in — double rAF ensures the browser paints opacity:0 before transitioning
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = '1'; }));

    markers.current[storyProps.id] = marker;
  };

  return (
    <div className="relative h-screen w-full">
      <div ref={mapContainer} className="h-full w-full" />

      <AnimatePresence>
        {categories.length > 0 && showCategories && (
          <motion.div 
            className="absolute bottom-[calc(15%-50px)] left-1/2 z-[130]"
            initial={{ y: 100, opacity: 0, x: "-50%" }}
            animate={{ y: 0, opacity: 1, x: "-50%" }}
            exit={{ y: 100, opacity: 0, x: "-50%" }}
            transition={{ duration: 2, ease: "easeOut", delay: 1 }}
          >
            <div className="flex items-stretch gap-3">
              <CategoryFilter
                categories={categories}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
              <button
                onClick={resetGlobe}
                className="backdrop-blur-xl flex items-center gap-2 text-white/70 hover:text-white/90 transition-colors shadow-lg"
                style={{
                  background: 'rgba(15,23,42,0.25)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '999px',
                  padding: '30px 24px',
                  fontSize: '12px',
                  fontFamily: 'Raleway, sans-serif',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <RotateCcw size={12} />
                Reset the Globe
              </button>
            </div>
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