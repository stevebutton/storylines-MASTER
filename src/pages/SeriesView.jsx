import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import { createPageUrl } from '@/utils';
import StoryHeader from '@/components/storymap/StoryHeader';

const stripHtml = (str) => str ? str.replace(/<[^>]*>/g, '') : str;

export default function SeriesView() {
    const [series,   setSeries]   = useState(null);
    const [episodes, setEpisodes] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState(null);
    const episodesRef = useRef(null);

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
        <div className="bg-black min-h-screen">

            {/* Hero */}
            <StoryHeader
                title={series.title}
                subtitle={series.subtitle || ''}
                heroImage={series.cover_image}
                heroType="image"
                mapStyle=""
                onExplore={() => episodesRef.current?.scrollIntoView({ behavior: 'smooth' })}
            />

            {/* Episodes section */}
            <div
                ref={episodesRef}
                className="min-h-screen bg-black py-20 px-8"
            >
                {series.description && (
                    <motion.p
                        className="text-white/70 text-lg max-w-2xl mx-auto mb-14 text-center leading-relaxed"
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
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto pb-20">
                        {episodes.map((ep, index) => {
                            const thumb = ep.thumbnail
                                || (ep.hero_type !== 'video' ? ep.hero_image : null)
                                || null;
                            return (
                                <motion.div
                                    key={ep.id}
                                    onClick={() => { window.location.href = createPageUrl('StoryMapView') + '?id=' + ep.id; }}
                                    className="group relative rounded-xl overflow-hidden cursor-pointer border border-white/20 hover:border-white/40 transition-colors"
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
            </div>
        </div>
    );
}
