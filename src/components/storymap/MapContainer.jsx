import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { normalizeCoordinatePair, areCoordinatesEqual, isValidCoordinatePair } from '@/components/utils/coordinateUtils';

const MAPBOX_STYLE = 'mapbox://styles/stevebutton/clummsfw1002701mpbiw3exg7';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_API_KEY || 'pk.eyJ1Ijoic3RldmVidXR0b24iLCJhIjoiNEw1T183USJ9.Sv_1qSC23JdXot8YIRPi8A';

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
    routeCoordinates = [],
    clearRoute = false,
    onRouteCleared,
    offset = [0, 0],
    landingMarkers = [],
    clearLandingMarkers = false,
    activeLayerId = null
}) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markersRef = useRef([]);
    const rotationRef = useRef(null);
    const routeSourceAdded = useRef(false);
    const landingMarkersRef = useRef([]);
    const lineAnimationRef = useRef(null);
    const previousLayerId = useRef(null);
    const prevRouteLength = useRef(0);
    const onMarkerClickRef = useRef(onMarkerClick);
    onMarkerClickRef.current = onMarkerClick;

    // Initialize map
    useEffect(() => {
        if (map.current || !mapContainer.current) return;
        
        // Validate center coordinates
        const validCenter = (center && Array.isArray(center) && center.length === 2 && 
                           !isNaN(center[0]) && !isNaN(center[1]) && 
                           isFinite(center[0]) && isFinite(center[1]))
            ? [center[1], center[0]]
            : [-74.006, 40.7128];
        
        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: MAPBOX_STYLE,
            center: validCenter,
            zoom: zoom || 12,
            bearing: bearing || 0,
            pitch: pitch || 0,
            interactive: true,
            dragRotate: true,
            pitchWithRotate: true,
            fog: null
        });

        // Add navigation controls (zoom, compass, pitch)
        map.current.addControl(new mapboxgl.NavigationControl({
            visualizePitch: true
        }), 'bottom-left');

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

        // Always just fly to position without rotation
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
    }, [center, zoom, bearing, pitch, shouldRotate, flyDuration]);

    // ============================================
    // ROUTE LINE RENDERING: Draw and animate route line on map
    // Only animates the new segment (from prevRouteLength to current length)
    // ============================================
    useEffect(() => {
        if (!map.current || !map.current.isStyleLoaded() || !mapContainer.current) return;

        // Cancel any ongoing animation
        if (lineAnimationRef.current) {
            cancelAnimationFrame(lineAnimationRef.current);
            lineAnimationRef.current = null;
        }

        // Clear route if requested
        if (clearRoute) {
            if (map.current.getLayer('route-line')) {
                map.current.removeLayer('route-line');
            }
            if (map.current.getSource('route')) {
                map.current.removeSource('route');
            }
            routeSourceAdded.current = false;
            prevRouteLength.current = 0;
            if (onRouteCleared) onRouteCleared();
            return;
        }

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
                    data: {
                        type: 'Feature',
                        properties: {},
                        geometry: { type: 'LineString', coordinates: [] }
                    }
                });
            }

            if (!map.current.getLayer('route-line')) {
                map.current.addLayer({
                    id: 'route-line',
                    type: 'line',
                    source: 'route',
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: {
                        'line-color': '#d97706',
                        'line-width': 3,
                        'line-opacity': 0.8
                    }
                });
            }
            routeSourceAdded.current = true;
        }

        const source = map.current.getSource('route');
        if (!source) return;

        const prevLen = prevRouteLength.current;
        const totalLen = allLngLat.length;

        // If no new coordinates were added, just ensure source is up to date
        if (totalLen <= prevLen) {
            source.setData({
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: allLngLat }
            });
            return;
        }

        // Immediately show the static portion (all previously drawn coords)
        const staticCoords = allLngLat.slice(0, Math.max(prevLen, 1));
        source.setData({
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: staticCoords }
        });

        // Delay line animation so camera starts moving first, then line chases it
        const startDelay = 500;
        // Line duration matches flyTo minus the delay, so they finish together
        const flyMs = (flyDuration || 12) * 1000;
        const animationDuration = flyMs - startDelay;
        const newSegmentCoords = allLngLat.slice(Math.max(prevLen - 1, 0));

        // Same easing curve as the flyTo for synchronized feel
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
                    prevRouteLength.current = totalLen;
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
    }, [routeCoordinates, clearRoute, flyDuration]);

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
            const el = document.createElement('div');
            el.className = isActive ? 'mapbox-marker mapbox-marker-active' : 'mapbox-marker';
            el.style.cssText = `
                width: ${isActive ? '32px' : '24px'};
                height: ${isActive ? '32px' : '24px'};
                border-radius: 50%;
                background: ${isActive ? '#d97706' : '#475569'};
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                cursor: ${isActive ? 'default' : 'pointer'};
                pointer-events: auto;
                opacity: 0;
                transition: background 0.3s ease, width 0.3s ease, height 0.3s ease, opacity 500ms ease;
                z-index: ${isActive ? '10' : '8'};
            `;

            const marker = new mapboxgl.Marker(el)
                .setLngLat([markerData.coordinates[1], markerData.coordinates[0]])
                .addTo(map.current);

            // Fade in after marker is in the DOM
            requestAnimationFrame(() => {
                requestAnimationFrame(() => { if (el) el.style.opacity = '1'; });
            });

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
                        overflow: hidden;
                        cursor: pointer;
                        pointer-events: auto;
                        font-family: system-ui, sans-serif;
                        opacity: 0;
                        transition: opacity 1000ms ease, transform 1000ms ease;
                    `;
                    tooltipEl.innerHTML = `
                        ${markerData.image ? `<img src="${markerData.image}" alt="${markerData.title}" style="width: 100%; aspect-ratio: 4/3; object-fit: cover; display: block;" />` : ''}
                        <div style="padding: 8px 10px;">
                            <div style="font-weight: 600; font-size: 13px; color: #1e293b; line-height: 1.3;">${markerData.title}</div>
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

        // Add new landing markers - only process valid, non-null coordinates
        if (!landingMarkers || !Array.isArray(landingMarkers)) return;

        landingMarkers.forEach((coord, idx) => {
            const normalized = normalizeCoordinatePair(coord);
            
            if (!normalized) return;

            // Check if marker already exists at this location (normalized comparison)
            const exists = landingMarkersRef.current.some(existingMarker => {
                const existingLngLat = existingMarker.getLngLat();
                return areCoordinatesEqual([existingLngLat.lat, existingLngLat.lng], normalized);
            });
            
            if (exists) return;

            try {
                const el = document.createElement('div');
                el.style.cssText = `
                    width: 120px;
                    height: 120px;
                    border-radius: 50%;
                    background: rgba(217, 119, 6, 0.15);
                    border: 2px solid rgba(217, 119, 6, 0.4);
                    box-shadow: 0 0 20px rgba(217, 119, 6, 0.2);
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

    // ============================================
    // LAYER VISIBILITY: Show/hide Mapbox layers based on active slide
    // ============================================
    useEffect(() => {
        if (!map.current || !map.current.isStyleLoaded() || !mapContainer.current) return;

        // Hide previous layer if it exists and is different from current
        if (previousLayerId.current && previousLayerId.current !== activeLayerId) {
            try {
                if (map.current.getLayer(previousLayerId.current)) {
                    map.current.setLayoutProperty(previousLayerId.current, 'visibility', 'none');
                }
            } catch (error) {
                // Layer may have been removed
            }
        }

        // Show current layer if it exists
        if (activeLayerId) {
            try {
                if (map.current.getLayer(activeLayerId)) {
                    map.current.setLayoutProperty(activeLayerId, 'visibility', 'visible');
                }
            } catch (error) {
                // Layer may not exist in style
            }
        }

        previousLayerId.current = activeLayerId;
    }, [activeLayerId]);

    return (
        <div className="fixed inset-0 z-0" data-name="map-background-container">
            <div ref={mapContainer} className="h-full w-full" data-name="mapbox-container" />
            <style>{`
                .mapboxgl-ctrl-bottom-left {
                    z-index: 1000 !important;
                    bottom: 80px !important;
                    left: 16px !important;
                    pointer-events: auto !important;
                }
                .mapboxgl-ctrl-group {
                    background: rgba(255, 255, 255, 0.95) !important;
                    backdrop-filter: blur(12px) !important;
                    border-radius: 12px !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
                    border: 1px solid rgba(226, 232, 240, 0.5) !important;
                    display: flex !important;
                    flex-direction: row !important;
                }
                .mapboxgl-ctrl-group button {
                    width: 36px !important;
                    height: 36px !important;
                }
                .mapboxgl-ctrl-group button + button {
                    border-top: none !important;
                    border-left: 1px solid rgba(226, 232, 240, 0.5) !important;
                }
                @keyframes marker-pulse {
                    0%, 100% {
                        box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.5), 0 2px 8px rgba(0,0,0,0.3);
                    }
                    50% {
                        box-shadow: 0 0 16px 8px rgba(217, 119, 6, 0.25), 0 2px 8px rgba(0,0,0,0.3);
                    }
                }
                .mapbox-marker-active {
                    animation: marker-pulse 2s ease-in-out infinite !important;
                }
            `}</style>
        </div>
    );
}