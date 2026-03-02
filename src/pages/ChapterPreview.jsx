import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, ArrowLeft, MapPin, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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

export default function ChapterPreview() {
    const urlParams = new URLSearchParams(window.location.search);
    const storyId = urlParams.get('storyId');
    const chapterId = urlParams.get('chapterId');

    const [chapter, setChapter] = useState(null);
    const [slides, setSlides] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);

    const activeSlide = slides[activeSlideIndex];

    const hasValidCoordinates = (coords) => 
        coords && Array.isArray(coords) && coords.length === 2 && 
        !isNaN(coords[0]) && !isNaN(coords[1]) && 
        coords[0] !== 0 && coords[1] !== 0;

    const getCurrentCoordinates = () => {
        if (activeSlide && hasValidCoordinates(activeSlide.coordinates)) {
            return activeSlide.coordinates;
        }
        if (hasValidCoordinates(chapter?.coordinates)) {
            return chapter.coordinates;
        }
        return [40.78, -73.97];
    };

    const getCurrentZoom = () => {
        if (activeSlide?.zoom) return activeSlide.zoom;
        if (chapter?.zoom) return chapter.zoom;
        return 12;
    };

    // Load data
    useEffect(() => {
        const loadData = async () => {
            if (!chapterId) return;
            
            setIsLoading(true);
            try {
                const [{ data: chapterData }, { data: slidesData }] = await Promise.all([
                    supabase.from('chapters').select('*').eq('id', chapterId).limit(1),
                    supabase.from('slides').select('*').eq('chapter_id', chapterId).order('order')
                ]);
                
                if (chapterData?.length > 0) {
                    setChapter(chapterData[0]);
                }
                setSlides(slidesData || []);
            } catch (error) {
                console.error('Failed to load chapter:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        loadData();
    }, [chapterId]);

    // Initialize map after data loads
    useEffect(() => {
        if (isLoading || !mapContainerRef.current || mapRef.current) return;

        const coords = getCurrentCoordinates();
        const mapStyle = MAP_STYLES[chapter?.map_style] || MAP_STYLES.light;

        mapRef.current = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: mapStyle,
            center: [coords[1], coords[0]],
            zoom: getCurrentZoom(),
            bearing: activeSlide?.bearing || 0,
            pitch: activeSlide?.pitch || 0
        });

        mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        markerRef.current = new mapboxgl.Marker({ color: '#d97706' })
            .setLngLat([coords[1], coords[0]])
            .addTo(mapRef.current);

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                markerRef.current = null;
            }
        };
    }, [isLoading, chapter]);

    // Update map when slide changes
    useEffect(() => {
        if (!mapRef.current || isLoading) return;

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
    }, [activeSlideIndex]);

    const goToSlide = (direction) => {
        if (direction === 'prev' && activeSlideIndex > 0) {
            setActiveSlideIndex(prev => prev - 1);
        } else if (direction === 'next' && activeSlideIndex < slides.length - 1) {
            setActiveSlideIndex(prev => prev + 1);
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') goToSlide('prev');
            if (e.key === 'ArrowRight') goToSlide('next');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeSlideIndex, slides.length]);

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-100">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            </div>
        );
    }

    if (!chapter) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-100 gap-4">
                <p className="text-slate-500">Chapter not found</p>
                <Link to={createPageUrl(`StoryEditor?id=${storyId}`)}>
                    <Button variant="outline">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Editor
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="h-screen flex">
            {/* Map Section */}
            <div className="flex-1 relative">
                <div ref={mapContainerRef} className="absolute inset-0" />
                
                {/* Back button */}
                <Link to={createPageUrl(`StoryEditor?id=${storyId}`)}>
                    <Button
                        variant="secondary"
                        className="absolute top-4 left-4 z-10 bg-white/90 hover:bg-white shadow-lg"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Editor
                    </Button>
                </Link>

                {/* Chapter info badge */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-amber-600 text-white px-4 py-1.5 text-sm">
                        Chapter Preview Mode
                    </Badge>
                </div>
            </div>

            {/* Content Panel */}
            <div className="w-[400px] bg-white border-l flex flex-col shadow-xl">
                {/* Slide Content */}
                <div className="flex-1 overflow-y-auto">
                    {activeSlide ? (
                        <div>
                            {activeSlide.image && (
                                <div className="w-full h-56 overflow-hidden">
                                    <img 
                                        src={activeSlide.image} 
                                        alt={activeSlide.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                            <div className="p-6">
                                <h2 className="text-2xl font-bold text-slate-800 mb-3">
                                    {activeSlide.title || 'Untitled Slide'}
                                </h2>
                                {activeSlide.location && (
                                    <p className="text-sm text-amber-600 mb-4 flex items-center gap-1.5">
                                        <MapPin className="w-4 h-4" />
                                        {activeSlide.location}
                                    </p>
                                )}
                                {activeSlide.description && (
                                    <p className="text-slate-600 leading-relaxed text-base">
                                        {activeSlide.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 text-center text-slate-400 h-full flex items-center justify-center">
                            <div>
                                <p className="mb-2">No slides in this chapter</p>
                                <Link to={createPageUrl(`StoryEditor?id=${storyId}`)}>
                                    <Button variant="outline" size="sm">Add Slides</Button>
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                {slides.length > 0 && (
                    <div className="p-5 border-t bg-slate-50">
                        <div className="flex items-center justify-between">
                            <Button
                                variant="outline"
                                onClick={() => goToSlide('prev')}
                                disabled={activeSlideIndex === 0}
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                            </Button>
                            
                            <div className="flex items-center gap-2">
                                {slides.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveSlideIndex(idx)}
                                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                                            idx === activeSlideIndex 
                                                ? 'bg-amber-600 w-5' 
                                                : 'bg-slate-300 hover:bg-slate-400'
                                        }`}
                                    />
                                ))}
                            </div>

                            <Button
                                variant="outline"
                                onClick={() => goToSlide('next')}
                                disabled={activeSlideIndex === slides.length - 1}
                            >
                                Next <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                        <p className="text-sm text-slate-500 text-center mt-3">
                            Slide {activeSlideIndex + 1} of {slides.length} • Use arrow keys to navigate
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}