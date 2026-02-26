import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import MapBackground from '@/components/storymap/MapContainer';
import StoryChapter from '@/components/storymap/StoryChapter';
import ChapterNavigation from '@/components/storymap/ChapterNavigation';
import StoryHeader from '@/components/storymap/StoryHeader';
import StoryFooter from '@/components/storymap/StoryFooter';
import StoryMapBanner from '@/components/storymap/StoryMapBanner';
import ChapterProgress from '@/components/storymap/ChapterProgress';
import FloatingStorySlideshow from '@/components/storymap/FloatingStorySlideshow';
import ProjectDescriptionSection from '@/components/storymap/ProjectDescriptionSection';
import LiveMapEditor from '@/components/storymap/LiveMapEditor';

import DocumentManagerContent from '@/components/documents/DocumentManagerContent';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';
import { normalizeCoordinatePair, areCoordinatesEqual, isValidCoordinatePair } from '@/components/utils/coordinateUtils';
import { useSearchParams } from 'react-router-dom';

// Straight-line distance in metres between two [lat, lng] points (Haversine formula).
function haversineMetres([lat1, lng1], [lat2, lng2]) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
            + Math.cos(lat1 * Math.PI / 180)
            * Math.cos(lat2 * Math.PI / 180)
            * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}

// Build a cumulative route array from an ordered list of visited coordinates,
// stitching in cached road segments where available and falling back to
// straight-line steps for any segment not yet fetched.
function buildRouteFromVisited(visited, segCache) {
    if (!visited || visited.length === 0) return [];
    let route = [visited[0]];
    for (let i = 1; i < visited.length; i++) {
        const f = visited[i - 1];
        const t = visited[i];
        const sk = `${f[1].toFixed(5)},${f[0].toFixed(5)}→${t[1].toFixed(5)},${t[0].toFixed(5)}`;
        const seg = segCache[sk];
        if (Array.isArray(seg) && seg.length >= 2) {
            route = [...route, ...seg.slice(1)]; // road-following; skip duplicate start point
        } else {
            route = [...route, t]; // straight-line fallback
        }
    }
    return route;
}

