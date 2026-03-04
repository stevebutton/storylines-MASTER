import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import MapBackground from '@/components/storymap/MapContainer';
import StoryChapter from '@/components/storymap/StoryChapter';
import ChapterNavigation from '@/components/storymap/ChapterNavigation';
import StoryHeader from '@/components/storymap/StoryHeader';
import StoryFooter from '@/components/storymap/StoryFooter';
import StoryMapBanner from '@/components/storymap/StoryMapBanner';
import BottomPillBar from '@/components/storymap/BottomPillBar';
import StoryViewPill from '@/components/storymap/StoryViewPill';
import ChapterProgress from '@/components/storymap/ChapterProgress';
import FloatingStorySlideshow from '@/components/storymap/FloatingStorySlideshow';
import ProjectDescriptionSection from '@/components/storymap/ProjectDescriptionSection';
import LiveMapEditor from '@/components/storymap/LiveMapEditor';

import DocumentManagerContent from '@/components/documents/DocumentManagerContent';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';
import { normalizeCoordinatePair, areCoordinatesEqual, isValidCoordinatePair } from '@/components/utils/coordinateUtils';
import { useSearchParams, useNavigate } from 'react-router-dom';

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
    const storyIdParam = searchParams.get('id');

    const [story, setStory] = useState(null);
    // Effective story ID — URL param when navigating to a specific story,
    // falls back to the loaded story's own ID (e.g. when landing as main page
    // without a ?id= param).
    const storyId = storyIdParam ?? story?.id ?? null;
    const [chapters, setChapters] = useState([]);
    const [relatedStories, setRelatedStories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeChapter, setActiveChapter] = useState(-1);
    const [mapConfig, setMapConfig] = useState({
        center: [0, 0],
        zoom: 2,
        mapStyle: 'a',
        bearing: 0,
        pitch: 0,
        shouldRotate: false,
        flyDuration: 8,
        offset: [0, 0]
    });
    const [activeLayerId, setActiveLayerId] = useState(null);
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [routeStaticLength, setRouteStaticLength] = useState(0);
    const [clearRoute, setClearRoute] = useState(false);
    const [chapterRegion, setChapterRegion] = useState(null);
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
    const [storyMarkers, setStoryMarkers] = useState([]);
    const [activeMarkerIdx, setActiveMarkerIdx] = useState(-1);
    const [targetSlide, setTargetSlide] = useState(null);

    const [activeSlide, setActiveSlide] = useState(null);
    const [isLiveEditorOpen, setIsLiveEditorOpen] = useState(false);
    const [showRoute, setShowRoute] = useState(true);
    const [showMarkers, setShowMarkers] = useState(true);
    const [isEditTransitioning, setIsEditTransitioning] = useState(false);
    const [carouselOpened, setCarouselOpened] = useState(false);
    const mapInstanceRef = useRef(null);
    const navigate = useNavigate();


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
    // Scroll position to restore after returning from StoryTimeline
    const pendingScrollRef = useRef(null);

    // When storyId changes (SPA story switch via navigate()), immediately raise
    // the black overlay and reset all per-story visual state so the old story
    // is never visible through the overlay. useLayoutEffect fires synchronously
    // before the browser paints, closing any gap between the overlay disappearing
    // in FloatingStorySlideshow and it appearing here.
    useLayoutEffect(() => {
        if (prevStoryIdRef.current !== storyIdParam) {
            // Cancel any pending overlay-fade from the previous story
            if (overlayTimeoutRef.current) {
                clearTimeout(overlayTimeoutRef.current);
                overlayTimeoutRef.current = null;
            }
            setShowBlackOverlay(true);
            setActiveChapter(-1);
            setHasExplored(false);
            setCarouselOpened(false);
            setHeroMediaLoaded(false);
            setIsBannerVisible(false);
            setIsStorySlideshowOpen(false);
            setStoryMarkers([]);
            setActiveMarkerIdx(-1);
            setTargetSlide(null);
            setActiveLayerId(null);
            setRouteCoordinates([]);
            setRouteStaticLength(0);
            setClearRoute(false);
            setChapterRegion(null);
            setLandingMarkers([]);
            setIsChapterMenuOpen(false);
            previousChapterRef.current = -1;
            currentActiveChapterRef.current = -1;
            visitedSlideCoordsRef.current = {};
            segmentCacheRef.current = {};
            suppressNextOnSlideChangeMapConfig.current = false;
            chapterRefs.current = [];
            // If returning from StoryTimeline, restore scroll; otherwise reset to top
            const savedScrollKey = `return_scroll_${storyIdParam}`;
            const savedScroll = sessionStorage.getItem(savedScrollKey);
            if (savedScroll) {
                sessionStorage.removeItem(savedScrollKey);
                pendingScrollRef.current = parseInt(savedScroll, 10);
            } else {
                window.scrollTo(0, 0);
            }
        }
        prevStoryIdRef.current = storyIdParam;
    }, [storyIdParam]);

    useEffect(() => {
        loadStory();
    }, [storyIdParam]);

    // Safety net: if the story has loaded but onHeroLoaded never fires (e.g. broken
    // hero image, unexpected media state) force-dismiss the overlay after 5 seconds
    // so the page never stays permanently black.
    useEffect(() => {
        if (!story || isLoading) return;
        const id = setTimeout(() => setShowBlackOverlay(false), 5000);
        return () => clearTimeout(id);
    }, [story?.id, isLoading]);

    // Set initial map config from story opening view — jump instantly (no animation)
    // because the black overlay is covering the map at this point
    useEffect(() => {
        if (story && story.coordinates) {
            setMapConfig(prev => ({
                ...prev,
                center: story.coordinates,
                zoom: story.zoom || 2,
                mapStyle: story.map_style || 'a',
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
        try {
            // If no storyId in URL, fall back to the main story
            const query = storyIdParam
                ? supabase.from('stories').select('*').eq('id', storyIdParam).limit(1)
                : supabase.from('stories').select('*').eq('is_main_story', true).limit(1);

            const { data: storyData, error: storyErr } = await query;
            if (storyErr) throw storyErr;

            if (storyData.length > 0) {
                setStory(storyData[0]);

                // Fetch related stories in the same category
                const currentStory = storyData[0];
                if (currentStory.category) {
                    const { data: related } = await supabase
                        .from('stories')
                        .select('*')
                        .eq('category', currentStory.category)
                        .eq('is_published', true)
                        .neq('id', currentStory.id)
                        .limit(4);
                    setRelatedStories(related || []);
                }
            }

            const { data: chaptersData, error: chapErr } = await supabase
                .from('chapters')
                .select('*')
                .eq('story_id', storyData[0]?.id ?? storyId)
                .order('order');
            if (chapErr) throw chapErr;

            const chapterIds = chaptersData.map(c => c.id);

            const { data: relevantSlides, error: slideErr } = await supabase
                .from('slides')
                .select('*')
                .in('chapter_id', chapterIds)
                .order('order');
            if (slideErr) throw slideErr;
            
            const chaptersWithSlides = chaptersData.map(chapter => ({
                ...chapter,
                slides: relevantSlides
                    .filter(s => s.chapter_id === chapter.id)
                    .sort((a, b) => a.order - b.order)
                    .map(s => ({
                        id: s.id,
                        chapter_id: s.chapter_id,
                        order: s.order,
                        image: s.image,
                        card_style: s.card_style,
                        title: s.title,
                        description: s.description,
                        location: s.location,
                        coordinates: s.coordinates,
                        zoom: s.zoom,
                        bearing: s.bearing,
                        pitch: s.pitch,
                        fly_duration: s.fly_duration,
                        pdf_url: s.pdf_url,
                        pdf_title: s.pdf_title,
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

    // Continuously save chapter + slide state so timeline exit can restore exact position
    useEffect(() => {
        if (!storyIdParam || activeChapter < 0 || !activeSlide?.id) return;
        sessionStorage.setItem(`view_state_${storyIdParam}`, JSON.stringify({
            chapter: activeChapter,
            slideId: activeSlide.id,
        }));
    }, [activeChapter, activeSlide?.id, storyIdParam]);

    // Restore scroll + exact chapter/slide after returning from StoryTimeline
    useEffect(() => {
        if (chapters.length === 0 || pendingScrollRef.current === null) return;
        const target = pendingScrollRef.current;
        pendingScrollRef.current = null;
        // Restore the carousel to the exact slide the user was viewing
        const savedStateRaw = sessionStorage.getItem(`view_state_${storyIdParam}`);
        if (savedStateRaw) {
            try {
                const { chapter, slideId } = JSON.parse(savedStateRaw);
                if (typeof chapter === 'number' && chapter >= 0 && chapters[chapter]) {
                    const slideIdx = chapters[chapter].slides?.findIndex(s => s.id === slideId) ?? -1;
                    if (slideIdx >= 0) setTargetSlide({ chapter, slide: slideIdx });
                }
            } catch (_) { /* ignore malformed state */ }
        }
        // Longer delay gives all chapter components time to render before scrolling
        setTimeout(() => window.scrollTo(0, target), 300);
    }, [chapters]);

    useEffect(() => {
        if (chapters.length === 0) return;

        const handleScroll = () => {
            const scrollPosition = window.scrollY + window.innerHeight / 2;

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
                                setRouteStaticLength(0);
                            }

                            previousChapterRef.current = index;
                            setActiveChapter(index);
                            setStoryMarkers([]);
                            setActiveMarkerIdx(-1);
                            const chapter = chapters[index];

                            const firstSlide = chapter.slides?.[0];
                            // First slide that actually has valid coordinates — slides[0] may
                            // be a text-only cover slide with no location.
                            const firstSlideWithCoords = chapter.slides?.find(s =>
                                Array.isArray(s.coordinates) && s.coordinates.length === 2 &&
                                !isNaN(s.coordinates[0]) && !isNaN(s.coordinates[1])
                            );

                            // Track active chapter for async route callbacks
                            currentActiveChapterRef.current = index;

                            if (story.show_route !== false) {
                                const cacheKey = chapter.id || `ch-${index}`;
                                // Only reset visited coords when genuinely entering a NEW chapter.
                                // If the same chapter re-enters the scroll zone (e.g. card height
                                // changes when the carousel opens), preserve the trail so the
                                // route stays incremental rather than restarting.
                                if (prevChapterIdx !== index) {
                                    visitedSlideCoordsRef.current[cacheKey] = [];
                                }
                            }

                            // Only update map for chapter-to-chapter transitions.
                            // The initial hero/description→chapter0 activation is already
                            // handled by onExplore/onContinue — skip it here to avoid
                            // restarting the flyTo mid-flight (double jump).
                            // Prefer chapter.coordinates (overview position), then first slide
                            // with valid coordinates (slides[0] may have no location).
                            const chCoords = Array.isArray(chapter.coordinates) && chapter.coordinates.length === 2
                                && !isNaN(chapter.coordinates[0]) && !isNaN(chapter.coordinates[1])
                                ? chapter.coordinates : firstSlideWithCoords?.coordinates;
                            const activationZoom = chapter.coordinates ? (chapter.zoom || 12) : (firstSlideWithCoords?.zoom || 12);
                            const activationBearing = chapter.coordinates ? (chapter.bearing || 0) : (firstSlideWithCoords?.bearing || 0);
                            const activationPitch = chapter.coordinates ? (chapter.pitch || 0) : (firstSlideWithCoords?.pitch || 0);

                            if (prevChapterIdx !== -1 &&
                                chCoords && Array.isArray(chCoords) &&
                                chCoords.length === 2 &&
                                !isNaN(chCoords[0]) && !isNaN(chCoords[1])) {
                                setMapConfig({
                                    center: chCoords,
                                    offset: [-200, 0],
                                    zoom: activationZoom,
                                    bearing: activationBearing,
                                    pitch: activationPitch,
                                    mapStyle: story.map_style || 'a',
                                    shouldRotate: true,
                                    flyDuration: chapter.fly_duration || 8
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

    // Banner and footer animate in once the user scrolls into the first chapter.
    // Uses a one-way latch — once visible it stays visible for the session.
    useEffect(() => {
        if (activeChapter >= 0) {
            setIsBannerVisible(true);
            setHasExplored(true);
        }
    }, [activeChapter]);

    // Compute the chapter region (centroid + bounding radius) for the active chapter.
    // Displayed on the map as a soft circle marking the territory of the chapter's slides.
    useEffect(() => {
        if (activeChapter < 0 || chapters.length === 0) {
            setChapterRegion(null);
            return;
        }
        const chapter = chapters[activeChapter];
        const coordSlides = chapter?.slides
            ?.filter(s => isValidCoordinatePair(s.coordinates))
            .map(s => normalizeCoordinatePair(s.coordinates)) || [];

        if (coordSlides.length < 2) {
            setChapterRegion(null);
            return;
        }

        const centLat = coordSlides.reduce((sum, c) => sum + c[0], 0) / coordSlides.length;
        const centLng = coordSlides.reduce((sum, c) => sum + c[1], 0) / coordSlides.length;
        const radiusMetres = Math.max(...coordSlides.map(c => haversineMetres([centLat, centLng], c))) * 1.3;
        setChapterRegion({ center: [centLat, centLng], radiusMetres });
    }, [activeChapter, chapters]);

    // Pre-fetch all road segments for the active chapter when it activates.
    // Road geometry is cached in segmentCacheRef so it's ready before the user
    // navigates slides — eliminating the reactive-fetch lag.
    useEffect(() => {
        if (activeChapter < 0 || chapters.length === 0) return;
        if (story?.show_route === false) return;

        const chapter = chapters[activeChapter];
        if (!chapter?.slides) return;

        const chKey = chapter.id || `ch-${activeChapter}`;
        const capturedChIdx = activeChapter;

        // All slides with valid coordinates, in order
        const coordSlides = chapter.slides
            .filter(s => isValidCoordinatePair(s.coordinates))
            .map(s => normalizeCoordinatePair(s.coordinates));

        if (coordSlides.length < 2) return;

        const token = import.meta.env.VITE_MAPBOX_API_KEY || 'pk.eyJ1Ijoic3RldmVidXR0b24iLCJhIjoiNEw1T183USJ9.Sv_1qSC23JdXot8YIRPi8A';

        for (let i = 1; i < coordSlides.length; i++) {
            const from = coordSlides[i - 1];
            const to   = coordSlides[i];
            const segKey = `${from[1].toFixed(5)},${from[0].toFixed(5)}→${to[1].toFixed(5)},${to[0].toFixed(5)}`;

            if (segmentCacheRef.current[segKey] !== undefined) continue; // already cached or in-progress

            segmentCacheRef.current[segKey] = null; // mark in-progress
            (async () => {
                const waypoints = `${from[1]},${from[0]};${to[1]},${to[0]}`;
                try {
                    const resp = await fetch(
                        `https://api.mapbox.com/directions/v5/mapbox/walking/${waypoints}` +
                        `?geometries=geojson&overview=simplified&access_token=${token}`
                    );
                    const data = await resp.json();
                    const route = data.routes?.[0];
                    const straightDist = haversineMetres(from, to);
                    const tooDetoured = !route || route.distance > straightDist * 2.5;
                    segmentCacheRef.current[segKey] = tooDetoured
                        ? [from, to]
                        : route.geometry.coordinates.map(c => [c[1], c[0]]);
                } catch (e) {
                    segmentCacheRef.current[segKey] = [from, to];
                }
                // Silently refresh the visible route if the user has already visited slides.
                // routeStaticLength is unchanged so MapContainer skips animation — just updates data.
                if (currentActiveChapterRef.current === capturedChIdx) {
                    const latestVisited = visitedSlideCoordsRef.current[chKey] || [];
                    if (latestVisited.length > 0) {
                        setRouteCoordinates(buildRouteFromVisited(latestVisited, segmentCacheRef.current));
                    }
                }
            })();
        }
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

    // Reset all chapter/route/banner state and close the chapter menu.
    // Uses instant scroll so the scroll handler never re-detects chapter zones
    // during the jump, which would immediately re-set activeChapter.
    const resetToPreChapter = () => {
        setActiveChapter(-1);
        setIsBannerVisible(false);
        setHasExplored(false);
        setCarouselOpened(false);
        previousChapterRef.current = -1;
        currentActiveChapterRef.current = -1;
        setClearRoute(true);
        setRouteCoordinates([]);
        setRouteStaticLength(0);
        setChapterRegion(null);
        setStoryMarkers([]);
        setActiveMarkerIdx(-1);
        setLandingMarkers([]);
        visitedSlideCoordsRef.current = {};
        setIsChapterMenuOpen(false);
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
                mapStyle={story?.map_style || 'a'}
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
                routeStaticLength={routeStaticLength}
                clearRoute={clearRoute}
                onRouteCleared={() => setClearRoute(false)}
                offset={mapConfig.offset}
                landingMarkers={landingMarkers}
                clearLandingMarkers={clearLandingMarkers}
                activeLayerId={activeLayerId}
                activeChapter={activeChapter}
                chapterRegion={chapterRegion}
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
                showRoute={showRoute}
                showMarkers={showMarkers}
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
                    mapStyle={story?.map_style || 'a'}
                    onExplore={() => {
                        setHasExplored(true);
                        if (story.story_description) {
                            scrollToProjectDescription();
                        } else {
                            navigateToChapter(0);
                            if (chapters.length > 0) {
                                const ch0 = chapters[0];
                                const firstSlide = ch0.slides?.[0];
                                const ch0Coords = Array.isArray(ch0.coordinates) && ch0.coordinates.length === 2
                                    && !isNaN(ch0.coordinates[0]) && !isNaN(ch0.coordinates[1])
                                    ? ch0.coordinates : firstSlide?.coordinates;
                                if (ch0Coords && Array.isArray(ch0Coords) &&
                                    ch0Coords.length === 2 &&
                                    !isNaN(ch0Coords[0]) && !isNaN(ch0Coords[1])) {
                                    // Suppress the redundant setMapConfig that fires via
                                    // the isActive effect → onSlideChange when chapter 0 activates
                                    suppressNextOnSlideChangeMapConfig.current = true;
                                    setMapConfig({
                                        center: ch0Coords,
                                        offset: [-200, 0],
                                        zoom: ch0.coordinates ? (ch0.zoom || 12) : (firstSlide?.zoom || 12),
                                        bearing: ch0.coordinates ? (ch0.bearing || 0) : (firstSlide?.bearing || 0),
                                        pitch: ch0.coordinates ? (ch0.pitch || 0) : (firstSlide?.pitch || 0),
                                        mapStyle: story.map_style || 'a',
                                        shouldRotate: true,
                                        flyDuration: ch0.fly_duration || 8
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
                            backgroundImage={story.thumbnail || story.hero_image}
                            mapStyle={story?.map_style || 'a'}
                            onContinue={() => {
                                navigateToChapter(0);
                                if (chapters.length > 0) {
                                    const ch0 = chapters[0];
                                    const firstSlide = ch0.slides?.[0];
                                    const ch0Coords = Array.isArray(ch0.coordinates) && ch0.coordinates.length === 2
                                        && !isNaN(ch0.coordinates[0]) && !isNaN(ch0.coordinates[1])
                                        ? ch0.coordinates : firstSlide?.coordinates;
                                    if (ch0Coords && Array.isArray(ch0Coords) &&
                                        ch0Coords.length === 2 &&
                                        !isNaN(ch0Coords[0]) && !isNaN(ch0Coords[1])) {
                                        // Suppress the redundant setMapConfig that fires via
                                        // the isActive effect → onSlideChange when chapter 0 activates
                                        suppressNextOnSlideChangeMapConfig.current = true;
                                        setMapConfig({
                                            center: ch0Coords,
                                            offset: [-200, 0],
                                            zoom: ch0.coordinates ? (ch0.zoom || 12) : (firstSlide?.zoom || 12),
                                            bearing: ch0.coordinates ? (ch0.bearing || 0) : (firstSlide?.bearing || 0),
                                            pitch: ch0.coordinates ? (ch0.pitch || 0) : (firstSlide?.pitch || 0),
                                            mapStyle: story.map_style || 'a',
                                            shouldRotate: true,
                                            flyDuration: ch0.fly_duration || 8
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
                            storyId={storyId}
                            targetSlideIndex={targetSlide?.chapter === index ? targetSlide.slide : undefined}
                            mapStyle={chapter.map_style || story?.map_style || 'a'}
                            onSlideChange={(slide) => {
                                setActiveSlide(slide);
                                if (!isValidCoordinatePair(slide.coordinates)) return;

                                const normalizedCoords = normalizeCoordinatePair(slide.coordinates);

                                // _noRoute slides (chapter overview activations) only fly the map —
                                // they don't contribute to the route trail, landing markers, or story markers.
                                if (!slide._noRoute) {
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

                                    // Static length = the route up to (but not including) the new slide.
                                    // MapContainer uses this to know exactly where to start the new
                                    // segment animation, independent of how many road-geometry points
                                    // earlier segments have accumulated.
                                    const staticRoute = buildRouteFromVisited(
                                        currentVisited.slice(0, -1),
                                        segmentCacheRef.current
                                    );
                                    setRouteStaticLength(staticRoute.length);

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
                                } // end !slide._noRoute

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
                                        mapStyle: chapter.map_style || story.map_style || 'a',
                                        shouldRotate: false,
                                        flyDuration: slide.fly_duration !== undefined ? slide.fly_duration : (chapter.fly_duration || 8)
                                    });
                                }

                                if (!slide._noRoute) {
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
                                } // end !slide._noRoute (story markers)
                            }}
                            onExplore={() => setCarouselOpened(true)}
                        />
                    </div>
                ))}
                
                {/* End-of-story section */}
                <div className="pointer-events-auto" data-name="footer-wrapper">
                <StoryFooter
                    onRestart={scrollToTop}
                    relatedStories={relatedStories}
                    currentCategory={story?.category}
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
                onGoToStart={() => {
                    resetToPreChapter();
                    window.scrollTo(0, 0);
                }}
                onGoToOverview={story.story_description ? () => {
                    resetToPreChapter();
                    const el = projectDescriptionRef.current;
                    if (el) {
                        window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY);
                    }
                } : undefined}
            />
            </div>

            {/* Chapter Progress Indicator */}
            {isBannerVisible && chapters.length > 0 && (
                <div className="pointer-events-auto" data-name="chapter-progress-wrapper">
                <ChapterProgress
                    totalChapters={chapters.length}
                    activeIndex={activeChapter}
                    onNavigate={navigateToChapter}
                    hideForFullscreen={false}
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
                    setActiveSlide(prev => prev?.id === slideId ? { ...prev, ...values } : prev);
                }}
            />

            {/* Story View Pill — three-segment nav: Map / Story / Timeline */}
            <StoryViewPill
                storyId={storyId}
                currentView="map"
                isVisible={isBannerVisible}
            />

            {/* Bottom Pill Bar — appears when chapter 1 first activates */}
            <BottomPillBar
                isVisible={carouselOpened}
                onZoomIn={() => mapInstanceRef.current?.zoomIn()}
                onZoomOut={() => mapInstanceRef.current?.zoomOut()}
                onResetNorth={() => mapInstanceRef.current?.resetNorth({ duration: 1000 })}
                showRoute={showRoute}
                onToggleRoute={() => setShowRoute(v => !v)}
                showMarkers={showMarkers}
                onToggleMarkers={() => setShowMarkers(v => !v)}
                onOpenMapEditor={() => setIsLiveEditorOpen(prev => !prev)}
                onViewOtherStories={() => setIsStorySlideshowOpen(true)}
                onOpenLibrary={() => setShowLibraryModal(true)}
                onEditStory={() => setIsEditTransitioning(true)}
            />

            {/* White dissolve overlay for edit-story transition */}
            <AnimatePresence>
                {isEditTransitioning && (
                    <motion.div
                        className="fixed inset-0 bg-white pointer-events-all"
                        style={{ zIndex: 9998 }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, ease: 'easeInOut' }}
                        onAnimationComplete={() => {
                            navigate(`/StoryEditor?id=${storyId}`);
                        }}
                    />
                )}
            </AnimatePresence>

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