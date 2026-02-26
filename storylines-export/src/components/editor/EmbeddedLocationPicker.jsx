import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Loader2 } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = 'pk.eyJ1Ijoic3RldmVidXR0b24iLCJhIjoiNEw1T183USJ9.Sv_1qSC23JdXot8YIRPi8A';
mapboxgl.accessToken = MAPBOX_TOKEN;

export default function EmbeddedLocationPicker({ location, onLocationChange }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        mapRef.current = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/stevebutton/clummsfw1002701mpbiw3exg7',
            center: [location.lng || 0, location.lat || 0],
            zoom: location.zoom || 12,
            bearing: location.bearing || 0,
            pitch: location.pitch || 0
        });

        mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        if (location.lat && location.lng) {
            markerRef.current = new mapboxgl.Marker({ color: '#d97706' })
                .setLngLat([location.lng, location.lat])
                .addTo(mapRef.current);
        }

        mapRef.current.on('click', (e) => {
            const { lng, lat } = e.lngLat;
            
            if (markerRef.current) {
                markerRef.current.setLngLat([lng, lat]);
            } else {
                markerRef.current = new mapboxgl.Marker({ color: '#d97706' })
                    .setLngLat([lng, lat])
                    .addTo(mapRef.current);
            }
        });

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (mapRef.current && location.lat && location.lng) {
            // Update marker position
            if (markerRef.current) {
                markerRef.current.setLngLat([location.lng, location.lat]);
            } else {
                markerRef.current = new mapboxgl.Marker({ color: '#d97706' })
                    .setLngLat([location.lng, location.lat])
                    .addTo(mapRef.current);
            }
            
            // Fly to new location
            mapRef.current.flyTo({
                center: [location.lng, location.lat],
                zoom: location.zoom || 12,
                bearing: location.bearing || 0,
                pitch: location.pitch || 0,
                duration: 1000
            });
        }
    }, [location.lat, location.lng, location.zoom, location.bearing, location.pitch]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        
        setIsSearching(true);
        try {
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&limit=5`
            );
            const data = await response.json();
            setSearchResults(data.features || []);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const selectSearchResult = (result) => {
        const [lng, lat] = result.center;
        
        if (mapRef.current) {
            mapRef.current.flyTo({ center: [lng, lat], zoom: 14 });
            
            if (markerRef.current) {
                markerRef.current.setLngLat([lng, lat]);
            } else {
                markerRef.current = new mapboxgl.Marker({ color: '#d97706' })
                    .setLngLat([lng, lat])
                    .addTo(mapRef.current);
            }
        }
        
        setSearchResults([]);
        setSearchQuery(result.place_name);
    };

    const captureCurrentView = () => {
        if (!mapRef.current) return;
        
        const center = mapRef.current.getCenter();
        const zoom = mapRef.current.getZoom();
        const bearing = mapRef.current.getBearing();
        const pitch = mapRef.current.getPitch();
        
        onLocationChange({
            lat: center.lat,
            lng: center.lng,
            zoom,
            bearing,
            pitch,
            name: location.name
        });
    };

    return (
        <div className="space-y-3">
            {/* Search bar */}
            <div className="relative">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search for a location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="pl-10"
                        />
                    </div>
                    <Button onClick={handleSearch} disabled={isSearching} variant="outline">
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                    </Button>
                </div>
                
                {/* Search results dropdown */}
                {searchResults.length > 0 && (
                    <div className="absolute top-full mt-1 w-full bg-white border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                        {searchResults.map((result) => (
                            <button
                                key={result.id}
                                onClick={() => selectSearchResult(result)}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-start gap-2 border-b last:border-0"
                            >
                                <MapPin className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                <span className="text-sm">{result.place_name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Map */}
            <div className="relative w-full h-96 rounded-lg overflow-hidden border">
                <div ref={mapContainerRef} className="absolute inset-0" />
                
                {/* Capture View Button */}
                <div className="absolute top-2 left-2 z-10">
                    <Button onClick={captureCurrentView} size="sm" className="bg-amber-600 hover:bg-amber-700 shadow-lg">
                        <MapPin className="w-4 h-4 mr-2" />
                        Capture Current View
                    </Button>
                </div>
                
                {/* Selected location info */}
                {location.lat && location.lng && (
                    <div className="absolute bottom-2 left-2 bg-white rounded-lg shadow-lg p-2 text-xs z-10">
                        <div className="flex items-center gap-1 mb-1">
                            <MapPin className="w-3 h-3 text-amber-600" />
                            <span className="text-slate-700">
                                {location.name || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
                            </span>
                        </div>
                        <div className="text-slate-500">
                            Zoom: {location.zoom?.toFixed(1)} | Bearing: {location.bearing?.toFixed(0)}° | Pitch: {location.pitch?.toFixed(0)}°
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}