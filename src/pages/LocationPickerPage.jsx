import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Loader2, ArrowLeft, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = 'pk.eyJ1Ijoic3RldmVidXR0b24iLCJhIjoiNEw1T183USJ9.Sv_1qSC23JdXot8YIRPi8A';
mapboxgl.accessToken = MAPBOX_TOKEN;

export default function LocationPickerPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const returnTo = urlParams.get('returnTo') || 'StoryEditor';
    const storyId = urlParams.get('storyId') || '';
    const chapterId = urlParams.get('chapterId') || '';
    const slideId = urlParams.get('slideId') || '';
    const initialLat = parseFloat(urlParams.get('lat')) || 40.78;
    const initialLng = parseFloat(urlParams.get('lng')) || -73.97;

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const initialZoom = parseFloat(urlParams.get('zoom')) || 10;
    const initialBearing = parseFloat(urlParams.get('bearing')) || 0;
    const initialPitch = parseFloat(urlParams.get('pitch')) || 0;

    const [selectedLocation, setSelectedLocation] = useState(
        urlParams.get('lat') ? { lat: initialLat, lng: initialLng, zoom: initialZoom, bearing: initialBearing, pitch: initialPitch } : null
    );
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);

    // Initialize map on mount
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        mapRef.current = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/stevebutton/clummsfw1002701mpbiw3exg7',
            center: [initialLng, initialLat],
            zoom: initialZoom,
            bearing: initialBearing,
            pitch: initialPitch
        });

        mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Add marker if we have initial coordinates
        if (urlParams.get('lat')) {
            markerRef.current = new mapboxgl.Marker({ color: '#d97706' })
                .setLngLat([initialLng, initialLat])
                .addTo(mapRef.current);
        }

        // Click to place marker
        mapRef.current.on('click', (e) => {
            const { lng, lat } = e.lngLat;
            const zoom = mapRef.current.getZoom();
            const bearing = mapRef.current.getBearing();
            const pitch = mapRef.current.getPitch();
            
            if (markerRef.current) {
                markerRef.current.setLngLat([lng, lat]);
            } else {
                markerRef.current = new mapboxgl.Marker({ color: '#d97706' })
                    .setLngLat([lng, lat])
                    .addTo(mapRef.current);
            }
            
            setSelectedLocation({ lat, lng, zoom, bearing, pitch });
        });

        // Update zoom/bearing/pitch when map moves
        mapRef.current.on('moveend', () => {
            if (selectedLocation && markerRef.current) {
                const markerLngLat = markerRef.current.getLngLat();
                setSelectedLocation(prev => prev ? {
                    ...prev,
                    lat: markerLngLat.lat,
                    lng: markerLngLat.lng,
                    zoom: mapRef.current.getZoom(),
                    bearing: mapRef.current.getBearing(),
                    pitch: mapRef.current.getPitch()
                } : null);
            }
        });

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Search for locations
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

    // Select a search result
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
        
        const zoom = mapRef.current.getZoom();
        const bearing = mapRef.current.getBearing();
        const pitch = mapRef.current.getPitch();
        setSelectedLocation({ lat, lng, name: result.place_name, zoom, bearing, pitch });
        setSearchResults([]);
        setSearchQuery(result.place_name);
    };

    // Build return URL with selected location
    const getReturnUrl = () => {
        let url = `${returnTo}?`;
        if (storyId) url += `id=${storyId}&`;
        if (selectedLocation) {
            url += `pickedLat=${selectedLocation.lat}&pickedLng=${selectedLocation.lng}&`;
            url += `pickedZoom=${selectedLocation.zoom}&pickedBearing=${selectedLocation.bearing}&pickedPitch=${selectedLocation.pitch}&`;
            if (selectedLocation.name) url += `pickedName=${encodeURIComponent(selectedLocation.name)}&`;
        }
        if (chapterId) url += `chapterId=${chapterId}&`;
        if (slideId) url += `slideId=${slideId}&`;
        return url.slice(0, -1); // Remove trailing & or ?
    };

    return (
        <div className="h-screen flex flex-col bg-slate-100">
            {/* Header */}
            <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link 
                        to={createPageUrl(`${returnTo}${storyId ? `?id=${storyId}` : ''}`)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Link>
                    <h1 className="text-lg font-semibold text-slate-800">Pick Location</h1>
                </div>
                
                <Link to={createPageUrl(getReturnUrl())}>
                    <Button 
                        disabled={!selectedLocation}
                        className="bg-amber-600 hover:bg-amber-700"
                    >
                        <Check className="w-4 h-4 mr-2" />
                        Confirm Location
                    </Button>
                </Link>
            </div>

            {/* Search bar */}
            <div className="p-4 bg-white border-b">
                <div className="relative max-w-xl">
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
                        <Button onClick={handleSearch} disabled={isSearching}>
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
            </div>

            {/* Map */}
            <div className="flex-1 relative">
                <div ref={mapContainerRef} className="absolute inset-0" />
                
                {/* Selected location info */}
                {selectedLocation && (
                    <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10">
                        <div className="flex items-center gap-2 text-sm mb-1">
                            <MapPin className="w-4 h-4 text-amber-600" />
                            <span className="text-slate-700">
                                {selectedLocation.name || `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`}
                            </span>
                        </div>
                        <div className="text-xs text-slate-500">
                            Zoom: {selectedLocation.zoom?.toFixed(1)} | Bearing: {selectedLocation.bearing?.toFixed(0)}° | Pitch: {selectedLocation.pitch?.toFixed(0)}°
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}