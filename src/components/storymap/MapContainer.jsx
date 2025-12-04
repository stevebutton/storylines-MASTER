import React, { useEffect, useRef, useState } from 'react';

const MAPBOX_STYLE = 'mapbox://styles/stevebutton/clummsfw1002701mpbiw3exg7';
const MAPBOX_TOKEN = 'pk.eyJ1Ijoic3RldmVidXR0b24iLCJhIjoiY2x1anluMG45MDJhNjJqcGhkcHM3OTk1bCJ9.wJOlYFOnubfpWaHJBxNq-g';

// Inject Mapbox CSS and JS
const loadMapbox = () => {
    return new Promise((resolve) => {
        if (window.mapboxgl) {
            window.mapboxgl.accessToken = MAPBOX_TOKEN;
            resolve(window.mapboxgl);
            return;
        }

        // Add CSS
        if (!document.getElementById('mapbox-css')) {
            const link = document.createElement('link');
            link.id = 'mapbox-css';
            link.rel = 'stylesheet';
            link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
            document.head.appendChild(link);
        }

        // Add JS
        if (!document.getElementById('mapbox-js')) {
            const script = document.createElement('script');
            script.id = 'mapbox-js';
            script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
            script.onload = () => {
                window.mapboxgl.accessToken = MAPBOX_TOKEN;
                resolve(window.mapboxgl);
            };
            document.head.appendChild(script);
        }
    });
};

export default function MapBackground({ 
    center, 
    zoom, 
    bearing = 0, 
    markers = [], 
    activeMarkerIndex = -1,
    onMarkerClick 
}) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markersRef = useRef([]);

    // Initialize map
    useEffect(() => {
        if (map.current) return;
        
        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: MAPBOX_STYLE,
            center: center ? [center[1], center[0]] : [-74.006, 40.7128],
            zoom: zoom || 12,
            bearing: bearing,
            interactive: false
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
        if (!map.current || !center) return;
        
        map.current.flyTo({
            center: [center[1], center[0]],
            zoom: zoom || 12,
            bearing: bearing,
            duration: 2000,
            essential: true
        });
    }, [center, zoom, bearing]);

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
            <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />
        </div>
    );
}