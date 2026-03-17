import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/api/supabaseClient';
import { createPageUrl } from '@/utils';
import StoryHeader from '@/components/storymap/StoryHeader';

// Smooth-scroll to a target element over `duration` ms with ease-in-out
const smoothScrollTo = (target, duration = 3000) => {
    const start = window.scrollY;
    const end   = target.getBoundingClientRect().top + start;
    const diff  = end - start;
    let startTime = null;
    const ease = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const elapsed  = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        window.scrollTo(0, start + diff * ease(progress));
        if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
};

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_API_KEY || 'pk.eyJ1Ijoic3RldmVidXR0b24iLCJhIjoiNEw1T183USJ9.Sv_1qSC23JdXot8YIRPi8A';
mapboxgl.accessToken = MAPBOX_TOKEN;

const MAP_STYLES = {
    a: 'mapbox://styles/stevebutton/clummsfw1002701mpbiw3exg7',
    b: 'mapbox://styles/stevebutton/cktf8ygms085117nnzm4a97d0',
    c: 'mapbox://styles/stevebutton/ckn1s2y342eq018tidycnavti',
    d: 'mapbox://styles/stevebutton/cmm9edvor004m01sc0wyug8vz',
    e: 'mapbox://styles/stevebutton/cmmanazrf000f01qvaghi0jhv',
    f: 'mapbox://styles/stevebutton/cmmd2lwzp001m01s24puoahpd',
    g: 'mapbox://styles/stevebutton/cmmd3clf0001o01s2biib8ju2',
    h: 'mapbox://styles/stevebutton/ck9i8wv640t4c1iqeiphu3soc',
    i: 'mapbox://styles/stevebutton/cllw84jo600f401r7afyy7ef4',
    j: 'mapbox://styles/stevebutton/cmmg2352g002q01s82q1d6zzo',
    k: 'mapbox://styles/stevebutton/cmmmcnbw5009z01sb3xf72ldy',
    l: 'mapbox://styles/stevebutton/cmmuqyi1p00a501s955v9393b',
};

const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/91ab42d74_logoadjustedpng.png';

const stripHtml = (str) => str ? str.replace(/<[^>]*>/g, '') : str;

