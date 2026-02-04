import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_STYLE = 'mapbox://styles/stevebutton/clummsfw1002701mpbiw3exg7';
const MAPBOX_TOKEN = 'pk.eyJ1Ijoic3RldmVidXR0b24iLCJhIjoiNEw1T183USJ9.Sv_1qSC23JdXot8YIRPi8A';

mapboxgl.accessToken = MAPBOX_TOKEN;

export default function MapBackground({ 
    center, 
    zoom, 
    bearing = 0,
    pitch = 0, 
    markers = [], 
    activeMarkerIndex = -1,
    onMarkerClick,
    shouldRotate = false,
    flyDuration = 12
}) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markersRef = useRef([]);
    const rotationRef = useRef(null);

    // Initialize map
    useEffect(() => {
        if (map.current || !mapContainer.current) return;
        
        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: MAPBOX_STYLE,
            center: center ? [center[1], center[0]] : [-74.006, 40.7128],
            zoom: zoom || 12,
            bearing: bearing || 0,
            pitch: pitch || 0,
            interactive: true,
            dragRotate: true,
            pitchWithRotate: true
        });

        // Add navigation controls (zoom, compass, pitch)
        map.current.addControl(new mapboxgl.NavigationControl({
            visualizePitch: true
        }), 'top-left');

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    // Update map position
    useEffect(() => {
        if (!map.current || !center) return;

        // Cancel any ongoing rotation
        if (rotationRef.current) {
            cancelAnimationFrame(rotationRef.current);
            rotationRef.current = null;
        }

        const flyMs = (flyDuration || 12) * 1000;

        // Always just fly to position without rotation
        map.current.flyTo({
            center: [center[1], center[0]],
            zoom: zoom || 12,
            bearing: bearing || 0,
            pitch: pitch || 0,
            duration: flyMs,
            essential: true,
            easing: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        });

        return () => {
            if (rotationRef.current) {
                cancelAnimationFrame(rotationRef.current);
                rotationRef.current = null;
            }
        };
    }, [center, zoom, bearing, pitch, shouldRotate, flyDuration]);

    // Update markers
    useEffect(() => {
        if (!map.current) return;

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

    return (
        <div className="fixed inset-0 z-0">
            <div ref={mapContainer} className="h-full w-full" />
            <style>{`
                .mapboxgl-ctrl-top-left {
                    z-index: 1000 !important;
                    top: 80px !important;
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