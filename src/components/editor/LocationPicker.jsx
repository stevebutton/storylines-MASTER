import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, MapPin, Loader2 } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = 'pk.eyJ1Ijoic3RldmVidXR0b24iLCJhIjoiNEw1T183USJ9.Sv_1qSC23JdXot8YIRPi8A';
mapboxgl.accessToken = MAPBOX_TOKEN;

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
        if (!isOpen || !mapContainerRef.current) return;
        
        // Small delay to ensure dialog is fully rendered
        const timer = setTimeout(() => {
            if (mapRef.current) return;

            const initialCenter = coordinates && coordinates[0] && coordinates[1] 
                ? [coordinates[1], coordinates[0]] // Mapbox uses [lng, lat]
                : [-73.97, 40.78];

            mapRef.current = new mapboxgl.Map({
                container: mapContainerRef.current,
                style: 'mapbox://styles/stevebutton/clummsfw1002701mpbiw3exg7',
                center: initialCenter,
                zoom: 10
            });

            mapRef.current.on('load', () => {
                mapRef.current.resize();
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
        }, 100);

        return () => {
            clearTimeout(timer);
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