export default function StoryMapView() {
    const [searchParams] = useSearchParams();
    const storyId = searchParams.get('id');

    const [story, setStory] = useState(null);
    const [chapters, setChapters] = useState([]);
    const [relatedStories, setRelatedStories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeChapter, setActiveChapter] = useState(-1);
    const [mapConfig, setMapConfig] = useState({
        center: [0, 0],
        zoom: 2,
        mapStyle: 'light',
        bearing: 0,
        pitch: 0,
        shouldRotate: false,
        flyDuration: 8,
        offset: [-200, 0]
    });
    const [activeLayerId, setActiveLayerId] = useState(null);
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [clearRoute, setClearRoute] = useState(false);
    const previousChapterRef = useRef(-1);
    const [landingMarkers, setLandingMarkers] = useState([]);
    const [clearLandingMarkers, setClearLandingMarkers] = useState(false);
    const [isChapterMenuOpen, setIsChapterMenuOpen] = useState(false);
    const [isBannerVisible, setIsBannerVisible] = useState(false);
    const [isStorySlideshowOpen, setIsStorySlideshowOpen] = useState(false);
    const [showLibraryModal, setShowLibraryModal] = useState(false);
    const [heroMediaLoaded, setHeroMediaLoaded] = useState(false);
    const [showBlackOverlay, setShowBlackOverlay] = useState(true);
    const [hasExplored, setHasExplored] = useState(false);
    const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
    const [storyMarkers, setStoryMarkers] = useState([]);
    const [activeMarkerIdx, setActiveMarkerIdx] = useState(-1);
    const [targetSlide, setTargetSlide] = useState(null);

    const [activeSlide, setActiveSlide] = useState(null);
    const [isLiveEditorOpen, setIsLiveEditorOpen] = useState(false);
    const mapInstanceRef = useRef(null);

    const chapterRefs = useRef([]);
    const containerRef = useRef(null);
    const projectDescriptionRef = useRef(null);
    // Per-chapter ordered list of slide coordinates the user has visited.
    // Reset to [] each time the chapter activates. Used to rebuild route progressively.
    const visitedSlideCoordsRef = useRef({});  // { [chKey]: [[lat,lng],...] }
    // Road segment cache keyed by "lng1,lat1→lng2,lat2" (5dp).
    // null = fetch in-progress or failed (straight-line used); Array = road geometry
    const segmentCacheRef = useRef({});
    // Tracks the currently active chapter index so async route callbacks can
    // check whether the chapter is still active before applying the result
    const currentActiveChapterRef = useRef(-1);
    // Prevents the onSlideChange isActive-effect call from restarting a flyTo
    // that onContinue/onExplore already started for the initial chapter activation.
    const suppressNextOnSlideChangeMapConfig = useRef(false);
    // Tracks the previous storyId so we can detect a story switch.
    const prevStoryIdRef = useRef(null);
    // Holds the pending setShowBlackOverlay(false) timeout so we can cancel it on story switch.
    const overlayTimeoutRef = useRef(null);

    // When storyId changes (SPA story switch via navigate()), immediately raise
    // the black overlay and reset all per-story visual state so the old story
    // is never visible through the overlay. useLayoutEffect fires synchronously
    // before the browser paints, closing any gap between the overlay disappearing
    // in FloatingStorySlideshow and it appearing here.
    useLayoutEffect(() => {
        if (prevStoryIdRef.current !== null && prevStoryIdRef.current !== storyId) {
            // Cancel any pending overlay-fade from the previous story
            if (overlayTimeoutRef.current) {
                clearTimeout(overlayTimeoutRef.current);
                overlayTimeoutRef.current = null;
            }
            setShowBlackOverlay(true);
            setActiveChapter(-1);
            setHasExplored(false);
            setHeroMediaLoaded(false);
            setIsBannerVisible(false);
            setIsStorySlideshowOpen(false);
            setIsFullScreenOpen(false);
            setStoryMarkers([]);
            setActiveMarkerIdx(-1);
            setTargetSlide(null);
            setActiveLayerId(null);
            setRouteCoordinates([]);
            setClearRoute(false);
            setLandingMarkers([]);
            setIsChapterMenuOpen(false);
            previousChapterRef.current = -1;
            currentActiveChapterRef.current = -1;
            visitedSlideCoordsRef.current = {};
            segmentCacheRef.current = {};
            suppressNextOnSlideChangeMapConfig.current = false;
            chapterRefs.current = [];
            window.scrollTo(0, 0);
        }
        prevStoryIdRef.current = storyId;
    }, [storyId]);

    useEffect(() => {
        loadStory();
    }, [storyId]);

    // Set initial map config from story opening view — jump instantly (no animation)
    // because the black overlay is covering the map at this point
    useEffect(() => {
        if (story && story.coordinates) {
            setMapConfig(prev => ({
                ...prev,
                center: story.coordinates,
                zoom: story.zoom || 2,
                mapStyle: story.map_style || 'light',
                bearing: story.bearing || 0,
                pitch: story.pitch || 0,
                instant: true
            }));
        }
    }, [story]);

    // Update og:image meta tag for social media sharing
    useEffect(() => {
        if (story && story.hero_image) {
            // Update or create og:image meta tag
            let ogImage = document.querySelector('meta[property="og:image"]');
            if (!ogImage) {
                ogImage = document.createElement('meta');
                ogImage.setAttribute('property', 'og:image');
                document.head.appendChild(ogImage);
            }
            ogImage.setAttribute('content', story.hero_image);

            // Also set og:title
            let ogTitle = document.querySelector('meta[property="og:title"]');
            if (!ogTitle) {
                ogTitle = document.createElement('meta');
                ogTitle.setAttribute('property', 'og:title');
                document.head.appendChild(ogTitle);
            }
            ogTitle.setAttribute('content', story.title);

            // And og:description
            let ogDescription = document.querySelector('meta[property="og:description"]');
            if (!ogDescription) {
                ogDescription = document.createElement('meta');
                ogDescription.setAttribute('property', 'og:description');
                document.head.appendChild(ogDescription);
            }
            ogDescription.setAttribute('content', story.subtitle || story.title);

            // Twitter card meta tags
            let twitterCard = document.querySelector('meta[name="twitter:card"]');
            if (!twitterCard) {
                twitterCard = document.createElement('meta');
                twitterCard.setAttribute('name', 'twitter:card');
                document.head.appendChild(twitterCard);
            }
            twitterCard.setAttribute('content', 'summary_large_image');

            let twitterImage = document.querySelector('meta[name="twitter:image"]');
            if (!twitterImage) {
                twitterImage = document.createElement('meta');
                twitterImage.setAttribute('name', 'twitter:image');
                document.head.appendChild(twitterImage);
            }
            twitterImage.setAttribute('content', story.hero_image);
        }
    }, [story]);

    const loadStory = async () => {
        if (!storyId) {
            setIsLoading(false);
            return;
        }

        try {
            const [storyData, chaptersData, slidesData] = await Promise.all([
                base44.entities.Story.filter({ id: storyId }),
                base44.entities.Chapter.filter({ story_id: storyId }, 'order'),
                base44.entities.Slide.list('order')
            ]);

            if (storyData.length > 0) {
                setStory(storyData[0]);
                
                // Fetch related stories in the same category
                const currentStory = storyData[0];
                if (currentStory.category) {
                    const allStoriesInCategory = await base44.entities.Story.filter({
                        category: currentStory.category,
                        is_published: true
                    });
                    
                    // Exclude current story and limit to 4 suggestions
                    const related = allStoriesInCategory
                        .filter(s => s.id !== currentStory.id)
                        .slice(0, 4);
                    setRelatedStories(related);
                }
            }

            // Attach slides to chapters
            const chapterIds = chaptersData.map(c => c.id);
            const relevantSlides = slidesData.filter(s => chapterIds.includes(s.chapter_id));
            
            const chaptersWithSlides = chaptersData.map(chapter => ({
                ...chapter,
                slides: relevantSlides
                    .filter(s => s.chapter_id === chapter.id)
                    .sort((a, b) => a.order - b.order)
                    .map(s => ({
                        id: s.id,
                        image: s.image,
                        title: s.title,
                        description: s.description,
                        location: s.location,
                        coordinates: s.coordinates,
                        zoom: s.zoom,
                        bearing: s.bearing,
                        pitch: s.pitch,
                        fly_duration: s.fly_duration,
                        pdf_url: s.pdf_url,
                        video_url: s.video_url,
                        video_thumbnail_url: s.video_thumbnail_url,
                        mapbox_layer_id: s.mapbox_layer_id,
                        extended_content: s.extended_content
                    }))
            }));

            setChapters(chaptersWithSlides);
        } catch (error) {
            console.error('Failed to load story:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (chapters.length === 0) return;

        const handleScroll = () => {
            const scrollPosition = window.scrollY + window.innerHeight / 2;
            
            // Show banner once we've scrolled past the header (first screen)
            const headerHeight = window.innerHeight;
            setIsBannerVisible(window.scrollY > headerHeight * 0.5);

            chapterRefs.current.forEach((ref, index) => {
                if (ref) {
                    const rect = ref.getBoundingClientRect();
                    const elementTop = rect.top + window.scrollY;
                    const elementBottom = elementTop + rect.height;
                    
                    if (scrollPosition >= elementTop && scrollPosition < elementBottom) {
                        if (activeChapter !== index) {
                            // Save BEFORE overwriting so we can check if this is the initial activation
                            const prevChapterIdx = previousChapterRef.current;

                            // Check if we're moving to a new chapter
                            if (prevChapterIdx !== -1 && prevChapterIdx !== index) {
                                // Clear route when moving to a new chapter (but keep landing markers)
                                setClearRoute(true);
                                setRouteCoordinates([]);
                            }

                            previousChapterRef.current = index;
                            setActiveChapter(index);
                            setStoryMarkers([]);
                            setActiveMarkerIdx(-1);
                            const chapter = chapters[index];

                            const firstSlide = chapter.slides?.[0];

                            // Track active chapter for async route callbacks
                            currentActiveChapterRef.current = index;

                            if (story.show_route !== false) {
                                const cacheKey = chapter.id || `ch-${index}`;
                                // Reset visited coords so the route re-draws progressively from
                                // the first slide. Previously cached road segments are reused.
                                visitedSlideCoordsRef.current[cacheKey] = [];
                            }

                            // Only update map for chapter-to-chapter transitions.
                            // The initial hero/description→chapter0 activation is already
                            // handled by onExplore/onContinue — skip it here to avoid
                            // restarting the flyTo mid-flight (double jump).
                            if (prevChapterIdx !== -1 &&
                                firstSlide?.coordinates && Array.isArray(firstSlide.coordinates) &&
                                firstSlide.coordinates.length === 2 &&
                                !isNaN(firstSlide.coordinates[0]) && !isNaN(firstSlide.coordinates[1])) {
                                setMapConfig({
                                    center: firstSlide.coordinates,
                                    offset: [-200, 0],
                                    zoom: firstSlide?.zoom || 12,
                                    bearing: firstSlide?.bearing || 0,
                                    pitch: firstSlide?.pitch || 0,
                                    mapStyle: story.map_style || 'light',
                                    shouldRotate: true,
                                    flyDuration: firstSlide?.fly_duration || 8
                                });
                            }
                        }
                    }
                }
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [activeChapter, chapters]);

    const navigateToChapter = (index) => {
        const element = chapterRefs.current[index];
        if (!element) return;
        
        const elementRect = element.getBoundingClientRect();
        const absoluteElementTop = elementRect.top + window.scrollY;
        const targetPosition = absoluteElementTop - (window.innerHeight / 2) + (elementRect.height / 2);
        
        const startPosition = window.scrollY;
        const distance = targetPosition - startPosition;
        const duration = 2000;
        let startTime = null;
        
        const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        
        const animateScroll = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeInOutCubic(progress);
            
            window.scrollTo(0, startPosition + (distance * easedProgress));
            
            if (progress < 1) {
                requestAnimationFrame(animateScroll);
            }
        };
        
        requestAnimationFrame(animateScroll);
    };



    const scrollToProjectDescription = () => {
        const element = projectDescriptionRef.current;
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const absoluteTop = rect.top + window.scrollY;
        const startPosition = window.scrollY;
        const distance = absoluteTop - startPosition;
        const duration = 3000;
        let startTime = null;
        const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const animateScroll = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            window.scrollTo(0, startPosition + (distance * easeInOutCubic(progress)));
            if (progress < 1) requestAnimationFrame(animateScroll);
        };
        requestAnimationFrame(animateScroll);
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            </div>
        );
    }

    if (!story) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <p className="text-slate-500">Story not found</p>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="relative" data-name="main-container">
            {/* Black Overlay - Fades out when hero loads; shows spinner while story data loads */}
            <AnimatePresence>
                {showBlackOverlay && (
                    <motion.div
                        data-name="black-overlay"
                        className="fixed inset-0 bg-black z-[10001] pointer-events-none flex items-center justify-center"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                    >
                        <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top Banner */}
            <div className="pointer-events-auto" data-name="banner-wrapper">
            <StoryMapBanner
                isVisible={isBannerVisible}
                storyTitle={story.title}
                hasExplored={hasExplored}
                storyId={storyId}
                isShareable={story.is_shareable}
                isChapterMenuOpen={isChapterMenuOpen}
                onToggleChapterMenu={() => setIsChapterMenuOpen(!isChapterMenuOpen)}
                hasChapters={chapters.length > 0}
            />
            </div>



            {/* Map Background */}
            <MapBackground
                center={mapConfig.center}
                zoom={mapConfig.zoom}
                bearing={mapConfig.bearing}
                pitch={mapConfig.pitch}
                mapStyle={mapConfig.mapStyle}
                shouldRotate={mapConfig.shouldRotate}
                flyDuration={mapConfig.flyDuration}
                instant={mapConfig.instant}
                routeCoordinates={routeCoordinates}
                clearRoute={clearRoute}
                onRouteCleared={() => setClearRoute(false)}
                offset={mapConfig.offset}
                landingMarkers={landingMarkers}
                clearLandingMarkers={clearLandingMarkers}
                activeLayerId={activeLayerId}
                activeChapter={activeChapter}
                markers={storyMarkers}
                activeMarkerIndex={activeMarkerIdx}
                onMarkerClick={(markerIndex) => {
                    const marker = storyMarkers[markerIndex];
                    if (marker) {
                        navigateToChapter(marker.chapterIndex);
                        setTargetSlide({ chapter: marker.chapterIndex, slide: marker.slideIndex });
                    }
                }}
                onMapReady={(mapInstance) => { mapInstanceRef.current = mapInstance; }}
            />
            
            {/* Story Content */}
            <div className="relative z-[60] pointer-events-none" data-name="story-content-container">
                {/* Header */}
                <div className="pointer-events-auto" data-name="header-wrapper">
                <StoryHeader
                    title={story.title}
                    subtitle={story.subtitle}
                    author={story.author}
                    heroImage={story.hero_image}
                    heroVideo={story.hero_video}
                    heroType={story.hero_type}
                    heroVideoLoop={story.hero_video_loop}
                    onExplore={() => {
                        setHasExplored(true);
                        if (story.story_description) {
                            scrollToProjectDescription();
                        } else {
                            navigateToChapter(0);
                            if (chapters.length > 0 && chapters[0].slides?.length > 0) {
                                const firstSlide = chapters[0].slides[0];
                                if (firstSlide.coordinates && Array.isArray(firstSlide.coordinates) &&
                                    firstSlide.coordinates.length === 2 &&
                                    !isNaN(firstSlide.coordinates[0]) && !isNaN(firstSlide.coordinates[1])) {
                                    // Suppress the redundant setMapConfig that fires via
                                    // the isActive effect → onSlideChange when chapter 0 activates
                                    suppressNextOnSlideChangeMapConfig.current = true;
                                    setMapConfig({
                                        center: firstSlide.coordinates,
                                        offset: [-200, 0],
                                        zoom: firstSlide.zoom || 12,
                                        bearing: firstSlide.bearing || 0,
                                        pitch: firstSlide.pitch || 0,
                                        mapStyle: story.map_style || 'light',
                                        shouldRotate: true,
                                        flyDuration: firstSlide.fly_duration || 8
                                    });
                                }
                            }
                        }
                    }}
                    onHeroLoaded={() => {
                        setHeroMediaLoaded(true);
                        if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
                        overlayTimeoutRef.current = setTimeout(() => setShowBlackOverlay(false), 1000);
                    }}
                />
                </div>
                
                {/* Project Description */}
                {story.story_description && (
                    <div
                        ref={projectDescriptionRef}
                        className="pointer-events-none"
                        data-name="project-description-wrapper"
                    >
                        <ProjectDescriptionSection
                            storyTitle={story.title}
                            description={story.story_description}
                            onContinue={() => {
                                navigateToChapter(0);
                                if (chapters.length > 0 && chapters[0].slides?.length > 0) {
                                    const firstSlide = chapters[0].slides[0];
                                    if (firstSlide.coordinates && Array.isArray(firstSlide.coordinates) &&
                                        firstSlide.coordinates.length === 2 &&
                                        !isNaN(firstSlide.coordinates[0]) && !isNaN(firstSlide.coordinates[1])) {
                                        // Suppress the redundant setMapConfig that fires via
                                        // the isActive effect → onSlideChange when chapter 0 activates
                                        suppressNextOnSlideChangeMapConfig.current = true;
                                        setMapConfig({
                                            center: firstSlide.coordinates,
                                            offset: [-200, 0],
                                            zoom: firstSlide.zoom || 12,
                                            bearing: firstSlide.bearing || 0,
                                            pitch: firstSlide.pitch || 0,
                                            mapStyle: story.map_style || 'light',
                                            shouldRotate: true,
                                            flyDuration: firstSlide.fly_duration || 8
                                        });
                                    }
                                }
                            }}
                        />
                    </div>
                )}

                {/* Chapters */}
                {chapters.map((chapter, index) => (
                    <div 
                        key={chapter.id}
                        ref={el => chapterRefs.current[index] = el}
                        className="pointer-events-none"
                        data-name={`chapter-wrapper-${index}`}
                    >
                        <StoryChapter
                            chapter={chapter}
                            isActive={activeChapter === index}
                            alignment={chapter.alignment}
                            index={index}
                            delay={index === 0 ? 1000 : 0}
                            onFullScreenChange={setIsFullScreenOpen}
                            targetSlideIndex={targetSlide?.chapter === index ? targetSlide.slide : undefined}
                            onSlideChange={(slide) => {
                                setActiveSlide(slide);
                                if (!isValidCoordinatePair(slide.coordinates)) return;

                                const normalizedCoords = normalizeCoordinatePair(slide.coordinates);

                                if (story.show_route !== false) {
                                    const chKey = chapters[index]?.id || `ch-${index}`;

                                    // Append this slide to the visited list for this chapter
                                    const prevVisited = visitedSlideCoordsRef.current[chKey] || [];
                                    const lastVisited = prevVisited[prevVisited.length - 1];
                                    if (!lastVisited || !areCoordinatesEqual(lastVisited, normalizedCoords)) {
                                        visitedSlideCoordsRef.current[chKey] = [...prevVisited, normalizedCoords];
                                    }
                                    const currentVisited = visitedSlideCoordsRef.current[chKey];

                                    // Draw route immediately (straight-line fallback for unfetched segments)
                                    setRouteCoordinates(buildRouteFromVisited(currentVisited, segmentCacheRef.current));

                                    // Fetch road segment for the latest step if not yet cached
                                    if (currentVisited.length >= 2) {
                                        const from = currentVisited[currentVisited.length - 2];
                                        const to   = currentVisited[currentVisited.length - 1];
                                        const segKey = `${from[1].toFixed(5)},${from[0].toFixed(5)}→${to[1].toFixed(5)},${to[0].toFixed(5)}`;

                                        if (segmentCacheRef.current[segKey] === undefined) {
                                            segmentCacheRef.current[segKey] = null; // mark in-progress
                                            const token = import.meta.env.VITE_MAPBOX_API_KEY || 'pk.eyJ1Ijoic3RldmVidXR0b24iLCJhIjoiNEw1T183USJ9.Sv_1qSC23JdXot8YIRPi8A';
                                            const waypoints = `${from[1]},${from[0]};${to[1]},${to[0]}`;
                                            const capturedChKey = chKey;
                                            const capturedChIdx = index;
                                            (async () => {
                                                try {
                                                    const resp = await fetch(
                                                        `https://api.mapbox.com/directions/v5/mapbox/walking/${waypoints}` +
                                                        `?geometries=geojson&overview=simplified&access_token=${token}`
                                                    );
                                                    const data = await resp.json();
                                                    const route = data.routes?.[0];
                                                    // Discard routes that are more than 2.5× the straight-line
                                                    // distance — these are routing around impassable terrain
                                                    // (fields, off-road gaps) and a straight line looks better.
                                                    const straightDist = haversineMetres(from, to);
                                                    const tooDetoured = !route || route.distance > straightDist * 2.5;
                                                    segmentCacheRef.current[segKey] = tooDetoured
                                                        ? [from, to]
                                                        : route.geometry.coordinates.map(c => [c[1], c[0]]);
                                                } catch (e) {
                                                    segmentCacheRef.current[segKey] = [from, to];
                                                }
                                                // Rebuild route with newly cached segment if chapter still active
                                                if (currentActiveChapterRef.current === capturedChIdx) {
                                                    const latestVisited = visitedSlideCoordsRef.current[capturedChKey] || [];
                                                    setRouteCoordinates(buildRouteFromVisited(latestVisited, segmentCacheRef.current));
                                                }
                                            })();
                                        }
                                    }
                                }

                                // Add landing marker (with duplicate check)
                                setLandingMarkers(prev => {
                                    const exists = prev.some(item => areCoordinatesEqual(item.coordinates, normalizedCoords));
                                    if (!exists) return [...prev, { coordinates: normalizedCoords, chapterIndex: index }];
                                    return prev;
                                });
                                
                                // Set active Mapbox layer
                                setActiveLayerId(slide.mapbox_layer_id || null);

                                // Skip setMapConfig if onContinue/onExplore already fired it for
                                // this initial chapter activation (avoids restarting the flyTo).
                                if (suppressNextOnSlideChangeMapConfig.current) {
                                    suppressNextOnSlideChangeMapConfig.current = false;
                                } else {
                                    setMapConfig({
                                        center: slide.coordinates,
                                        offset: [-200, 0],
                                        zoom: slide.zoom !== undefined ? slide.zoom : (chapter.zoom || 12),
                                        bearing: slide.bearing !== undefined ? slide.bearing : 0,
                                        pitch: slide.pitch !== undefined ? slide.pitch : 0,
                                        mapStyle: chapter.map_style || 'light',
                                        shouldRotate: false,
                                        flyDuration: slide.fly_duration !== undefined ? slide.fly_duration : (chapter.fly_duration || 8)
                                    });
                                }

                                // Build interactive marker for this slide
                                const slideIdx = chapter.slides?.findIndex(s =>
                                    s.coordinates && areCoordinatesEqual(
                                        normalizeCoordinatePair(s.coordinates),
                                        normalizedCoords
                                    )
                                ) ?? -1;

                                setStoryMarkers(prev => {
                                    const exists = prev.findIndex(m => areCoordinatesEqual(m.coordinates, normalizedCoords));
                                    if (exists === -1) {
                                        return [...prev, {
                                            coordinates: normalizedCoords,
                                            title: slide.title || '',
                                            location: slide.location || '',
                                            image: slide.image || '',
                                            description: slide.description || '',
                                            chapterIndex: index,
                                            slideIndex: slideIdx
                                        }];
                                    }
                                    return prev;
                                });

                                // Set active index separately (avoid nested setState)
                                const existingIdx = storyMarkers.findIndex(m => areCoordinatesEqual(m.coordinates, normalizedCoords));
                                setActiveMarkerIdx(existingIdx === -1 ? storyMarkers.length : existingIdx);
                            }}
                        />
                    </div>
                ))}
                
                {/* Footer */}
                <div className="pointer-events-auto" data-name="footer-wrapper">
                <StoryFooter
                    onRestart={scrollToTop}
                    onViewOtherStories={() => setIsStorySlideshowOpen(true)}
                    storyId={storyId}
                    isVisible={isBannerVisible}
                    onOpenLibrary={() => setShowLibraryModal(true)}
                    relatedStories={relatedStories}
                    currentCategory={story?.category}
                    onOpenMapEditor={() => setIsLiveEditorOpen(true)}
                    isOwner={true}
                />
                </div>
            </div>
            
            {/* Chapter Navigation */}
            <div className="pointer-events-auto" data-name="chapter-nav-wrapper">
            <ChapterNavigation
                chapters={chapters}
                activeIndex={activeChapter}
                isOpen={isChapterMenuOpen}
                onNavigate={(index) => {
                    navigateToChapter(index);
                    setIsChapterMenuOpen(false);
                }}
            />
            </div>

            {/* Chapter Progress Indicator */}
            {isBannerVisible && chapters.length > 0 && (
                <div className="pointer-events-auto" data-name="chapter-progress-wrapper">
                <ChapterProgress
                    totalChapters={chapters.length}
                    activeIndex={activeChapter}
                    onNavigate={navigateToChapter}
                    hideForFullscreen={isFullScreenOpen}
                />
                </div>
            )}

            {/* Floating Story Slideshow */}
            <div className="pointer-events-auto" data-name="slideshow-wrapper">
            <FloatingStorySlideshow
                isOpen={isStorySlideshowOpen}
                onClose={() => setIsStorySlideshowOpen(false)}
                currentStoryId={storyId}
            />
            </div>

            {/* Live Map Editor */}
            <LiveMapEditor
                isOpen={isLiveEditorOpen}
                onClose={() => setIsLiveEditorOpen(false)}
                activeSlide={activeSlide}
                mapInstanceRef={mapInstanceRef}
                onSlideSave={(slideId, values) => {
                    setChapters(prev => prev.map(chapter => ({
                        ...chapter,
                        slides: chapter.slides?.map(slide =>
                            slide.id === slideId ? { ...slide, ...values } : slide
                        )
                    })));
                }}
            />

            {/* Document Library Sheet */}
            <Sheet 
                open={showLibraryModal} 
                onOpenChange={setShowLibraryModal}
            >
                <SheetContent 
                    side="bottom" 
                    className="w-full h-[calc(100vh-100px)] top-[100px] z-[95] pointer-events-auto [&>div:first-child]:bg-transparent [&>div:first-child]:backdrop-blur-none"
                    style={{
                        animation: showLibraryModal 
                            ? 'slideInFromBottom 3s ease-out' 
                            : 'slideOutToBottom 3s ease-in'
                    }}
                >
                    <SheetHeader className="pl-[200px]">
                        <SheetTitle className="text-3xl">Document Library</SheetTitle>
                    </SheetHeader>
                    <div className="h-[calc(100%-60px)] overflow-auto mt-4">
                        <DocumentManagerContent storyId={storyId} />
                    </div>
                </SheetContent>
            </Sheet>
            
            <style>{`
                @keyframes slideInFromBottom {
                    from {
                        transform: translateY(100%);
                    }
                    to {
                        transform: translateY(0);
                    }
                }
                @keyframes slideOutToBottom {
                    from {
                        transform: translateY(0);
                    }
                    to {
                        transform: translateY(100%);
                    }
                }
            `}</style>
            </div>
            );
            }