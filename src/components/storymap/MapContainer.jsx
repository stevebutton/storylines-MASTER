import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { normalizeCoordinatePair, areCoordinatesEqual, isValidCoordinatePair } from '@/components/utils/coordinateUtils';
import { fadeMapLayer } from '@/utils/mapLayerFade';

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
    l: 'mapbox://styles/stevebutton/cmmuqyi1p00a501s955v9393b',
};

// One colour per chapter, cycling if there are more than 6 chapters
const CHAPTER_COLORS = [
    { main: '#d97706', rgb: '217, 119, 6'   },  // 0 amber
    { main: '#2563eb', rgb: '37,  99,  235' },  // 1 blue
    { main: '#16a34a', rgb: '22,  163, 74'  },  // 2 green
    { main: '#9333ea', rgb: '147, 51,  234' },  // 3 purple
    { main: '#e11d48', rgb: '225, 29,  72'  },  // 4 rose
    { main: '#0d9488', rgb: '13,  148, 136' },  // 5 teal
];

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_API_KEY || 'pk.eyJ1Ijoic3RldmVidXR0b24iLCJhIjoiNEw1T183USJ9.Sv_1qSC23JdXot8YIRPi8A';

// Generate a GeoJSON polygon approximating a circle at [lat, lng] with the given radius in metres.
function createCirclePolygon([lat, lng], radiusMetres, steps = 5) {
    const coords = [];
    for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * 2 * Math.PI;
        const dLat = (radiusMetres / 6371000) * Math.cos(angle) * (180 / Math.PI);
        const dLng = (radiusMetres / 6371000) * Math.sin(angle) / Math.cos(lat * Math.PI / 180) * (180 / Math.PI);
        coords.push([lng + dLng, lat + dLat]);
    }
    return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } };
}

