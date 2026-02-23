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
    flyDuration = 12,
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
        if (!map.current || !map.current.isStyleLoaded() || !mapContainer.current) return;
        
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

        // Coordinates are already normalized by StoryMapView — just filter out nulls/invalids
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

        // Animate only the new segment
        const animationDuration = (flyDuration || 12) * 1000 - 1000;
        const newSegmentCoords = allLngLat.slice(Math.max(prevLen - 1, 0));
        const startTime = performance.now();

        const animateLine = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / animationDuration, 1);

            const newCoordsToShow = Math.max(2, Math.floor(newSegmentCoords.length * progress));
            const visibleCoords = [
                ...allLngLat.slice(0, Math.max(prevLen, 1)),
                ...newSegmentCoords.slice(1, newCoordsToShow)
            ];

            source.setData({
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: visibleCoords }
            });

            if (progress < 1) {
                lineAnimationRef.current = requestAnimationFrame(animateLine);
            } else {
                prevRouteLength.current = totalLen;
                lineAnimationRef.current = null;
            }
        };

        lineAnimationRef.current = requestAnimationFrame(animateLine);

        return () => {
            if (lineAnimationRef.current) {
                cancelAnimationFrame(lineAnimationRef.current);
                lineAnimationRef.current = null;
            }
        };
    }, [routeCoordinates, clearRoute, flyDuration]);

    // Update markers
    useEffect(() => {
        if (!map.current || !mapContainer.current) return;

        // Remove existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        // Add new markers
        markers.forEach((markerData, index) => {
            const el = document.createElement('div');
            el.className = 'mapbox-marker';
            el.style.cssText = `
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: ${index === activeMarkerIndex ? '#d97706' : '#475569'};
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                cursor: pointer;
                transition: all 0.3s ease;
            `;

            if (index === activeMarkerIndex) {
                el.style.width = '32px';
                el.style.height = '32px';
                el.style.zIndex = '10';
            }

            const marker = new mapboxgl.Marker(el)
                .setLngLat([markerData.coordinates[1], markerData.coordinates[0]])
                .addTo(map.current);

            // Add popup
            const popupContent = `
                <div style="min-width: 200px; font-family: system-ui, sans-serif;">
                    ${markerData.image ? `<img src="${markerData.image}" alt="${markerData.title}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;" />` : ''}
                    <h3 style="font-weight: 600; color: #1e293b; margin: 0 0 4px 0;">${markerData.title}</h3>
                    ${markerData.location ? `<p style="font-size: 12px; color: #64748b; margin: 0;">${markerData.location}</p>` : ''}
                    ${markerData.description ? `<p style="font-size: 14px; color: #475569; margin: 8px 0 0 0; line-height: 1.4;">${markerData.description.substring(0, 100)}${markerData.description.length > 100 ? '...' : ''}</p>` : ''}
                </div>
            `;

            const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
                .setHTML(popupContent);

            marker.setPopup(popup);

            el.addEventListener('click', () => {
                if (onMarkerClick) onMarkerClick(index);
            });

            markersRef.current.push(marker);
        });
    }, [markers, activeMarkerIndex, onMarkerClick]);

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
            `}</style>
        </div>
    );
}