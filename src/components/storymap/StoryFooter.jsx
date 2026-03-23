import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { useTranslation } from '@/contexts/StoryTranslationContext';

const THEME_FONTS = { c: 'Righteous, cursive', f: 'Oswald, sans-serif', k: 'Oswald, sans-serif' };

const stripHtml = (str) => str ? str.replace(/<[^>]*>/g, '') : str;

export default function StoryFooter({
    onRestart,
    relatedStories       = [],
    currentCategory,
    seriesEpisodes       = [],
    seriesTitle          = '',
    seriesId             = '',
    currentEpisodeNumber = null,
    mapStyle             = '',
}) {
    const { t } = useTranslation();
    const themeFont = THEME_FONTS[mapStyle] || 'Raleway, sans-serif';
    const hasSeries = seriesEpisodes.length > 0;

    return (
        <div className="min-h-screen flex items-center justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent z-10" />

            <motion.div
                className="relative z-20 text-center px-6 w-full max-w-5xl pointer-events-auto"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 1 }}
                viewport={{ once: false }}
            >
                {/* Decorative */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    <div className="w-16 h-px bg-white/30" />
                    <div className="w-3 h-3 rounded-full border-2 border-amber-500" />
                    <div className="w-16 h-px bg-white/30" />
                </div>

                {/* 1. Back to beginning */}
                <Button
                    onClick={onRestart}
                    variant="outline"
                    className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:border-white/50 gap-2 mb-8"
                >
                    <ArrowUp className="w-4 h-4" />
                    {t('back_to_beginning')}
                </Button>

                {/* Thank you — shown alone when there are no episodes or related stories */}
                {!hasSeries && relatedStories.length === 0 && (
                    <p className="text-white/70 mt-4 text-left" style={{ fontSize: 28, paddingLeft: 50 }}>
                        {t('thank_you')}
                    </p>
                )}

                {/* 3. Series episodes — only when story is part of a series */}
                {hasSeries && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        viewport={{ once: false }}
                    >
                        <p className="text-white/70 mb-4 text-left" style={{ fontSize: 28, paddingLeft: 50 }}>
                            {t('thank_you')}
                        </p>
                        <h3
                            className="mb-8 text-left"
                            style={{
                                fontFamily: themeFont,
                                fontSize:   28,
                                lineHeight: 1.2,
                                cursor:     seriesId ? 'pointer' : 'default',
                            }}
                            onClick={seriesId ? () => { window.location.href = createPageUrl('SeriesView') + '?id=' + seriesId; } : undefined}
                        >
                            <span style={{ fontWeight: 300, color: 'rgba(255,255,255,0.7)' }}>More episodes from </span>
                            <span style={{ fontWeight: 700, color: '#fff', textDecoration: seriesId ? 'underline' : 'none' }}>{seriesTitle}</span>
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                            {seriesEpisodes.map((ep) => {
                                const thumb = ep.thumbnail
                                    || (ep.hero_type !== 'video' ? ep.hero_image : null)
                                    || null;
                                const isCurrent = ep.episode_number === currentEpisodeNumber;
                                return (
                                    <div
                                        key={ep.id}
                                        onClick={() => {
                                            if (!isCurrent) window.location.href = `${createPageUrl('StoryMapView')}?id=${ep.id}`;
                                        }}
                                        className={`group relative rounded-xl overflow-hidden shadow-lg border border-white/20 ${isCurrent ? 'opacity-50 cursor-default' : 'cursor-pointer hover:border-white/40 transition-colors'}`}
                                    >
                                        <motion.div
                                            whileHover={isCurrent ? {} : { y: -4 }}
                                            className="relative"
                                            style={{ height: 220 }}
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
                                            <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                                                <div style={{
                                                    fontFamily:    'Raleway, sans-serif',
                                                    fontSize:      13,
                                                    fontWeight:    700,
                                                    letterSpacing: '0.12em',
                                                    textTransform: 'uppercase',
                                                    color:         isCurrent ? 'rgba(255,255,255,0.5)' : 'rgba(245,158,11,0.95)',
                                                    marginBottom:  6,
                                                }}>
                                                    {isCurrent ? 'Current episode' : `Episode ${ep.episode_number}`}
                                                </div>
                                                <h4 className="text-white font-semibold text-xl leading-tight mb-1">
                                                    {stripHtml(ep.title)}
                                                </h4>
                                                {ep.subtitle && (
                                                    <p className="text-white/65 text-sm leading-snug line-clamp-2">
                                                        {stripHtml(ep.subtitle)}
                                                    </p>
                                                )}
                                            </div>
                                        </motion.div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* 4. Other stories — only when NOT part of a series */}
                {!hasSeries && relatedStories.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        viewport={{ once: false }}
                        className="mt-4"
                    >
                        <p className="text-white/70 mb-4 text-left" style={{ fontSize: 28, paddingLeft: 50 }}>
                            {t('thank_you')}
                        </p>
                        <h3 className="text-xl font-light text-white/80 mb-6 text-left">
                            {t('more_stories')}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {relatedStories.map((relatedStory) => (
                                <div
                                    key={relatedStory.id}
                                    onClick={() => window.location.href = `${createPageUrl('StoryMapView')}?id=${relatedStory.id}`}
                                    className="group cursor-pointer"
                                >
                                    <motion.div
                                        whileHover={{ y: -4 }}
                                        className="relative h-60 rounded-lg overflow-hidden shadow-lg"
                                    >
                                        <img
                                            src={relatedStory.hero_image}
                                            alt={stripHtml(relatedStory.title)}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                                        <div className="absolute bottom-0 left-0 right-0 p-4">
                                            <h4 className="text-white font-semibold text-xl mb-1 leading-tight">
                                                {stripHtml(relatedStory.title)}
                                            </h4>
                                            {relatedStory.subtitle && (
                                                <p className="text-white/70 text-sm leading-snug">
                                                    {stripHtml(relatedStory.subtitle)}
                                                </p>
                                            )}
                                        </div>
                                    </motion.div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
