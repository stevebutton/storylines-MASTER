import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, MapPin, Loader2, X } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_API_KEY;

export default function LocationPicker({ coordinates, onSelect }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);

    // Initialize map when dialog opens
    useEffect(() => {
        if (!isOpen || !mapContainerRef.current || mapRef.current) return;

        const initMap = async () => {
            const mapboxgl = (await import('https://cdn.jsdelivr.net/npm/mapbox-gl@3.0.1/+esm')).default;
            
            mapboxgl.accessToken = MAPBOX_TOKEN;

            const initialCenter = coordinates && coordinates[0] && coordinates[1] 
                ? [coordinates[1], coordinates[0]] // Mapbox uses [lng, lat]
                : [-73.97, 40.78];

            mapRef.current = new mapboxgl.Map({
                container: mapContainerRef.current,
                style: 'mapbox://styles/mapbox/streets-v12',
                center: initialCenter,
                zoom: 10
            });

            mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

            // Add marker if coordinates exist
            if (coordinates && coordinates[0] && coordinates[1]) {
                markerRef.current = new mapboxgl.Marker({ color: '#d97706' })
                    .setLngLat(initialCenter)
                    .addTo(mapRef.current);
                setSelectedLocation({ lat: coordinates[0], lng: coordinates[1] });
            }

            // Click to place marker
            mapRef.current.on('click', (e) => {
                const { lng, lat } = e.lngLat;
                
                if (markerRef.current) {
                    markerRef.current.setLngLat([lng, lat]);
                } else {
                    markerRef.current = new mapboxgl.Marker({ color: '#d97706' })
                        .setLngLat([lng, lat])
                        .addTo(mapRef.current);
                }
                
                setSelectedLocation({ lat, lng });
            });
        };

        initMap();

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                markerRef.current = null;
            }
        };
    }, [isOpen]);

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
    const selectSearchResult = async (result) => {
        const [lng, lat] = result.center;
        
        if (mapRef.current) {
            mapRef.current.flyTo({ center: [lng, lat], zoom: 14 });
            
            const mapboxgl = (await import('https://cdn.jsdelivr.net/npm/mapbox-gl@3.0.1/+esm')).default;
            
            if (markerRef.current) {
                markerRef.current.setLngLat([lng, lat]);
            } else {
                markerRef.current = new mapboxgl.Marker({ color: '#d97706' })
                    .setLngLat([lng, lat])
                    .addTo(mapRef.current);
            }
        }
        
        setSelectedLocation({ lat, lng, name: result.place_name });
        setSearchResults([]);
        setSearchQuery(result.place_name);
    };

    // Confirm selection
    const handleConfirm = () => {
        if (selectedLocation) {
            onSelect([selectedLocation.lat, selectedLocation.lng], selectedLocation.name);
            setIsOpen(false);
        }
    };

    const handleOpenChange = (open) => {
        setIsOpen(open);
        if (!open) {
            // Clean up on close
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                markerRef.current = null;
            }
            setSearchResults([]);
            setSearchQuery('');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                    <MapPin className="w-4 h-4 mr-1" /> Pick Location
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl h-[600px] flex flex-col p-0">
                <DialogHeader className="p-4 pb-0">
                    <DialogTitle>Choose Location</DialogTitle>
                </DialogHeader>
                
                <div className="p-4 space-y-3 flex-1 flex flex-col">
                    {/* Search */}
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

                    {/* Map */}
                    <div 
                        ref={mapContainerRef} 
                        className="flex-1 rounded-lg overflow-hidden border"
                        style={{ minHeight: '350px' }}
                    />

                    {/* Selected location info */}
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-600">
                            {selectedLocation ? (
                                <span className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-amber-600" />
                                    Lat: {selectedLocation.lat.toFixed(4)}, Lng: {selectedLocation.lng.toFixed(4)}
                                </span>
                            ) : (
                                <span className="text-slate-400">Click on the map or search to select a location</span>
                            )}
                        </div>
                        <Button 
                            onClick={handleConfirm} 
                            disabled={!selectedLocation}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            Confirm Location
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}