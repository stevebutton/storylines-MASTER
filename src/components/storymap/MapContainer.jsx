import React, { useEffect } from 'react';
import { MapContainer as LeafletMapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function MapController({ center, zoom, bearing }) {
    const map = useMap();
    
    useEffect(() => {
        if (center && zoom) {
            map.flyTo(center, zoom, {
                                duration: 10,
                                easeLinearity: 0.25
                            });
        }
    }, [center, zoom, map]);
    
    return null;
}

export default function MapBackground({ center, zoom, bearing, mapStyle }) {
    const tileStyles = {
        light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        watercolor: 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg',
        terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
    };

    return (
        <div className="fixed inset-0 z-0">
            <LeafletMapContainer
                center={center || [40.7128, -74.006]}
                zoom={zoom || 12}
                zoomControl={false}
                scrollWheelZoom={false}
                dragging={false}
                doubleClickZoom={false}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    url={tileStyles[mapStyle] || tileStyles.light}
                />
                <MapController center={center} zoom={zoom} bearing={bearing} />
            </LeafletMapContainer>
        </div>
    );
}