export default function MapBackground({
    center,
    zoom,
    bearing = 0,
    pitch = 0,
    markers = [],
    activeMarkerIndex = -1,
    onMarkerClick,
    shouldRotate = false,
    flyDuration = 8,
    instant = false,
    routeCoordinates = [],
    routeStaticLength = 0,
    clearRoute = false,
    onRouteCleared,
    offset = [0, 0],
    landingMarkers = [],
    clearLandingMarkers = false,
    activeLayerId = null,
    activeChapter = 0,
    mapStyle = 'a',
    chapterRegion = null,
    onMapReady = null,
    showRoute = true,
    showMarkers = true,
}) {
    const THEME_FONTS = { c: 'Righteous, cursive', f: 'Oswald, sans-serif', k: 'Oswald, sans-serif' };
    const themeFont = THEME_FONTS[mapStyle] || 'Raleway, sans-serif';

    const mapContainer = useRef(null);
    const map = useRef(null);
    const markersRef = useRef([]);
    const rotationRef = useRef(null);
    const routeSourceAdded = useRef(false);
    const landingMarkersRef = useRef([]);
    const lineAnimationRef = useRef(null);
    const regionAnimRef = useRef(null);
    const previousLayerId = useRef(null);
    const appliedStyleRef = useRef(null);
    const [styleLoadCount, setStyleLoadCount] = useState(0);
    const prevStaticLength = useRef(0);
    const onMarkerClickRef = useRef(onMarkerClick);
    onMarkerClickRef.current = onMarkerClick;
    const activeChapterRef = useRef(activeChapter);
    activeChapterRef.current = activeChapter;

    // Initialize map
    useEffect(() => {
        if (map.current || !mapContainer.current) return;
        
        // Validate center coordinates
        const validCenter = (center && Array.isArray(center) && center.length === 2 && 
                           !isNaN(center[0]) && !isNaN(center[1]) && 
                           isFinite(center[0]) && isFinite(center[1]))
            ? [center[1], center[0]]
            : [-74.006, 40.7128];
        
        const initialStyle = MAP_STYLES[mapStyle] || MAP_STYLES.a;
        appliedStyleRef.current = initialStyle;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: initialStyle,
            center: validCenter,
            zoom: zoom || 12,
            bearing: bearing || 0,
            pitch: pitch || 0,
            interactive: true,
            dragRotate: true,
            fog: null
        });

        // Navigation controls are rendered as React buttons in BottomPillBar

        // v3: pitchWithRotate is no longer a Map constructor option — enable via handlers.
        // Also enable touchPitch for two-finger pitch on touch devices.
        map.current.once('load', () => {
            if (map.current?.dragRotate) map.current.dragRotate.enable({ pitchWithRotate: true });
            if (map.current?.touchPitch) map.current.touchPitch.enable();
            if (onMapReady) onMapReady(map.current);
        });

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    // Update map position
    useEffect(() => {
        if (!map.current || !mapContainer.current) return;

        // Validate center coordinates
        if (!center || !Array.isArray(center) || center.length !== 2 ||
            isNaN(center[0]) || isNaN(center[1]) ||
            !isFinite(center[0]) || !isFinite(center[1])) {
            return;
        }

        // Cancel any ongoing rotation
        if (rotationRef.current) {
            cancelAnimationFrame(rotationRef.current);
            rotationRef.current = null;
        }

        const flyMs = (flyDuration || 12) * 1000;

        // Validate pitch value
        const validPitch = (typeof pitch === 'number' && !isNaN(pitch) && isFinite(pitch) && pitch >= 0 && pitch <= 85)
            ? pitch
            : 0;

        // If style not loaded yet, jump to position instantly when it loads
        // (covers stories with no hero image where user can interact before style is ready)
        if (!map.current.isStyleLoaded()) {
            const applyPosition = () => {
                if (!map.current) return;
                try {
                    map.current.jumpTo({
                        center: [center[1], center[0]],
                        zoom: zoom || 12,
                        bearing: bearing || 0,
                        pitch: validPitch
                    });
                } catch (e) {}
            };
            map.current.once('load', applyPosition);
            return () => {
                if (map.current) map.current.off('load', applyPosition);
            };
        }

        // Instant positioning — easeTo with duration 0 so the offset is honoured
        // (jumpTo doesn't support offset; omitting it causes a visible vertical
        // discrepancy vs flyTo when pitch is non-zero)
        if (instant) {
            try {
                map.current.easeTo({
                    center: [center[1], center[0]],
                    zoom: zoom || 12,
                    bearing: bearing || 0,
                    pitch: validPitch,
                    offset: offset || [0, 0],
                    duration: 0
                });
            } catch (e) {}
            return;
        }

        // Animated flyTo for all user-triggered navigation
        try {
            map.current.flyTo({
                center: [center[1], center[0]],
                offset: offset,
                zoom: zoom || 12,
                bearing: bearing || 0,
                pitch: validPitch,
                duration: flyMs,
                essential: true,
                easing: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
            });
        } catch (error) {
            // Map may have been destroyed during navigation
        }

        return () => {
            if (rotationRef.current) {
                cancelAnimationFrame(rotationRef.current);
                rotationRef.current = null;
            }
        };
    }, [center, zoom, bearing, pitch, shouldRotate, flyDuration, instant]);

    // Switch map style when the mapStyle prop changes.
    // On style.load, reset routeSourceAdded and increment styleLoadCount so the
    // route and region effects re-run and re-add their layers to the fresh style.
    useEffect(() => {
        if (!map.current) return;
        const styleUrl = MAP_STYLES[mapStyle] || MAP_STYLES.a;
        if (appliedStyleRef.current === styleUrl) return;
        if (!map.current.isStyleLoaded()) {
            appliedStyleRef.current = styleUrl;
            return;
        }
        appliedStyleRef.current = styleUrl;
        routeSourceAdded.current = false;
        map.current.setStyle(styleUrl);
        map.current.once('style.load', () => {
            setStyleLoadCount(c => c + 1);
        });
    }, [mapStyle]);

    // ============================================
    // CHAPTER REGION: Soft radiating circle marking the chapter's geographic territory
    // ============================================
    useEffect(() => {
        if (regionAnimRef.current) {
            cancelAnimationFrame(regionAnimRef.current);
            regionAnimRef.current = null;
        }
        if (!map.current) return;

        const cleanupRegion = () => {
            try {
                if (map.current?.getLayer('chapter-region-fill')) map.current.removeLayer('chapter-region-fill');
                if (map.current?.getLayer('chapter-region-stroke')) map.current.removeLayer('chapter-region-stroke');
                if (map.current?.getSource('chapter-region')) map.current.removeSource('chapter-region');
            } catch (e) {}
        };

        if (!chapterRegion || !map.current.isStyleLoaded()) {
            cleanupRegion();
            return;
        }

        cleanupRegion();

        const color = CHAPTER_COLORS[activeChapterRef.current % CHAPTER_COLORS.length].main;
        const geojson = createCirclePolygon(chapterRegion.center, chapterRegion.radiusMetres);

        try {
            map.current.addSource('chapter-region', { type: 'geojson', data: geojson });
            map.current.addLayer({
                id: 'chapter-region-fill',
                type: 'fill',
                source: 'chapter-region',
                paint: { 'fill-color': color, 'fill-opacity': 0.06 }
            });
            map.current.addLayer({
                id: 'chapter-region-stroke',
                type: 'line',
                source: 'chapter-region',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': color, 'line-width': 1, 'line-opacity': 0.35 }
            });
        } catch (e) { return; }

        // Slow breathing animation on the fill opacity
        const startTime = performance.now();
        const animate = (now) => {
            if (!map.current?.getLayer('chapter-region-fill')) return;
            const t = ((now - startTime) % 5000) / 5000;
            const opacity = 0.04 + 0.05 * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI));
            try { map.current.setPaintProperty('chapter-region-fill', 'fill-opacity', opacity); } catch (e) {}
            regionAnimRef.current = requestAnimationFrame(animate);
        };
        regionAnimRef.current = requestAnimationFrame(animate);

        return () => {
            if (regionAnimRef.current) {
                cancelAnimationFrame(regionAnimRef.current);
                regionAnimRef.current = null;
            }
            cleanupRegion();
        };
    }, [chapterRegion, styleLoadCount]);

    // ============================================
    // ROUTE LINE RENDERING: Draw and animate route line on map
    // Only animates the new segment (from prevRouteLength to current length)
    // ============================================
    useEffect(() => {
        if (!map.current || !mapContainer.current) return;

        // Cancel any ongoing animation
        if (lineAnimationRef.current) {
            cancelAnimationFrame(lineAnimationRef.current);
            lineAnimationRef.current = null;
        }

        // Clear route if requested — handled before isStyleLoaded() guard so
        // it always fires even during a style transition (otherwise clearRoute
        // stays true permanently and blocks subsequent route drawing).
        if (clearRoute) {
            if (map.current.getLayer('route-line')) map.current.removeLayer('route-line');
            if (map.current.getLayer('route-glow')) map.current.removeLayer('route-glow');
            if (map.current.getSource('route')) map.current.removeSource('route');
            routeSourceAdded.current = false;
            prevStaticLength.current = 0;
            if (onRouteCleared) onRouteCleared();
            return;
        }

        if (!map.current.isStyleLoaded()) return;

        // Coordinates are already normalized by StoryMapView — just filter out invalids
        const validCoords = routeCoordinates.filter(coord =>
            coord && Array.isArray(coord) && coord.length === 2 &&
            !isNaN(coord[0]) && !isNaN(coord[1]) &&
            isFinite(coord[0]) && isFinite(coord[1])
        );

        if (validCoords.length < 2) return;

        const allLngLat = validCoords.map(coord => [coord[1], coord[0]]);

        if (!routeSourceAdded.current) {
            if (!map.current.getSource('route')) {
                map.current.addSource('route', {
                    type: 'geojson',
                    lineMetrics: true,   // required for line-gradient
                    data: {
                        type: 'Feature',
                        properties: {},
                        geometry: { type: 'LineString', coordinates: [] }
                    }
                });
            }

            if (!map.current.getLayer('route-line')) {
                const color = CHAPTER_COLORS[activeChapterRef.current % CHAPTER_COLORS.length];
                // Gradient line: faint at start → full chapter colour → white at the tip
                map.current.addLayer({
                    id: 'route-line',
                    type: 'line',
                    source: 'route',
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: {
                        'line-width': 4,
                        'line-gradient': [
                            'interpolate', ['linear'], ['line-progress'],
                            0,   `rgba(${color.rgb}, 0.15)`,
                            0.5, color.main,
                            1,   '#ffffff'
                        ]
                    }
                });
            }
            routeSourceAdded.current = true;
        }

        const source = map.current.getSource('route');
        if (!source) return;

        // Determine whether this update is a new slide visit (animate) or a
        // road-geometry refinement from the Directions API (display only).
        // routeStaticLength only increments when a slide is visited; it does NOT
        // change when the API callback replaces straight-line segments with road
        // geometry. This prevents API returns from triggering animations for
        // slides the user passed 2–3 seconds ago.
        const shouldAnimate = routeStaticLength !== prevStaticLength.current;
        prevStaticLength.current = routeStaticLength;

        if (!shouldAnimate) {
            // Road-geometry refinement — just refresh the source, no animation.
            source.setData({
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: allLngLat }
            });
            return;
        }

        // New slide — animate from the end of the static route to the new point.
        // routeStaticLength is the exact coordinate count of the route up to (but
        // not including) the new segment, so it is stable regardless of how many
        // road-geometry points earlier segments contain.
        const prevLen = routeStaticLength;
        const newSegmentCoords = allLngLat.slice(Math.max(prevLen - 1, 0));

        // Immediately show everything up to the start of the new segment
        const staticCoords = allLngLat.slice(0, Math.max(prevLen, 1));
        source.setData({
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: staticCoords }
        });

        const startDelay = 300;
        const animationDuration = 5000;

        const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        const delayTimer = setTimeout(() => {
            const startTime = performance.now();

            const animateLine = (currentTime) => {
                const elapsed = currentTime - startTime;
                const linearProgress = Math.min(elapsed / animationDuration, 1);
                const easedProgress = easeInOutCubic(linearProgress);

                const newCoordsToShow = Math.max(2, Math.floor(newSegmentCoords.length * easedProgress));
                const visibleCoords = [
                    ...allLngLat.slice(0, Math.max(prevLen, 1)),
                    ...newSegmentCoords.slice(1, newCoordsToShow)
                ];

                source.setData({
                    type: 'Feature',
                    properties: {},
                    geometry: { type: 'LineString', coordinates: visibleCoords }
                });

                if (linearProgress < 1) {
                    lineAnimationRef.current = requestAnimationFrame(animateLine);
                } else {
                    lineAnimationRef.current = null;
                }
            };

            lineAnimationRef.current = requestAnimationFrame(animateLine);
        }, startDelay);

        return () => {
            clearTimeout(delayTimer);
            if (lineAnimationRef.current) {
                cancelAnimationFrame(lineAnimationRef.current);
                lineAnimationRef.current = null;
            }
        };
    }, [routeCoordinates, routeStaticLength, clearRoute, styleLoadCount]);

    // Update markers
    useEffect(() => {
        if (!map.current || !mapContainer.current) return;

        // Remove existing markers and any orphaned tooltips
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];
        document.querySelectorAll('[data-marker-tooltip]').forEach(el => el.remove());

        // Add new markers
        markers.forEach((markerData, index) => {
            const isActive = index === activeMarkerIndex;
            const colorIdx = (markerData.chapterIndex ?? 0) % CHAPTER_COLORS.length;
            const chapterColor = CHAPTER_COLORS[colorIdx];

            // Outer wrapper: passed to Mapbox, which may set transform/opacity on it.
            // We keep it transparent so Mapbox's opacity resets don't affect our visuals.
            const el = document.createElement('div');
            el.className = 'mapbox-marker';
            el.style.cssText = `
                width: 36px;
                height: 36px;
                cursor: ${isActive ? 'default' : 'pointer'};
                pointer-events: auto;
                transition: width 0.3s ease, height 0.3s ease;
                z-index: ${isActive ? '10' : '8'};
            `;

            // Inner visual element: Mapbox never touches this, so our opacity is safe here.
            const inner = document.createElement('div');
            inner.className = isActive ? `mapbox-marker-active-${colorIdx}` : 'mapbox-marker-inactive';
            inner.style.cssText = `
                width: 100%;
                height: 100%;
                box-sizing: border-box;
                border-radius: 50%;
                background: ${isActive ? chapterColor.main : '#000000'};
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                ${isActive ? 'opacity: 0; transition: opacity 300ms ease;' : ''}
            `;
            el.appendChild(inner);

            const marker = new mapboxgl.Marker(el)
                .setLngLat([markerData.coordinates[1], markerData.coordinates[0]])
                .addTo(map.current);

            // Fade active marker in — inactive opacity handled entirely by CSS class
            if (isActive) {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => { if (inner) inner.style.opacity = '1'; });
                });
            }

            // Previous markers: tooltip on hover with thumbnail + title, click to navigate
            if (!isActive) {
                let tooltipEl = null;

                el.addEventListener('mouseenter', () => {
                    if (tooltipEl) return;
                    const rect = el.getBoundingClientRect();
                    tooltipEl = document.createElement('div');
                    tooltipEl.setAttribute('data-marker-tooltip', '');
                    tooltipEl.style.cssText = `
                        position: fixed;
                        z-index: 9999;
                        left: ${rect.left + rect.width / 2}px;
                        top: ${rect.top - 8}px;
                        transform: translateX(-50%) translateY(calc(-100% + 10px));
                        min-width: 160px;
                        max-width: 220px;
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
                        border: 1px solid white;
                        overflow: hidden;
                        cursor: pointer;
                        pointer-events: auto;
                        font-family: ${themeFont};
                        opacity: 0;
                        transition: opacity 1000ms ease, transform 1000ms ease;
                    `;
                    tooltipEl.innerHTML = `
                        ${markerData.image ? `<img src="${markerData.image}" alt="${markerData.title}" style="width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block;" />` : ''}
                        <div style="padding: 8px 20px 40px 20px;">
                            <div style="font-weight: 300; font-size: 18px; color: #1e293b; line-height: 1.3; font-family: ${themeFont};">${markerData.title}</div>
                        </div>
                    `;
                    tooltipEl.addEventListener('click', () => {
                        if (onMarkerClickRef.current) onMarkerClickRef.current(index);
                    });
                    tooltipEl.addEventListener('mouseleave', () => {
                        if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
                    });
                    document.body.appendChild(tooltipEl);
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            if (tooltipEl) {
                                tooltipEl.style.opacity = '1';
                                tooltipEl.style.transform = 'translateX(-50%) translateY(-100%)';
                            }
                        });
                    });
                });

                el.addEventListener('mouseleave', () => {
                    setTimeout(() => {
                        if (tooltipEl && !tooltipEl.matches(':hover')) {
                            tooltipEl.remove();
                            tooltipEl = null;
                        }
                    }, 150);
                });

                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (onMarkerClickRef.current) onMarkerClickRef.current(index);
                });
            }

            markersRef.current.push(marker);
        });
    }, [markers, activeMarkerIndex]);

    // ============================================
    // LANDING MARKERS: Display circular markers at visited locations
    // Uses normalized coordinates to prevent duplicates
    // ============================================
    useEffect(() => {
        if (!map.current || !mapContainer.current) return;

        // Clear existing landing markers with fade out
        if (clearLandingMarkers) {
            landingMarkersRef.current.forEach(marker => {
                const el = marker.getElement();
                if (el) {
                    el.style.transition = 'opacity 1000ms ease-out';
                    el.style.opacity = '0';
                }
                setTimeout(() => marker.remove(), 1000);
            });
            landingMarkersRef.current = [];
            return;
        }

        // If the landing markers list has been emptied (e.g. story switch), remove
        // any markers still held in the ref — they were added imperatively and won't
        // be cleaned up automatically when React state becomes [].
        if (!landingMarkers || landingMarkers.length === 0) {
            landingMarkersRef.current.forEach(marker => marker.remove());
            landingMarkersRef.current = [];
            return;
        }

        // Add new landing markers - only process valid, non-null coordinates
        if (!Array.isArray(landingMarkers)) return;

        landingMarkers.forEach((item, idx) => {
            // Support both new { coordinates, chapterIndex } objects and legacy bare arrays
            const coord = item?.coordinates ?? item;
            const chapterIndex = item?.chapterIndex ?? 0;
            const normalized = normalizeCoordinatePair(coord);

            if (!normalized) return;

            // Check if marker already exists at this location (normalized comparison)
            const exists = landingMarkersRef.current.some(existingMarker => {
                const existingLngLat = existingMarker.getLngLat();
                return areCoordinatesEqual([existingLngLat.lat, existingLngLat.lng], normalized);
            });

            if (exists) return;

            try {
                const colorIdx = chapterIndex % CHAPTER_COLORS.length;
                const color = CHAPTER_COLORS[colorIdx];
                const el = document.createElement('div');
                el.style.cssText = `
                    width: 120px;
                    height: 120px;
                    border-radius: 50%;
                    background: rgba(${color.rgb}, 0.05);
                    border: 2px solid rgba(${color.rgb}, 0.3);
                    box-shadow: 0 0 20px rgba(${color.rgb}, 0.1);
                    opacity: 0;
                    transition: opacity 1000ms ease-in;
                    pointer-events: none;
                    z-index: 5;
                `;

                const marker = new mapboxgl.Marker(el)
                    .setLngLat([normalized[1], normalized[0]])
                    .addTo(map.current);

                // Trigger fade in after a short delay to sync with flyTo completion
                setTimeout(() => {
                    if (el) el.style.opacity = '1';
                }, (flyDuration || 12) * 1000 - 1000);

                landingMarkersRef.current.push(marker);
            } catch (error) {
                // Silently skip failed markers
            }
        });
    }, [landingMarkers, clearLandingMarkers, flyDuration]);

    // Toggle route line visibility
    useEffect(() => {
        if (!map.current || !map.current.isStyleLoaded()) return;
        const visibility = showRoute ? 'visible' : 'none';
        if (map.current.getLayer('route-line')) map.current.setLayoutProperty('route-line', 'visibility', visibility);
        if (map.current.getLayer('route-glow')) map.current.setLayoutProperty('route-glow', 'visibility', visibility);
    }, [showRoute]);

    // Toggle story marker visibility
    useEffect(() => {
        markersRef.current.forEach(marker => {
            marker.getElement().style.display = showMarkers ? '' : 'none';
        });
    }, [showMarkers]);

    // ============================================
    // LAYER VISIBILITY: Show/hide Mapbox layers based on active slide
    // ============================================
    useEffect(() => {
        if (!map.current || !map.current.isStyleLoaded() || !mapContainer.current) return;

        // Fade previous layer out if it exists and is different from current
        if (previousLayerId.current && previousLayerId.current !== activeLayerId) {
            fadeMapLayer(map.current, previousLayerId.current, false);
        }

        // Fade current layer in if it exists
        if (activeLayerId) {
            fadeMapLayer(map.current, activeLayerId, true);
        }

        previousLayerId.current = activeLayerId;
    }, [activeLayerId]);

    return (
        <div className="fixed inset-0 z-0" data-name="map-background-container">
            <div ref={mapContainer} className="h-full w-full" data-name="mapbox-container" />
            <style>{`
                @keyframes marker-pulse-0 {
                    0%   { box-shadow: 0 0 0 0px  rgba(217, 119,   6, 0.8), 0 2px 8px rgba(0,0,0,0.3); }
                    70%  { box-shadow: 0 0 0 22px rgba(217, 119,   6, 0),   0 2px 8px rgba(0,0,0,0.3); }
                    100% { box-shadow: 0 0 0 0px  rgba(217, 119,   6, 0),   0 2px 8px rgba(0,0,0,0.3); }
                }
                @keyframes marker-pulse-1 {
                    0%   { box-shadow: 0 0 0 0px  rgba( 37,  99, 235, 0.8), 0 2px 8px rgba(0,0,0,0.3); }
                    70%  { box-shadow: 0 0 0 22px rgba( 37,  99, 235, 0),   0 2px 8px rgba(0,0,0,0.3); }
                    100% { box-shadow: 0 0 0 0px  rgba( 37,  99, 235, 0),   0 2px 8px rgba(0,0,0,0.3); }
                }
                @keyframes marker-pulse-2 {
                    0%   { box-shadow: 0 0 0 0px  rgba( 22, 163,  74, 0.8), 0 2px 8px rgba(0,0,0,0.3); }
                    70%  { box-shadow: 0 0 0 22px rgba( 22, 163,  74, 0),   0 2px 8px rgba(0,0,0,0.3); }
                    100% { box-shadow: 0 0 0 0px  rgba( 22, 163,  74, 0),   0 2px 8px rgba(0,0,0,0.3); }
                }
                @keyframes marker-pulse-3 {
                    0%   { box-shadow: 0 0 0 0px  rgba(147,  51, 234, 0.8), 0 2px 8px rgba(0,0,0,0.3); }
                    70%  { box-shadow: 0 0 0 22px rgba(147,  51, 234, 0),   0 2px 8px rgba(0,0,0,0.3); }
                    100% { box-shadow: 0 0 0 0px  rgba(147,  51, 234, 0),   0 2px 8px rgba(0,0,0,0.3); }
                }
                @keyframes marker-pulse-4 {
                    0%   { box-shadow: 0 0 0 0px  rgba(225,  29,  72, 0.8), 0 2px 8px rgba(0,0,0,0.3); }
                    70%  { box-shadow: 0 0 0 22px rgba(225,  29,  72, 0),   0 2px 8px rgba(0,0,0,0.3); }
                    100% { box-shadow: 0 0 0 0px  rgba(225,  29,  72, 0),   0 2px 8px rgba(0,0,0,0.3); }
                }
                @keyframes marker-pulse-5 {
                    0%   { box-shadow: 0 0 0 0px  rgba( 13, 148, 136, 0.8), 0 2px 8px rgba(0,0,0,0.3); }
                    70%  { box-shadow: 0 0 0 22px rgba( 13, 148, 136, 0),   0 2px 8px rgba(0,0,0,0.3); }
                    100% { box-shadow: 0 0 0 0px  rgba( 13, 148, 136, 0),   0 2px 8px rgba(0,0,0,0.3); }
                }
                .mapbox-marker-active-0 { animation: marker-pulse-0 1.8s ease-out infinite !important; }
                .mapbox-marker-active-1 { animation: marker-pulse-1 1.8s ease-out infinite !important; }
                .mapbox-marker-active-2 { animation: marker-pulse-2 1.8s ease-out infinite !important; }
                .mapbox-marker-active-3 { animation: marker-pulse-3 1.8s ease-out infinite !important; }
                .mapbox-marker-active-4 { animation: marker-pulse-4 1.8s ease-out infinite !important; }
                .mapbox-marker-active-5 { animation: marker-pulse-5 1.8s ease-out infinite !important; }
                .mapbox-marker-inactive { opacity: 0.35; transition: opacity 300ms ease; }
                .mapbox-marker-inactive:hover { opacity: 1; }
            `}</style>
        </div>
    );
}