import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loader2, Map } from 'lucide-react';

const MAPBOX_STYLE = 'mapbox://styles/stevebutton/clummsfw1002701mpbiw3exg7';
const MAPBOX_TOKEN = 'pk.eyJ1Ijoic3RldmVidXR0b24iLCJhIjoiNEw1T183USJ9.Sv_1qSC23JdXot8YIRPi8A';

mapboxgl.accessToken = MAPBOX_TOKEN;

export default function StoriesMap() {
    const navigate = useNavigate();
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markers = useRef([]);
    const [stories, setStories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStories();
    }, []);

    const loadStories = async () => {
        try {
            const [storiesData, chaptersData] = await Promise.all([
                base44.entities.Story.filter({ is_published: true }),
                base44.entities.Chapter.list('order')
            ]);

            // Attach coordinates to stories
            const storiesWithCoords = storiesData.map(story => {
                const storyChapters = chaptersData.filter(c => c.story_id === story.id);
                const firstChapterWithCoords = storyChapters.find(c => c.coordinates && c.coordinates.length === 2);
                
                return {
                    ...story,
                    coordinates: story.coordinates || firstChapterWithCoords?.coordinates || null
                };
            }).filter(s => s.coordinates);

            setStories(storiesWithCoords);
        } catch (error) {
            console.error('Failed to load stories:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!mapContainer.current || stories.length === 0) return;
        if (map.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: MAPBOX_STYLE,
            center: [0, 0],
            zoom: 2
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-left');

        // Wait for map to load before adding markers and fitting bounds
        map.current.on('load', () => {
            // Calculate bounds to fit all stories
            if (stories.length > 0) {
                const bounds = new mapboxgl.LngLatBounds();
                stories.forEach(story => {
                    if (story.coordinates) {
                        bounds.extend([story.coordinates[1], story.coordinates[0]]);
                    }
                });

                map.current.fitBounds(bounds, {
                    padding: { top: 100, bottom: 100, left: 100, right: 100 },
                    maxZoom: 12,
                    duration: 2000
                });
            }

            // Add markers after map is loaded
            addMarkers();
        });

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [stories]);

    const addMarkers = () => {
        if (!map.current || stories.length === 0) return;

        // Clear existing markers
        markers.current.forEach(marker => marker.remove());
        markers.current = [];

        // Add story markers
        stories.forEach((story) => {
            if (!story.coordinates) return;

            // Create marker element with thumbnail
            const el = document.createElement('div');
            el.className = 'story-marker';
            el.style.cssText = `
                width: 80px;
                height: 80px;
                border-radius: 12px;
                overflow: hidden;
                cursor: pointer;
                border: 3px solid white;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                transition: all 0.3s ease;
                background: linear-gradient(135deg, #d97706 0%, #ea580c 100%);
            `;

            if (story.hero_image) {
                el.style.backgroundImage = `url(${story.hero_image})`;
                el.style.backgroundSize = 'cover';
                el.style.backgroundPosition = 'center';
            }

            el.addEventListener('mouseenter', () => {
                el.style.transform = 'scale(1.15)';
                el.style.zIndex = '1000';
                el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
            });

            el.addEventListener('mouseleave', () => {
                el.style.transform = 'scale(1)';
                el.style.zIndex = 'auto';
                el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            });

            el.addEventListener('click', () => {
                navigate(`${createPageUrl('StoryMapView')}?id=${story.id}`);
            });

            // Create popup
            const popupContent = `
                <div style="min-width: 250px; font-family: system-ui, sans-serif;">
                    ${story.hero_image ? `
                        <img 
                            src="${story.hero_image}" 
                            alt="${story.title}" 
                            style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px; margin-bottom: 12px;" 
                        />
                    ` : ''}
                    <h3 style="font-weight: 600; color: #1e293b; margin: 0 0 6px 0; font-size: 16px;">${story.title}</h3>
                    ${story.subtitle ? `
                        <p style="font-size: 13px; color: #64748b; margin: 0 0 8px 0; line-height: 1.4;">${story.subtitle}</p>
                    ` : ''}
                    ${story.author ? `
                        <p style="font-size: 12px; color: #94a3b8; margin: 0;">By ${story.author}</p>
                    ` : ''}
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
                        <div style="display: inline-block; padding: 6px 12px; background: #d97706; color: white; border-radius: 6px; font-size: 12px; font-weight: 500;">
                            View Story →
                        </div>
                    </div>
                </div>
            `;

            const popup = new mapboxgl.Popup({ 
                offset: 45,
                closeButton: false,
                maxWidth: '300px'
            }).setHTML(popupContent);

            const marker = new mapboxgl.Marker(el)
                .setLngLat([story.coordinates[1], story.coordinates[0]])
                .setPopup(popup)
                .addTo(map.current);

            markers.current.push(marker);
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            </div>
        );
    }

    return (
        <div className="relative h-screen w-screen overflow-hidden">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-3">
                        <Map className="w-8 h-8 text-white" />
                        <div>
                            <h1 className="text-3xl font-light text-white">Explore Stories</h1>
                            <p className="text-white/80 text-sm mt-1">
                                {stories.length} {stories.length === 1 ? 'story' : 'stories'} to discover
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Map */}
            <div ref={mapContainer} className="h-full w-full" />

            {/* No Stories Message */}
            {stories.length === 0 && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                    <div className="text-center">
                        <Map className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-600 text-lg">No published stories available yet</p>
                    </div>
                </div>
            )}

            <style>{`
                .mapboxgl-marker > div {
                    transform: translate(-50%, -50%);
                }
                .mapboxgl-popup-content {
                    padding: 16px !important;
                    border-radius: 12px !important;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.2) !important;
                }
                .mapboxgl-popup-tip {
                    display: none !important;
                }
            `}</style>
        </div>
    );
}