export default function SeriesView() {
    const [series,   setSeries]   = useState(null);
    const [episodes, setEpisodes] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState(null);
    const [showBlackOverlay, setShowBlackOverlay] = useState(true);
    const [mapReady, setMapReady] = useState(false);
    const overlayTimeoutRef = useRef(null);
    const episodesRef     = useRef(null);
    const mapContainerRef = useRef(null);
    const mapRef          = useRef(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const seriesId = params.get('id');
        if (!seriesId) { setError('No series ID provided'); setLoading(false); return; }

        const fetchData = async () => {
            try {
                const [{ data: seriesData, error: seriesError }, { data: episodeData, error: epError }] = await Promise.all([
                    supabase.from('series').select('*').eq('id', seriesId).single(),
                    supabase.from('stories')
                        .select('id, title, subtitle, episode_number, thumbnail, hero_image, hero_type')
                        .eq('series_id', seriesId)
                        .order('episode_number'),
                ]);
                if (seriesError) throw seriesError;
                if (epError) throw epError;
                setSeries(seriesData);
                setEpisodes(episodeData || []);
            } catch (err) {
                console.error('SeriesView fetch:', err);
                setError('Failed to load series');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // 5-second fallback — never stay permanently black
    useEffect(() => {
        if (!series) return;
        const id = setTimeout(() => setShowBlackOverlay(false), 5000);
        return () => clearTimeout(id);
    }, [series]);

    // Initialise Mapbox background map only after hero image has loaded
    // so the map is never visible during the black intro overlay
    useEffect(() => {
        if (!mapReady || !series || !mapContainerRef.current || mapRef.current) return;

        const styleUrl = MAP_STYLES[series.map_style] || MAP_STYLES.a;

        mapRef.current = new mapboxgl.Map({
            container:   mapContainerRef.current,
            style:       styleUrl,
            center:      [series.map_lng ?? 20, series.map_lat ?? 20],
            zoom:        series.map_zoom ?? 2,
            bearing:     0,
            pitch:       0,
            interactive: false,
            attributionControl: false,
        });

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [series, mapReady]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !series) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <p className="text-white/60">{error || 'Series not found'}</p>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh' }}>

            {/* Map — fixed background, revealed when hero scrolls away */}
            <div ref={mapContainerRef} className="fixed inset-0" style={{ zIndex: 0 }} />

            {/* Black intro overlay — exits via AnimatePresence once hero image is loaded */}
            <AnimatePresence>
                {showBlackOverlay && (
                    <motion.div
                        className="fixed inset-0 bg-black pointer-events-none"
                        style={{ zIndex: 10001 }}
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                    />
                )}
            </AnimatePresence>

            {/* Hero — cover image sits on top of map */}
            <div className="relative" style={{ zIndex: 1 }}>
                <StoryHeader
                    title={series.title}
                    tagline={`a <strong>Storylines</strong> series`}
                    subtitle={series.subtitle || ''}
                    heroImage={series.cover_image}
                    heroType="image"
                    mapStyle={series.map_style || 'a'}
                    onHeroLoaded={() => {
                        setMapReady(true);
                        if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
                        overlayTimeoutRef.current = setTimeout(() => setShowBlackOverlay(false), 1000);
                    }}
                    onExplore={() => episodesRef.current && smoothScrollTo(episodesRef.current, 3000)}
                />
            </div>

            {/* Episodes section — sits over the revealed map */}
            <div ref={episodesRef} className="relative min-h-screen py-20 px-8" style={{ zIndex: 1 }}>
                {/* Dark overlay so episode cards stay legible against the map */}
                <div className="absolute inset-0 bg-black/30" style={{ zIndex: 0 }} />
                <div className="relative" style={{ zIndex: 1 }}>
                {series.description && (
                    <motion.p
                        className="text-white/70 max-w-2xl mx-auto mb-14 text-center leading-snug" style={{ fontSize: 22 }}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7 }}
                        viewport={{ once: true }}
                    >
                        {series.description}
                    </motion.p>
                )}

                {episodes.length === 0 ? (
                    <p className="text-white/40 text-center">No published episodes yet.</p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {episodes.map((ep, index) => {
                            const thumb = ep.thumbnail
                                || (ep.hero_type !== 'video' ? ep.hero_image : null)
                                || null;
                            return (
                                <motion.div
                                    key={ep.id}
                                    onClick={() => { window.location.href = createPageUrl('StoryMapView') + '?id=' + ep.id; }}
                                    className="group relative rounded-xl overflow-hidden cursor-pointer border-2 border-white/60 hover:border-white transition-colors"
                                    style={{ height: 260 }}
                                    initial={{ opacity: 0, y: 24 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    whileHover={{ y: -4 }}
                                    transition={{ duration: 0.5, delay: index * 0.08 }}
                                    viewport={{ once: true }}
                                >
                                    {thumb ? (
                                        <img
                                            src={thumb}
                                            alt={stripHtml(ep.title)}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-white/10" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                                    <div className="absolute bottom-0 left-0 right-0 p-5 text-left">
                                        <div style={{
                                            fontFamily:    'Raleway, sans-serif',
                                            fontSize:      13,
                                            fontWeight:    700,
                                            letterSpacing: '0.12em',
                                            textTransform: 'uppercase',
                                            color:         'rgba(245,158,11,0.95)',
                                            marginBottom:  6,
                                        }}>
                                            Episode {ep.episode_number}
                                        </div>
                                        <h3 className="text-xl font-semibold text-white leading-tight mb-1">
                                            {stripHtml(ep.title)}
                                        </h3>
                                        {ep.subtitle && (
                                            <p className="text-white/65 text-sm leading-snug line-clamp-2">
                                                {stripHtml(ep.subtitle)}
                                            </p>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Storylines logo */}
                <motion.div
                    className="flex justify-center pt-20"
                    style={{ paddingBottom: 60 }}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                    viewport={{ once: true }}
                >
                    <img
                        src={LOGO_URL}
                        alt="Storylines"
                        onClick={() => { window.location.href = createPageUrl('HomePageView'); }}
                        style={{ width: 250, height: 100, objectFit: 'contain', opacity: 0.6, cursor: 'pointer' }}
                    />
                </motion.div>
                </div>{/* end relative z-1 content wrapper */}
            </div>
        </div>
    );
}
