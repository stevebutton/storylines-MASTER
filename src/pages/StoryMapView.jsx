import React, { useState, useEffect, useRef, useMemo, useLayoutEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import StoryMapRenderer from '@/components/map/StoryMapRenderer';
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
import FullScreenImageViewer from '@/components/storymap/FullScreenImageViewer';
import ToolPalette from '@/components/storymap/ToolPalette';
import SlideImagePositionModal from '@/components/storymap/SlideImagePositionModal';
import FullscreenNavPill from '@/components/storymap/FullscreenNavPill';
import LibraryPill from '@/components/storymap/LibraryPill';
import ScaleBar from '@/components/storymap/ScaleBar';
import MilestonePanel from '@/components/storymap/MilestonePanel';
import AboutPanel from '@/components/storymap/AboutPanel';
import NextEpisodePanel from '@/components/storymap/NextEpisodePanel';
import { fadeMapLayer } from '@/utils/mapLayerFade';
import { createPageUrl } from '@/utils';

import DocumentManagerContent from '@/components/documents/DocumentManagerContent';
import { Loader2, LogOut, Pencil, Wrench } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { normalizeCoordinatePair, areCoordinatesEqual, isValidCoordinatePair } from '@/components/utils/coordinateUtils';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { StoryTranslationProvider } from '@/contexts/StoryTranslationContext';
import { getT } from '@/utils/translationDefaults';

// Rain effect constants — module-level so they are not recreated on every render.
const RAIN_BASE = {
    intensity:             1.0,
    color:                 '#a8adbc',
    'vignette-color':      '#464646',
    direction:             [0, 80],
    'droplet-size':        [2.6, 18.2],
    'distortion-strength': 0.7,
    'center-thinning':     0,
};
const RAIN_FADE_MS = 2000;

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
    const { profile: currentUser, logout } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
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
    const [pillsInitialized, setPillsInitialized] = useState(false);
    const [isStorySlideshowOpen, setIsStorySlideshowOpen] = useState(false);
    const [showLibraryModal, setShowLibraryModal] = useState(false);
    const [libraryUploadKey, setLibraryUploadKey] = useState(0);
    const libraryPrevViewRef = useRef(null); // 'story' | null — view open beneath library
    // Capture deep-link params at mount so the effect fires once and doesn't
    // re-trigger on every searchParams change. Opening early (before showBlackOverlay
    // clears) prevents the overlay from colliding with the hero title sequence.
    const deepLinkRef = useRef({
        view:      searchParams.get('view')      || null,
        chapterId: searchParams.get('chapterId') || null,
        slideId:   searchParams.get('slideId')   || null,
    });
    const [heroMediaLoaded, setHeroMediaLoaded] = useState(false);
    const [showBlackOverlay, setShowBlackOverlay] = useState(true);
    const [hasExplored, setHasExplored] = useState(false);
    const [storyMarkers, setStoryMarkers] = useState([]);
    const [activeMarkerIdx, setActiveMarkerIdx] = useState(-1);
    const [targetSlide, setTargetSlide] = useState(null);

    const [activeSlide, setActiveSlide] = useState(null);
    const [isLiveEditorOpen, setIsLiveEditorOpen] = useState(false);
    const [showToolPalette, setShowToolPalette]         = useState(false);
    const [rainActive, setRainActive] = useState(false);
    const [mapReady, setMapReady] = useState(false);
    const [addHotspotMode, setAddHotspotMode]           = useState(false);
    const [showImagePositionModal, setShowImagePositionModal] = useState(false);
    const [showRoute, setShowRoute] = useState(true);
    const [showMarkers, setShowMarkers] = useState(true);
    const [isEditTransitioning, setIsEditTransitioning] = useState(false);
    const [carouselOpened, setCarouselOpened] = useState(false);
    const mapInstanceRef = useRef(null);
    const [pinnedLayers, setPinnedLayers] = useState([]); // { id, name, visible }[]
    const prevSlideLayerRef = useRef(null);
    const navigate = useNavigate();

    // ── About panel ───────────────────────────────────────────────────────────
    const [showAboutPanel, setShowAboutPanel] = useState(false);

    // ── Series / next episode ─────────────────────────────────────────────────
    const [seriesData,       setSeriesData]       = useState(null); // { series, episodes[] }
    const [showEpisodeGallery, setShowEpisodeGallery] = useState(false);

    // ── Story overlay (immersive reader over the map) ──────────────────────────
    const [showStoryOverlay, setShowStoryOverlay] = useState(false);
    const [overlayCurrentIndex, setOverlayCurrentIndex] = useState(0);
    const [overlayMode, setOverlayMode] = useState('story'); // 'picture' | 'story' | 'timeline'
    const timelineEnteredAtRef = useRef(null); // timestamp when timeline mode was entered
    const overlayScrollRef = useRef(0);
    // Stays true for 1 s after leaving timeline so the dissolve masks map-view content
    const [timelineContentHidden, setTimelineContentHidden] = useState(false);
    const timelineHideTimerRef = useRef(null);


    const chapterRefs = useRef([]);
    const containerRef = useRef(null);
    const projectDescriptionRef = useRef(null);
    const footerRef = useRef(null);
    const [atEnd, setAtEnd] = useState(false);
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
            setPillsInitialized(false);
            setCarouselOpened(false);
            setHeroMediaLoaded(false);
            setIsBannerVisible(false);
            setIsStorySlideshowOpen(false);
            setShowStoryOverlay(false);
            setOverlayMode('story');
            setStoryMarkers([]);
            setActiveMarkerIdx(-1);
            setTargetSlide(null);
            setActiveLayerId(null);
            setPinnedLayers([]);
            prevSlideLayerRef.current = null;
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
    // because the black overlay is covering the map at this point.
    // mapStyle is always applied even if no opening coordinates are saved.
    useEffect(() => {
        if (!story) return;
        setMapConfig(prev => {
            const update = { ...prev, mapStyle: story.map_style || 'a' };
            if (story.coordinates) {
                update.center    = story.coordinates;
                update.zoom      = story.zoom || 2;
                update.bearing   = story.bearing || 0;
                update.pitch     = story.pitch || 0;
                update.instant   = true;
            }
            return update;
        });
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
                        video_loop: s.video_loop,
                        video_thumbnail_url: s.video_thumbnail_url,
                        mapbox_layer_id: s.mapbox_layer_id,
                        layer_display_name: s.layer_display_name,
                        extended_content: s.extended_content,
                        story_date: s.story_date,
                        capture_date: s.capture_date,
                        image_position: s.image_position,
                        milestone: s.milestone,
                        hotspot_x: s.hotspot_x,
                        hotspot_y: s.hotspot_y,
                        hotspot_title: s.hotspot_title,
                        hotspot_body: s.hotspot_body,
                        hotspots: s.hotspots,
                        show_rain_button: s.show_rain_button,
                        cesium_camera: s.cesium_camera,
                    }))
            }));

            setChapters(chaptersWithSlides);
        } catch (error) {
            console.error('Failed to load story:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // ── Load series data when story has a series_id ───────────────────────────
    useEffect(() => {
        if (!story?.series_id) { setSeriesData(null); return; }
        (async () => {
            const [{ data: series }, { data: episodes }] = await Promise.all([
                supabase.from('series').select('*').eq('id', story.series_id).single(),
                supabase.from('stories')
                    .select('id, title, subtitle, episode_number, thumbnail, hero_image, hero_type')
                    .eq('series_id', story.series_id)
                    .order('episode_number'),
            ]);
            if (series) setSeriesData({ series, episodes: episodes || [] });
        })();
    }, [story?.series_id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Reset episode gallery whenever the story or overlay changes
    useEffect(() => {
        setShowEpisodeGallery(false);
    }, [storyId, showStoryOverlay]);

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
    // Also reset carouselOpened so the chapter title banner re-arms for each chapter.
    useEffect(() => {
        if (activeChapter >= 0) {
            setIsBannerVisible(true);
            setHasExplored(true);
        }
        setCarouselOpened(false);
    }, [activeChapter]);

    // Mark pills as initialized after their entrance delays have elapsed so that
    // subsequent mode-switches (story ↔ map ↔ library) animate at normal speed.
    useEffect(() => {
        if (!isBannerVisible || pillsInitialized) return;
        const t = setTimeout(() => setPillsInitialized(true), 5500);
        return () => clearTimeout(t);
    }, [isBannerVisible, pillsInitialized]);

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

    // ── Translation helper (pure function, not hook — StoryMapView provides its own context) ──
    const translate = useMemo(() => getT(story?.story_language, story?.translations), [story?.story_language, story?.translations]);

    // ── Overlay: flat slide list (built from already-loaded chapters, no extra fetch) ──
    const overlaySlides = useMemo(() => {
        return chapters.flatMap((ch, chIdx) =>
            (ch.slides || []).map(sl => ({
                ...sl,
                chapter_name: ch.name
                    ? `${translate('chapter_prefix')} ${String(chIdx + 1).padStart(2, '0')}: ${ch.name}`
                    : `${translate('chapter_prefix')} ${String(chIdx + 1).padStart(2, '0')}`,
                _chapter_id: ch.id,
                _chapter_index: chIdx,
            }))
        );
    }, [chapters, translate]);

    const overlayTimelineSlides = useMemo(() => {
        // Only slides with milestone content, sorted by date
        const withMilestone = overlaySlides.filter(sl => {
            const text = sl.milestone?.replace(/<[^>]*>/g, '').trim();
            return text && text.length > 0;
        });
        return [...withMilestone].sort((a, b) => {
            const da = a.story_date || a.capture_date;
            const db = b.story_date || b.capture_date;
            if (da && db) return new Date(da) - new Date(db);
            if (da) return -1;
            if (db) return  1;
            return 0;
        });
    }, [overlaySlides]);

    // Hide Timeline button if no slides have milestone content
    const hasTimeline = overlayTimelineSlides.length > 0;

    const overlayActiveSlides = overlayMode === 'timeline' ? overlayTimelineSlides : overlaySlides;

    // True when the viewer is on the final slide in story mode (and series exists)
    const isAtLastSlide = showStoryOverlay
        && overlayMode === 'story'
        && overlayActiveSlides.length > 0
        && overlayCurrentIndex === overlayActiveSlides.length - 1;

    // True when the current overlay slide is a non-looping video — hides
    // ScaleBar and text panel so the video plays without UI interference.
    const overlayIsNonLoopingVideo = !!(
        overlayActiveSlides[overlayCurrentIndex]?.video_url &&
        !overlayActiveSlides[overlayCurrentIndex]?.video_loop
    );

    // ScaleBar: chapter segments (story mode)
    const scaleSegments = useMemo(() => {
        const total = overlaySlides.length;
        if (!total || !chapters.length) return [];
        let running = 0;
        return chapters
            .filter(ch => (ch.slides?.length || 0) > 0)
            .map((ch, i) => {
                const startIdx    = running;
                const widthPercent = ((ch.slides?.length || 0) / total) * 100;
                const firstSlide  = overlaySlides.find(sl => sl._chapter_id === ch.id);
                running += ch.slides?.length || 0;
                return {
                    id:          ch.id,
                    label:       ch.name || `Ch ${i + 1}`,
                    name:        ch.name || '',
                    chapterNum:  i + 1,
                    widthPercent,
                    startIdx,
                    slideCount:  ch.slides?.length || 0,
                    firstImage:  firstSlide?.image || '',
                    onClick:     () => setOverlayCurrentIndex(startIdx),
                };
            });
    }, [chapters, overlaySlides]);

    // ScaleBar: date ticks (timeline mode)
    const { scaleTicks, scaleStartLabel, scaleEndLabel } = useMemo(() => {
        if (!overlayTimelineSlides.length) return { scaleTicks: [], scaleStartLabel: '', scaleEndLabel: '' };

        const times = overlayTimelineSlides
            .map(sl => sl.story_date || sl.capture_date)
            .filter(Boolean)
            .map(d => new Date(d).getTime())
            .filter(t => !isNaN(t));

        if (times.length < 2) return { scaleTicks: [], scaleStartLabel: '', scaleEndLabel: '' };

        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const range   = maxTime - minTime;

        const ticks = [];
        const cur = new Date(minTime);
        cur.setDate(1);
        cur.setHours(0, 0, 0, 0);
        const endDate = new Date(maxTime);

        while (cur <= endDate) {
            const pct = ((cur.getTime() - minTime) / range) * 100;
            if (pct >= 0 && pct <= 100) {
                const isYear = cur.getMonth() === 0;
                ticks.push({
                    percent: pct,
                    label:   isYear
                        ? cur.getFullYear().toString()
                        : cur.toLocaleString('default', { month: 'short' }).toUpperCase() + ' ' + String(cur.getFullYear()).slice(2),
                    isYear,
                });
            }
            cur.setMonth(cur.getMonth() + 1);
        }

        const fmt = d => new Date(d).toLocaleString('default', { month: 'short', year: 'numeric' });
        return {
            scaleTicks:      ticks,
            scaleStartLabel: fmt(minTime),
            scaleEndLabel:   fmt(maxTime),
        };
    }, [overlayTimelineSlides]);

    // ScaleBar cursor position
    const cursorPercent = useMemo(() => {
        if (!overlayActiveSlides.length) return 0;

        if (overlayMode === 'timeline') {
            const currentSlide = overlayActiveSlides[overlayCurrentIndex];
            const times = overlayTimelineSlides
                .map(sl => sl.story_date || sl.capture_date)
                .filter(Boolean)
                .map(d => new Date(d).getTime())
                .filter(t => !isNaN(t));

            if (times.length < 2) {
                return overlayActiveSlides.length > 1
                    ? (overlayCurrentIndex / (overlayActiveSlides.length - 1)) * 100
                    : 0;
            }
            const minTime = Math.min(...times);
            const maxTime = Math.max(...times);
            const slDate  = currentSlide?.story_date || currentSlide?.capture_date;
            if (!slDate) return 50;
            const t = new Date(slDate).getTime();
            return Math.max(0, Math.min(100, ((t - minTime) / (maxTime - minTime)) * 100));
        }

        return overlayActiveSlides.length > 1
            ? (overlayCurrentIndex / (overlayActiveSlides.length - 1)) * 100
            : 0;
    }, [overlayMode, overlayCurrentIndex, overlayActiveSlides, overlayTimelineSlides]);

    // Which chapter is currently active (for ScaleBar label snap)
    const activeChapterIndex = useMemo(() => {
        if (!scaleSegments.length) return 0;
        for (let i = 0; i < scaleSegments.length; i++) {
            const { startIdx, slideCount } = scaleSegments[i];
            if (overlayCurrentIndex >= startIdx && overlayCurrentIndex < startIdx + slideCount) return i;
        }
        return scaleSegments.length - 1;
    }, [overlayCurrentIndex, scaleSegments]);

    // Keep map-view content hidden while the dissolve plays when leaving timeline mode
    useEffect(() => {
        if (showStoryOverlay && overlayMode === 'timeline') {
            if (timelineHideTimerRef.current) clearTimeout(timelineHideTimerRef.current);
            setTimelineContentHidden(true);
        } else {
            timelineHideTimerRef.current = setTimeout(() => setTimelineContentHidden(false), 1000);
        }
        return () => { if (timelineHideTimerRef.current) clearTimeout(timelineHideTimerRef.current); };
    }, [showStoryOverlay, overlayMode]);

    // Fly the map to the current slide's coordinates when navigating in Timeline mode
    useEffect(() => {
        if (overlayMode !== 'timeline' || !showStoryOverlay) return;
        const slide = overlayActiveSlides[overlayCurrentIndex];
        if (!slide || !isValidCoordinatePair(slide.coordinates)) return;
        setMapConfig(prev => ({
            ...prev,
            center: slide.coordinates,
            zoom:    slide.zoom    !== undefined ? slide.zoom    : prev.zoom,
            bearing: slide.bearing !== undefined ? slide.bearing : 0,
            pitch:   slide.pitch   !== undefined ? slide.pitch   : 0,
            mapStyle: slide.map_style || prev.mapStyle,
            flyDuration: 3,
            offset: [0, 0],
        }));
    }, [overlayMode, overlayCurrentIndex, showStoryOverlay]); // eslint-disable-line react-hooks/exhaustive-deps

    // Lock body scroll when library is open so background map-view doesn't scroll
    useEffect(() => {
        document.body.style.overflow = showLibraryModal ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [showLibraryModal]);

    const openOverlay = (chapterId, slideId, mode = 'story') => {
        const sourceSlides = mode === 'timeline' ? overlayTimelineSlides : overlaySlides;
        const idx = sourceSlides.findIndex(sl =>
            (chapterId ? sl._chapter_id === chapterId : true) &&
            (slideId   ? sl.id         === slideId   : true)
        );
        overlayScrollRef.current = window.scrollY;
        setOverlayCurrentIndex(idx !== -1 ? idx : 0);
        setOverlayMode(mode);
        setShowStoryOverlay(true);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('view', mode === 'timeline' ? 'timeline' : 'story');
            return next;
        }, { replace: true });
    };

    const togglePinnedLayer = (layerId) => {
        const map = mapInstanceRef.current;
        if (!map) return;
        setPinnedLayers(prev => prev.map(l => {
            if (l.id !== layerId) return l;
            const next = !l.visible;
            fadeMapLayer(map, layerId, next);
            return { ...l, visible: next };
        }));
    };

    const toggleRain = () => setRainActive(v => !v);
    const animateRainRef = useRef(null);  // rAF handle for rain fade
    const rainFactorRef  = useRef(0);     // current rendered factor (0 = off, 1 = fully on)

    // Fade both pills out when the End / footer section scrolls into view.
    useEffect(() => {
        const el = footerRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => setAtEnd(entry.isIntersecting),
            { threshold: 0.1 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Rain is driven purely by activeSlide.show_rain_button — no suppression for
    // Tools palette or Map Editor. Suppressing rain (setRain(null/invisible)) while
    // those panels open causes a Mapbox GL WebGL black screen on the rain slide
    // regardless of timing or approach. Since previewOnMap/jumpTo was removed from
    // LiveMapEditor's open handler there is no concurrent GL operation to guard against.
    // style.load listener re-applies state after any style reload.
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || typeof map.setRain !== 'function') return;

        const applyRain = () => {
            if (animateRainRef.current) {
                cancelAnimationFrame(animateRainRef.current);
                animateRainRef.current = null;
            }

            const shouldBeOn = !!activeSlide?.show_rain_button;
            const fromFactor = rainFactorRef.current;
            const toFactor   = shouldBeOn ? 1 : 0;

            if (fromFactor === toFactor) return;

            // Proportional duration so mid-transition reversals feel consistent
            const duration = RAIN_FADE_MS * Math.abs(toFactor - fromFactor);
            const start = performance.now();
            const ease = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

            const tick = (now) => {
                const raw    = Math.min((now - start) / duration, 1);
                const factor = fromFactor + (toFactor - fromFactor) * ease(raw);
                rainFactorRef.current = factor;

                if (factor <= 0) {
                    map.setRain(null);
                } else {
                    map.setRain({
                        ...RAIN_BASE,
                        opacity:  0.7 * factor,
                        vignette: 1.0 * factor,
                        density:  0.5 * factor,
                    });
                }

                if (raw < 1) {
                    animateRainRef.current = requestAnimationFrame(tick);
                } else {
                    animateRainRef.current = null;
                    rainFactorRef.current  = toFactor;
                }
            };

            animateRainRef.current = requestAnimationFrame(tick);
        };

        applyRain();

        // Re-apply after any style reload (style changes re-activate style-level rain)
        map.on('style.load', applyRain);
        return () => {
            map.off('style.load', applyRain);
            if (animateRainRef.current) {
                cancelAnimationFrame(animateRainRef.current);
                animateRainRef.current = null;
            }
        };
    }, [activeSlide, mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleOverlayClose = () => {
        const savedScroll = overlayScrollRef.current;
        setShowStoryOverlay(false);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('view');
            return next;
        }, { replace: true });
        setTimeout(() => window.scrollTo(0, savedScroll), 50);
    };

    const handleOverlayModeChange = (newMode) => {
        if (newMode === overlayMode) return;
        if (newMode === 'timeline') {
            timelineEnteredAtRef.current = Date.now();
            setShowEpisodeGallery(false);
        } else timelineEnteredAtRef.current = null;
        const currentSlide = overlayActiveSlides[overlayCurrentIndex];
        const newSlides = newMode === 'timeline' ? overlayTimelineSlides : overlaySlides;
        const newIdx = currentSlide ? newSlides.findIndex(sl => sl.id === currentSlide.id) : 0;
        setOverlayCurrentIndex(newIdx !== -1 ? newIdx : 0);
        setOverlayMode(newMode);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('view', newMode === 'timeline' ? 'timeline' : 'story');
            return next;
        }, { replace: true });
    };

    // Map a ScaleBar cursor drag (0–100%) back to a slide index.
    const handleScaleSeek = useCallback((percent) => {
        if (overlayMode === 'timeline') {
            const timed = overlayTimelineSlides
                .map((sl, i) => ({ i, t: new Date(sl.story_date || sl.capture_date).getTime() }))
                .filter(({ t }) => !isNaN(t));
            if (!timed.length) return;
            const minTime   = Math.min(...timed.map(x => x.t));
            const maxTime   = Math.max(...timed.map(x => x.t));
            const targetT   = minTime + (percent / 100) * (maxTime - minTime);
            let closest = timed[0];
            for (const item of timed) {
                if (Math.abs(item.t - targetT) < Math.abs(closest.t - targetT)) closest = item;
            }
            setOverlayCurrentIndex(closest.i);
        } else {
            const total = overlayActiveSlides.length;
            if (!total) return;
            const idx = Math.round((percent / 100) * (total - 1));
            setOverlayCurrentIndex(Math.max(0, Math.min(total - 1, idx)));
        }
    }, [overlayMode, overlayTimelineSlides, overlayActiveSlides]);

    const handleLibraryOpen = () => {
        libraryPrevViewRef.current = showStoryOverlay ? 'story' : null;
        setShowLibraryModal(true);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('view', 'library');
            return next;
        }, { replace: true });
    };

    const handleLibraryClose = () => {
        setShowLibraryModal(false);
        const prevView = libraryPrevViewRef.current;
        libraryPrevViewRef.current = null;
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (prevView === 'story') {
                next.set('view', 'story');
            } else {
                next.delete('view');
            }
            return next;
        }, { replace: true });
    };

    // Go directly to Map View from any state — closes both library and story
    // overlay so the Map View button always reaches the map regardless of which
    // overlapping views are currently open.
    const handleGoToMapView = () => {
        if (showLibraryModal) {
            setShowLibraryModal(false);
            libraryPrevViewRef.current = null;
        }
        if (showStoryOverlay) setShowStoryOverlay(false);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('view');
            return next;
        }, { replace: true });
        if (showStoryOverlay) {
            setTimeout(() => window.scrollTo(0, overlayScrollRef.current), 50);
        }
    };

    // Deep-link: open overlay/library immediately when chapters load.
    // Captured at mount so it fires once and never conflicts with the hero
    // title sequence (which only plays on normal loads with no ?view= param).
    useEffect(() => {
        if (!chapters.length || !deepLinkRef.current.view) return;
        const { view, chapterId, slideId } = deepLinkRef.current;
        deepLinkRef.current = { view: null, chapterId: null, slideId: null }; // consume
        if (view === 'story') {
            openOverlay(chapterId, slideId, 'story');
        } else if (view === 'timeline') {
            openOverlay(null, null, 'timeline');
        } else if (view === 'library') {
            setShowLibraryModal(true);
        }
    }, [chapters.length]); // eslint-disable-line react-hooks/exhaustive-deps

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

    // Chapter announcement banner — computed once here to keep JSX clean
    const bannerChapterFonts = { c: 'Righteous, cursive', f: 'Oswald, sans-serif', k: 'Oswald, sans-serif' };
    const bannerThemeFont = bannerChapterFonts[story?.map_style] || 'Raleway, sans-serif';
    const bannerChapter = chapters[activeChapter];
    const showBanner = carouselOpened && activeChapter >= 0 && !!bannerChapter && !showStoryOverlay;

    return (
        <StoryTranslationProvider language={story?.story_language} translations={story?.translations}>
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
                hasChapters={!showStoryOverlay && chapters.length > 0}
                hasAbout={!!(story?.about_org_name || story?.about_who_we_are || story?.about_what_we_do)}
                onOpenAbout={() => setShowAboutPanel(true)}
                mapStyle={story?.map_style || 'a'}
                onViewOtherStories={() => { setShowLibraryModal(false); setIsStorySlideshowOpen(true); }}
            />
            </div>



            {/* Map Background */}
            <StoryMapRenderer
                story={story}
                currentChapter={chapters[activeChapter] ?? null}
                currentSlide={activeSlide}
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
                onMapReady={(mapInstance) => { mapInstanceRef.current = mapInstance; setMapReady(true); }}
                showRoute={showRoute}
                showMarkers={showMarkers}
            />
            
            {/* Story Content */}
            <div className="relative pointer-events-none" data-name="story-content-container" style={{ visibility: timelineContentHidden ? 'hidden' : 'visible', opacity: timelineContentHidden ? 0 : 1, transition: timelineContentHidden ? 'none' : 'opacity 0.5s ease-out' }}>
                {/* Header */}
                <div className="pointer-events-auto" data-name="header-wrapper">
                <StoryHeader
                    key={storyId}
                    title={story.title}
                    subtitle={story.subtitle}
                    author={story.author}
                    heroImage={story.hero_image}
                    heroVideo={story.hero_video}
                    heroType={story.hero_type}
                    heroVideoLoop={story.hero_video_loop}
                    mapStyle={story?.map_style || 'a'}
                    heroCta={
                        (story.hero_cta_label || story.hero_cta_url)
                            ? { label: story.hero_cta_label, url: story.hero_cta_url }
                            : null
                    }
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
                        className="relative pointer-events-none"
                        style={{
                            zIndex: showStoryOverlay ? 0 : 200005,
                            transition: showStoryOverlay ? 'none' : 'z-index 0s 2.2s',
                        }}
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
                            isLastChapter={index === chapters.length - 1}
                            onNextChapter={() => navigateToChapter(index + 1)}
                            nextChapterName={chapters[index + 1]?.name || null}
                            onOpenFullscreen={(chId, slId) => openOverlay(chId, slId)}
                            onSlideFieldUpdate={(slideId, field, value) => {
                                setChapters(prev => prev.map(ch => ({
                                    ...ch,
                                    slides: ch.slides?.map(sl =>
                                        sl.id === slideId ? { ...sl, [field]: value } : sl
                                    ),
                                })));
                                setActiveSlide(prev => prev?.id === slideId ? { ...prev, [field]: value } : prev);
                            }}
                            onChapterFieldUpdate={(chapterId, field, value) => {
                                setChapters(prev => prev.map(ch =>
                                    ch.id === chapterId ? { ...ch, [field]: value } : ch
                                ));
                            }}
                            onSlideChange={(slide) => {
                                setActiveSlide(slide);

                                // ── Layer tracking — runs for ALL slides, no coordinate dependency ──
                                const newLayerId = slide.mapbox_layer_id || null;
                                setActiveLayerId(newLayerId);
                                const prevId = prevSlideLayerRef.current;
                                setPinnedLayers(prev => {
                                    let next = prev;
                                    if (prevId && prevId !== newLayerId) {
                                        next = next.map(l => l.id === prevId ? { ...l, visible: false } : l);
                                    }
                                    if (newLayerId) {
                                        const exists = next.find(l => l.id === newLayerId);
                                        if (exists) {
                                            next = next.map(l => l.id === newLayerId ? { ...l, visible: true } : l);
                                        } else {
                                            next = [...next, {
                                                id: newLayerId,
                                                name: slide.layer_display_name || newLayerId,
                                                visible: true,
                                            }];
                                        }
                                    }
                                    return next;
                                });
                                prevSlideLayerRef.current = newLayerId;

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
                                // Build interactive marker for this slide (unless explicitly hidden)
                                if (slide.show_on_map !== false) {
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
                                } // end show_on_map check
                                } // end !slide._noRoute (story markers)
                            }}
                            onExplore={() => setCarouselOpened(true)}
                        />
                    </div>
                ))}
                
                {/* End-of-story section */}
                <div ref={footerRef} className="pointer-events-auto" data-name="footer-wrapper">
                <StoryFooter
                    onRestart={scrollToTop}
                    relatedStories={relatedStories}
                    currentCategory={story?.category}
                    seriesEpisodes={seriesData?.episodes || []}
                    seriesTitle={seriesData?.series?.title || ''}
                    seriesId={seriesData?.series?.id || ''}
                    currentEpisodeNumber={story?.episode_number}
                    mapStyle={story?.map_style || ''}
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
                mapStyle={story?.map_style || 'a'}
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

            {/* Episode Gallery — triggered by pressing Next past the last slide */}
            <NextEpisodePanel
                isVisible={showEpisodeGallery && overlayMode !== 'timeline'}
                seriesTitle={seriesData?.series?.title || ''}
                seriesId={seriesData?.series?.id || ''}
                episodes={seriesData?.episodes || []}
                currentEpisodeNumber={story?.episode_number}
                mapStyle={story?.map_style || ''}
                onClose={() => setShowEpisodeGallery(false)}
                onNavigate={(episodeId) => {
                    setShowEpisodeGallery(false);
                    navigate(createPageUrl('StoryMapView') + '?id=' + episodeId);
                }}
            />

            {/* Live Map Editor */}
            <LiveMapEditor
                isOpen={isLiveEditorOpen}
                onClose={() => { setIsLiveEditorOpen(false); setShowToolPalette(false); }}
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

            {/* Story View Pill — single instance, always above all overlays (z-200020) */}
            <StoryViewPill
                storyId={storyId}
                currentView={
                    showLibraryModal ? 'library' :
                    showStoryOverlay ? 'story' :
                    'map'
                }
                isVisible={isBannerVisible}
                entranceDelay={pillsInitialized ? 0 : 4}
                onOpenMap={
                    (showLibraryModal || showStoryOverlay) ? handleGoToMapView : null
                }
                onOpenStory={() => {
                    if (showLibraryModal) setShowLibraryModal(false);
                    if (showStoryOverlay) handleOverlayModeChange('story');
                    else openOverlay(null, activeSlide?.id || null, 'story');
                }}
                onOpenLibrary={handleLibraryOpen}
                atEnd={atEnd}
            />

            {/* Chapter announcement banner — shows when user clicks Explore on a chapter card */}
            <AnimatePresence>
                {showBanner && (
                    <motion.div
                        key={activeChapter}
                        className="fixed pointer-events-none overflow-hidden"
                        style={{ top: 100, left: 380, right: 0, height: 60, zIndex: 200003 }}
                        exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' } }}
                    >
                        {/* Background panel — expands from left edge over 2s */}
                        <motion.div
                            className="absolute inset-0"
                            style={{ background: 'rgba(255,255,255,0.8)', transformOrigin: 'left' }}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ delay: 1, duration: 2, ease: [0.4, 0, 0.2, 1] }}
                        />

                        {/* Text row — sits above the expanding background */}
                        <div className="relative flex items-center gap-2 h-full" style={{ paddingLeft: 100 }}>

                            {/* Chapter number — slides in from left */}
                            <motion.span
                                className="text-slate-800 font-medium uppercase tracking-widest whitespace-nowrap"
                                style={{ fontFamily: bannerThemeFont, fontSize: '1rem' }}
                                initial={{ opacity: 0, x: -40 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 1.7, duration: 1.4, ease: 'easeOut' }}
                            >
                                {`Chapter ${String(activeChapter + 1).padStart(2, '0')}`}
                            </motion.span>

                            <motion.div
                                className="w-px h-5 bg-slate-400 flex-shrink-0"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 2.2, duration: 0.8 }}
                            />

                            {/* Chapter title — slides in from right */}
                            <motion.span
                                className="text-slate-900 font-light text-4xl tracking-wide whitespace-nowrap"
                                style={{ fontFamily: bannerThemeFont, fontWeight: 300, position: 'relative', top: '-3px' }}
                                initial={{ opacity: 0, x: 40 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 1.9, duration: 1.4, ease: 'easeOut' }}
                            >
                                {bannerChapter?.name}
                            </motion.span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sub-pill — bottom left, contextual controls */}
            {isBannerVisible && (
                <AnimatePresence mode="wait">
                    {showLibraryModal ? (
                        <motion.div
                            key="library-pill"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: atEnd ? 0 : 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="fixed left-0 z-[200020] pointer-events-auto"
                            style={{ bottom: 0, width: 380, height: 80, cursor: 'pointer', willChange: 'transform', pointerEvents: atEnd ? 'none' : undefined }}
                        >
                            <LibraryPill onUpload={() => setLibraryUploadKey(k => k + 1)} />
                        </motion.div>
                    ) : showStoryOverlay ? (
                        <motion.div
                            key="fullscreen-nav"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: atEnd ? 0 : 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="fixed left-0 z-[200020] pointer-events-auto"
                            style={{ bottom: 0, width: 380, height: 80, cursor: 'pointer', willChange: 'transform', pointerEvents: atEnd ? 'none' : undefined }}
                        >
                            <FullscreenNavPill
                                onPrev={() => {
                                    if (showEpisodeGallery) {
                                        setShowEpisodeGallery(false);
                                    } else {
                                        setOverlayCurrentIndex(i => Math.max(0, i - 1));
                                    }
                                }}
                                onNext={() => {
                                    if (isAtLastSlide && seriesData?.episodes?.length) {
                                        setShowEpisodeGallery(true);
                                    } else {
                                        setOverlayCurrentIndex(i => Math.min(overlayActiveSlides.length - 1, i + 1));
                                    }
                                }}
                                hasMultiple={overlayActiveSlides.length > 1}
                                hasTimeline={hasTimeline}
                                mode={overlayMode}
                                onModeChange={handleOverlayModeChange}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="bottom-pill"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: atEnd ? 0 : 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.5, ease: 'easeOut', delay: pillsInitialized ? 0 : 5 }}
                            className="fixed left-0 z-[200020] pointer-events-auto"
                            style={{ bottom: 0, height: 80, width: 'fit-content', minWidth: 380, cursor: 'pointer', willChange: 'transform', pointerEvents: atEnd ? 'none' : undefined }}
                        >
                            <BottomPillBar
                                onZoomIn={() => mapInstanceRef.current?.zoomIn()}
                                onZoomOut={() => mapInstanceRef.current?.zoomOut()}
                                onResetNorth={() => mapInstanceRef.current?.resetNorth({ duration: 1000 })}
                                showRoute={showRoute}
                                onToggleRoute={() => setShowRoute(v => !v)}
                                showMarkers={showMarkers}
                                onToggleMarkers={() => setShowMarkers(v => !v)}
                                pinnedLayers={pinnedLayers}
                                onToggleLayer={togglePinnedLayer}
                                showRainButton={!!activeSlide?.show_rain_button}
                                rainActive={!!activeSlide?.show_rain_button}
                                onToggleRain={toggleRain}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            )}


            {/* ── Story overlay ── immersive reader rendered over the live map ── */}
            <AnimatePresence>
                {showStoryOverlay && (
                    <motion.div
                        initial={{ opacity: 0, y: 200 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 200, transition: { duration: 2, ease: [0.25, 1, 0.5, 1] } }}
                        transition={{ duration: 3, ease: [0.25, 1, 0.5, 1] }}
                        className="fixed inset-0"
                        style={{ zIndex: 200000 }}
                    >
                        <FullScreenImageViewer
                            isOpen={true}
                            onClose={handleOverlayClose}
                            slides={overlayActiveSlides}
                            currentIndex={overlayCurrentIndex}
                            onNavigate={setOverlayCurrentIndex}
                            chapterName={overlayActiveSlides[overlayCurrentIndex]?.chapter_name || ''}
                            mapStyle={story?.map_style || 'a'}
                            viewMode={overlayMode}
                            hideControlStrip={true}
                            hideMedia={overlayMode === 'timeline'}
                            hideTextPanel={overlayMode === 'picture'}
                            hideChapterTitle={overlayMode === 'story'}
                            inOverlay={true}
                            chapterColorIndex={activeChapter >= 0 ? activeChapter % 6 : 0}
                            addHotspotMode={addHotspotMode}
                            onAddHotspotModeConsumed={() => setAddHotspotMode(false)}
                            onSlideFieldUpdate={(slideId, field, value) => {
                                setChapters(prev => prev.map(ch => ({
                                    ...ch,
                                    slides: ch.slides?.map(sl =>
                                        sl.id === slideId ? { ...sl, [field]: value } : sl
                                    ),
                                })));
                            }}
                            onChapterNameSaved={(chapterId, name) => {
                                setChapters(prev => prev.map(ch =>
                                    ch.id === chapterId ? { ...ch, name } : ch
                                ));
                            }}
                        />

                        {/* Bottom gradient */}
                        <div className="fixed pointer-events-none" style={{
                            left: 0, right: 0, bottom: 0, height: 400, zIndex: 9998,
                            background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 100%)',
                        }} />

                        {/* Top gradient — story mode only */}
                        <AnimatePresence>
                        {overlayMode !== 'picture' && overlayMode !== 'timeline' && !overlayIsNonLoopingVideo && (
                            <motion.div
                                className="fixed pointer-events-none"
                                style={{ left: 0, right: 0, top: 100, height: 250, zIndex: 9998,
                                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%)' }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 1, ease: 'easeInOut' }}
                            />
                        )}
                        </AnimatePresence>

                        {/* Bottom gradient — timeline mode only, behind date axis */}
                        <AnimatePresence>
                        {overlayMode === 'timeline' && !overlayIsNonLoopingVideo && (
                            <motion.div
                                className="fixed pointer-events-none"
                                style={{ left: 0, right: 0, bottom: 0, height: 220, zIndex: 9998,
                                    background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)' }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 1, ease: 'easeInOut' }}
                            />
                        )}
                        </AnimatePresence>

                        {/* ScaleBar — Story mode (chapters), enters from top */}
                        <AnimatePresence>
                        {overlayMode !== 'picture' && overlayMode !== 'timeline' && !overlayIsNonLoopingVideo && (
                            <motion.div
                                className="fixed pointer-events-none"
                                style={{ left: 0, right: 0, top: 140, zIndex: 9999 }}
                                initial={{ opacity: 0, y: -30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, transition: { duration: 1, ease: 'easeInOut' } }}
                                transition={{ delay: 2, duration: 1, ease: 'easeOut' }}
                            >
                                <ScaleBar
                                    mode="chapters"
                                    cursorPercent={cursorPercent}
                                    activeChapterIndex={activeChapterIndex}
                                    mapStyle={story?.map_style || 'a'}
                                    segments={scaleSegments}
                                    ticks={scaleTicks}
                                    startLabel={scaleStartLabel}
                                    endLabel={scaleEndLabel}
                                    height={140}
                                    onSeek={handleScaleSeek}
                                />
                            </motion.div>
                        )}
                        </AnimatePresence>

                        {/* ScaleBar — Timeline mode (dates), enters from bottom */}
                        <AnimatePresence>
                        {overlayMode === 'timeline' && !overlayIsNonLoopingVideo && (
                            <motion.div
                                className="fixed pointer-events-none"
                                style={{ left: 0, right: 0, bottom: 85, height: 72, zIndex: 9999 }}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, transition: { duration: 1, ease: 'easeInOut' } }}
                                transition={{ delay: 2, duration: 1, ease: 'easeOut' }}
                            >
                                {/* Label overlaid on the track axis (top: 41 = trackTop+5) */}
                                <div style={{
                                    position: 'absolute',
                                    top: 26,
                                    transform: 'translateY(-50%)',
                                    width: 380,
                                    paddingRight: 32,
                                    fontSize: 24,
                                    fontWeight: 300,
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    textAlign: 'right',
                                    color: 'rgba(255,255,255,0.9)',
                                    fontFamily: bannerThemeFont,
                                    pointerEvents: 'none',
                                }}>
                                    Project Timeline
                                </div>
                                <ScaleBar
                                    mode="dates"
                                    bottomMode={true}
                                    cursorPercent={cursorPercent}
                                    activeChapterIndex={activeChapterIndex}
                                    mapStyle={story?.map_style || 'a'}
                                    segments={scaleSegments}
                                    ticks={scaleTicks}
                                    startLabel={scaleStartLabel}
                                    endLabel={scaleEndLabel}
                                    height={72}
                                    onSeek={handleScaleSeek}
                                />
                            </motion.div>
                        )}
                        </AnimatePresence>

                    </motion.div>
                )}
            </AnimatePresence>

            {/* Milestone Panel — AnimatePresence handles dissolve out on mode/overlay change */}
            <AnimatePresence>
                {showStoryOverlay && overlayMode === 'timeline' && (
                    <motion.div
                        key="milestone-outer"
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeOut' } }}
                        style={{ position: 'fixed', inset: 0, zIndex: 200006, pointerEvents: 'none' }}
                    >
                        <MilestonePanel
                            milestone={overlayActiveSlides?.[overlayCurrentIndex]?.milestone}
                            date={overlayActiveSlides?.[overlayCurrentIndex]?.story_date || overlayActiveSlides?.[overlayCurrentIndex]?.capture_date}
                            slideKey={overlayActiveSlides?.[overlayCurrentIndex]?.id}
                            cursorPercent={cursorPercent}
                            mapStyle={story?.map_style || 'a'}
                            initialDelay={timelineEnteredAtRef.current
                                ? Math.max(0, (3000 - (Date.now() - timelineEnteredAtRef.current)) / 1000)
                                : 0}
                            slideImage={overlayActiveSlides?.[overlayCurrentIndex]?.image || null}
                            imagePosition={overlayActiveSlides?.[overlayCurrentIndex]?.image_position || '50% 50%'}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

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

            {/* Library title banner — fixed at pill level, slides in from left when library opens */}
            <AnimatePresence>
                {showLibraryModal && (
                    <motion.div
                        key="library-banner"
                        className="fixed pointer-events-none overflow-hidden"
                        style={{ top: 100, left: 388, right: 0, height: 60, zIndex: 200011 }}
                        exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' } }}
                    >
                        {/* White background — expands from left */}
                        <motion.div
                            className="absolute inset-0"
                            style={{ background: 'rgba(255,255,255,0.92)', transformOrigin: 'left' }}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ delay: 0.3, duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
                        />
                        <div className="relative flex items-center gap-3 h-full" style={{ paddingLeft: 50 }}>
                            {/* "PROJECT" — slides in from left */}
                            <motion.span
                                className="text-slate-800 font-medium uppercase tracking-widest whitespace-nowrap"
                                style={{ fontFamily: bannerThemeFont, fontSize: '1rem' }}
                                initial={{ opacity: 0, x: -40 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.8, duration: 1.4, ease: 'easeOut' }}
                            >
                                Project
                            </motion.span>
                            <motion.div
                                className="w-px h-5 bg-slate-400 flex-shrink-0"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.3, duration: 0.8 }}
                            />
                            {/* "Document Library" — slides in from right */}
                            <motion.span
                                className="text-slate-900 font-light text-4xl tracking-wide whitespace-nowrap"
                                style={{ fontFamily: bannerThemeFont, fontWeight: 300, position: 'relative', top: '-3px' }}
                                initial={{ opacity: 0, x: 40 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 1.0, duration: 1.4, ease: 'easeOut' }}
                            >
                                Document Library
                            </motion.span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Document Library — full-viewport blur layer */}
            <AnimatePresence>
                {showLibraryModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className="fixed top-[100px] left-0 right-0 bottom-0 z-[200009] backdrop-blur-xl"
                    />
                )}
            </AnimatePresence>

            {/* Document Library — panel with margins */}
            <AnimatePresence>
                {showLibraryModal && (
                    <motion.div
                        initial={{ opacity: 0, y: 200 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 200, transition: { duration: 2, ease: [0.25, 1, 0.5, 1] } }}
                        transition={{ duration: 3, ease: [0.25, 1, 0.5, 1] }}
                        className="fixed z-[200010] pointer-events-auto flex flex-col"
                        style={{ top: 160, left: 80, right: 80, bottom: 0 }}
                    >
                        {/* Top gradient — 30% black fading to transparent over 200px */}
                        <div className="absolute top-0 pointer-events-none" style={{ left: -80, right: -80, height: 200, background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)' }} />
                        <div className="relative flex-1 overflow-hidden mt-4">
                            <DocumentManagerContent storyId={storyId} dark triggerUploadKey={libraryUploadKey} mapStyle={story?.map_style || 'a'} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* About panel */}
            <AboutPanel
                isOpen={showAboutPanel}
                onClose={() => setShowAboutPanel(false)}
                story={story}
            />

            {/* User control — top-left of banner, before logo */}
            {currentUser && isBannerVisible && (
                <div
                    className="fixed top-0 left-0 h-[100px] z-[200002] pointer-events-auto group transition-colors duration-150 group-hover:bg-slate-100/80"
                    style={{ width: 380 }}
                >
                    {/* Username link — centred in the upper 70px above the palette */}
                    <Link
                        to={createPageUrl('Stories')}
                        className="absolute text-slate-300 text-sm font-light group-hover:text-slate-800 transition-colors duration-150 whitespace-nowrap"
                        style={{ top: 15, height: 70, left: 24, display: 'flex', alignItems: 'center' }}
                    >
                        {currentUser.full_name || currentUser.email}
                    </Link>

                    {/* Hover palette — 380×30, bottom of banner, aligns exactly with pill below */}
                    <div
                        className="absolute bottom-0 left-0 flex items-stretch bg-black/50 backdrop-blur-xl border border-white/20 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto"
                        style={{ width: 380, height: 30 }}
                    >
                        <button
                            onClick={logout}
                            title="Log out"
                            className="flex-1 h-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors duration-200 cursor-pointer"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                        <div className="w-px self-stretch bg-white/20 flex-shrink-0" />
                        <button
                            onClick={() => setIsEditTransitioning(true)}
                            title="Edit story"
                            className="flex-1 h-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors duration-200 cursor-pointer"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <div className="w-px self-stretch bg-white/20 flex-shrink-0" />
                        <button
                            onClick={() => setShowToolPalette(v => !v)}
                            title="Tools"
                            className="flex-1 h-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors duration-200 cursor-pointer"
                        >
                            <Wrench className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}


            {/* Scroll shield — sits in the lower portion of the carousel column, behind
                the chapter card. Intercepts wheel events so scrolling in that area
                advances the story rather than zooming the map. 50px insets clear the
                ChapterNavigation circles on the right. z-[5] keeps it above the map
                canvas but well below all UI elements. Map view only. */}
            {!showStoryOverlay && (
                <div
                    className="fixed pointer-events-auto"
                    style={{ left: 'calc(50% + 10px)', right: 50, top: '60vh', bottom: 0, zIndex: 5 }}
                    onWheel={(e) => {
                        e.preventDefault();
                        window.scrollBy({ top: e.deltaY });
                    }}
                />
            )}

            {/* Tool palette — anchored below banner on the left */}
            {currentUser && (
                <ToolPalette
                    isOpen={showToolPalette}
                    onClose={() => setShowToolPalette(false)}
                    view={showStoryOverlay ? 'story' : 'map'}
                    hasActiveSlide={!showStoryOverlay && !!activeSlide?.image}
                    onOpenMapEditor={() => setIsLiveEditorOpen(true)}
                    onOpenImagePosition={() => setShowImagePositionModal(true)}
                    onAddTooltip={() => setAddHotspotMode(true)}
                />
            )}

            {/* Slide image position modal */}
            <SlideImagePositionModal
                slide={activeSlide}
                isOpen={showImagePositionModal}
                onClose={() => setShowImagePositionModal(false)}
                onSaved={(slideId, pos) => {
                    setChapters(prev => prev.map(ch => ({
                        ...ch,
                        slides: ch.slides?.map(sl =>
                            sl.id === slideId ? { ...sl, image_position: pos } : sl
                        ),
                    })));
                    setActiveSlide(prev => prev?.id === slideId ? { ...prev, image_position: pos } : prev);
                }}
            />

            </div>
        </StoryTranslationProvider>
        );
        }