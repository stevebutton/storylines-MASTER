import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { createPageUrl } from '@/utils';

const THEME_FONTS = { c: 'Righteous, cursive', f: 'Oswald, sans-serif', k: 'Oswald, sans-serif' };

const stripHtml = (str) => str ? str.replace(/<[^>]*>/g, '') : str;

export default function NextEpisodePanel({
    isVisible,
    seriesTitle          = '',
    seriesId             = '',
    episodes             = [],
    currentEpisodeNumber = null,
    mapStyle             = '',
    onClose,
    onNavigate,
}) {
    if (!episodes.length) return null;

    const themeFont = THEME_FONTS[mapStyle] || 'Raleway, sans-serif';

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 60 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 2, ease: [0.25, 1, 0.5, 1] }}
                    className="fixed inset-0 pointer-events-auto flex flex-col items-center justify-center"
                    style={{ zIndex: 200004, background: 'rgba(0,0,0,0.93)' }}
                >
                    <div className="w-full max-w-5xl px-8 overflow-y-auto" style={{ maxHeight: '100vh', paddingTop: '3rem', paddingBottom: '3rem' }}>

                        {/* Header */}
                        <div className="flex items-start justify-between mb-8">
                            <h2
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
                            </h2>
                            <button
                                onClick={onClose}
                                className="text-white/40 hover:text-white transition-colors ml-6 flex-shrink-0 mt-1"
                                aria-label="Close"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Episode grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                            {episodes.map((ep) => {
                                const isCurrent = ep.episode_number === currentEpisodeNumber;
                                const thumb = ep.thumbnail
                                    || (ep.hero_type !== 'video' ? ep.hero_image : null)
                                    || null;
                                return (
                                    <div
                                        key={ep.id}
                                        onClick={() => !isCurrent && onNavigate(ep.id)}
                                        className={`group relative rounded-xl overflow-hidden shadow-lg border ${
                                            isCurrent
                                                ? 'opacity-50 cursor-default border-white/15'
                                                : 'cursor-pointer border-white/20 hover:border-white/40 transition-colors'
                                        }`}
                                    >
                                        <motion.div
                                            whileHover={isCurrent ? {} : { y: -4 }}
                                            transition={{ duration: 0.25 }}
                                            className="relative"
                                            style={{ height: 200 }}
                                        >
                                            {thumb ? (
                                                <img
                                                    src={thumb}
                                                    alt={stripHtml(ep.title)}
                                                    className="w-full h-full object-cover"
                                                    style={{ filter: isCurrent ? 'grayscale(40%)' : 'none' }}
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

                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
