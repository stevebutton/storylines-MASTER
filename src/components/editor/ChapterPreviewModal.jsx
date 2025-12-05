import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, X, MapPin } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = 'pk.eyJ1Ijoic3RldmVidXR0b24iLCJhIjoiNEw1T183USJ9.Sv_1qSC23JdXot8YIRPi8A';
mapboxgl.accessToken = MAPBOX_TOKEN;

const MAP_STYLES = {
    light: 'mapbox://styles/mapbox/light-v11',
    dark: 'mapbox://styles/mapbox/dark-v11',
    satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
    watercolor: 'mapbox://styles/stevebutton/clummsfw1002701mpbiw3exg7',
    terrain: 'mapbox://styles/mapbox/outdoors-v12'
};

export default function ChapterPreviewModal({ isOpen, onClose, chapter, slides }) {
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);

    const activeSlide = slides[activeSlideIndex];
    const hasValidCoordinates = (coords) => 
        coords && Array.isArray(coords) && coords.length === 2 && 
        !isNaN(coords[0]) && !isNaN(coords[1]) && 
        coords[0] !== 0 && coords[1] !== 0;

    // Get current coordinates (slide or chapter fallback)
    const getCurrentCoordinates = () => {
        if (activeSlide && hasValidCoordinates(activeSlide.coordinates)) {
            return activeSlide.coordinates;
        }
        if (hasValidCoordinates(chapter?.coordinates)) {
            return chapter.coordinates;
        }
        return [40.78, -73.97]; // Default
    };

    const getCurrentZoom = () => {
        if (activeSlide?.zoom) return activeSlide.zoom;
        if (chapter?.zoom) return chapter.zoom;
        return 12;
    };

    // Initialize map
    useEffect(() => {
        if (!isOpen || !mapContainerRef.current) return;

        // Small delay to ensure container is rendered
        const timer = setTimeout(() => {
            if (mapRef.current) return;

            const coords = getCurrentCoordinates();
            const mapStyle = MAP_STYLES[chapter?.map_style] || MAP_STYLES.light;

            mapRef.current = new mapboxgl.Map({
                container: mapContainerRef.current,
                style: mapStyle,
                center: [coords[1], coords[0]], // [lng, lat]
                zoom: getCurrentZoom(),
                bearing: activeSlide?.bearing || 0,
                pitch: activeSlide?.pitch || 0
            });

            mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

            // Add marker
            markerRef.current = new mapboxgl.Marker({ color: '#d97706' })
                .setLngLat([coords[1], coords[0]])
                .addTo(mapRef.current);
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

    // Update map when slide changes
    useEffect(() => {
        if (!mapRef.current || !isOpen) return;

        const coords = getCurrentCoordinates();
        
        mapRef.current.flyTo({
            center: [coords[1], coords[0]],
            zoom: getCurrentZoom(),
            bearing: activeSlide?.bearing || 0,
            pitch: activeSlide?.pitch || 0,
            duration: 1500,
            essential: true
        });

        if (markerRef.current) {
            markerRef.current.setLngLat([coords[1], coords[0]]);
        }
    }, [activeSlideIndex, isOpen]);

    const goToSlide = (direction) => {
        if (direction === 'prev' && activeSlideIndex > 0) {
            setActiveSlideIndex(prev => prev - 1);
        } else if (direction === 'next' && activeSlideIndex < slides.length - 1) {
            setActiveSlideIndex(prev => prev + 1);
        }
    };

    // Reset slide index when modal opens
    useEffect(() => {
        if (isOpen) setActiveSlideIndex(0);
    }, [isOpen]);

    if (!chapter) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl w-[95vw] h-[85vh] p-0 overflow-hidden">
                <div className="relative w-full h-full flex">
                    {/* Map Section */}
                    <div className="flex-1 relative">
                        <div ref={mapContainerRef} className="absolute inset-0" />
                        
                        {/* Close button */}
                        <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => onClose(false)}
                            className="absolute top-4 left-4 z-10 bg-white/90 hover:bg-white shadow-lg"
                        >
                            <X className="w-4 h-4" />
                        </Button>

                        {/* Chapter info badge */}
                        <div className="absolute top-4 left-16 z-10">
                            <Badge className="bg-amber-600 text-white px-3 py-1">
                                Chapter Preview
                            </Badge>
                        </div>
                    </div>

                    {/* Content Panel */}
                    <div className="w-[380px] bg-white border-l flex flex-col">
                        {/* Slide Content */}
                        <div className="flex-1 overflow-y-auto">
                            {activeSlide ? (
                                <div className="p-0">
                                    {activeSlide.image && (
                                        <div className="w-full h-48 overflow-hidden">
                                            <img 
                                                src={activeSlide.image} 
                                                alt={activeSlide.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                    <div className="p-5">
                                        <h2 className="text-xl font-bold text-slate-800 mb-2">
                                            {activeSlide.title || 'Untitled Slide'}
                                        </h2>
                                        {activeSlide.location && (
                                            <p className="text-sm text-amber-600 mb-3 flex items-center gap-1">
                                                <MapPin className="w-4 h-4" />
                                                {activeSlide.location}
                                            </p>
                                        )}
                                        {activeSlide.description && (
                                            <p className="text-slate-600 leading-relaxed">
                                                {activeSlide.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-5 text-center text-slate-400">
                                    No slides in this chapter
                                </div>
                            )}
                        </div>

                        {/* Navigation */}
                        {slides.length > 0 && (
                            <div className="p-4 border-t bg-slate-50">
                                <div className="flex items-center justify-between">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => goToSlide('prev')}
                                        disabled={activeSlideIndex === 0}
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                                    </Button>
                                    
                                    <div className="flex items-center gap-1.5">
                                        {slides.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setActiveSlideIndex(idx)}
                                                className={`w-2 h-2 rounded-full transition-all ${
                                                    idx === activeSlideIndex 
                                                        ? 'bg-amber-600 w-4' 
                                                        : 'bg-slate-300 hover:bg-slate-400'
                                                }`}
                                            />
                                        ))}
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => goToSlide('next')}
                                        disabled={activeSlideIndex === slides.length - 1}
                                    >
                                        Next <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-500 text-center mt-2">
                                    Slide {activeSlideIndex + 1} of {slides.length}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}