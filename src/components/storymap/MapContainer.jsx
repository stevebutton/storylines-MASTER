import React, { useEffect } from 'react';
import { MapContainer as LeafletMapContainer, TileLayer, useMap, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue with Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const activeIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const defaultIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

function MapController({ center, zoom, bearing }) {
    const map = useMap();
    
    useEffect(() => {
        if (center && zoom) {
            map.flyTo(center, zoom, {
                duration: 5,
                easeLinearity: 0.25
            });
        }
    }, [center, zoom, map]);
    
    return null;
}

export default function MapBackground({ 
    center, 
    zoom, 
    bearing, 
    mapStyle, 
    markers = [], 
    activeMarkerIndex = -1,
    onMarkerClick 
}) {
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
                
                {markers.map((marker, index) => (
                    <Marker 
                        key={index}
                        position={marker.coordinates}
                        icon={index === activeMarkerIndex ? activeIcon : defaultIcon}
                        eventHandlers={{
                            click: () => onMarkerClick && onMarkerClick(index)
                        }}
                    >
                        <Popup>
                            <div className="min-w-[200px]">
                                {marker.image && (
                                    <img 
                                        src={marker.image} 
                                        alt={marker.title} 
                                        className="w-full h-24 object-cover rounded mb-2"
                                    />
                                )}
                                <h3 className="font-semibold text-slate-800">{marker.title}</h3>
                                {marker.location && (
                                    <p className="text-xs text-slate-500 mt-1">{marker.location}</p>
                                )}
                                {marker.description && (
                                    <p className="text-sm text-slate-600 mt-2 line-clamp-2">{marker.description}</p>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </LeafletMapContainer>
        </div>
    );
}