import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { List, BookOpen, Pencil, Info } from 'lucide-react';

const THEME_FONTS = {
    c: 'Righteous, cursive',
    f: 'Oswald, sans-serif',
    k: 'Oswald, sans-serif',
};

const btn = [
    'h-full w-[64px]',
    'flex items-center justify-center',
    'transition-all duration-200',
    'text-slate-500 hover:text-slate-800 hover:bg-slate-100',
].join(' ');

const btnActive = [
    'h-full w-[64px]',
    'flex items-center justify-center',
    'transition-all duration-200',
    'bg-slate-800 text-white',
].join(' ');

const divider = <div className="w-px self-stretch bg-slate-200 flex-shrink-0" />;

export default function StoryMapBanner({
    isVisible          = true,
    storyTitle         = '',
    hasExplored        = false,
    storyId            = '',
    isShareable        = false,
    isChapterMenuOpen,
    onToggleChapterMenu,
    hasChapters        = false,
    mapStyle           = 'a',
    centered           = false,
    // About panel
    hasAbout           = false,
    onOpenAbout,
    // Editorial actions — only wired in StoryMapView
    onViewOtherStories,
    onEditStory,
}) {
    const themeFont = THEME_FONTS[mapStyle] || null;

    const hasEditorial = onViewOtherStories || onEditStory;
    const showPill     = (hasChapters && onToggleChapterMenu) || (hasAbout && onOpenAbout) || hasEditorial;

    const logoEl = (
        <Link to={createPageUrl('HomePageView')}>
            <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/91ab42d74_logoadjustedpng.png"
                alt="Storylines"
                width="250"
                height="100"
                className="hover:scale-110 transition-transform duration-500 cursor-pointer"
            />
        </Link>
    );

    return (
        <div
            className={cn(
                'fixed top-0 left-0 right-0 z-[200001] h-[100px] transition-all duration-700',
                'bg-white/95 backdrop-blur-xl shadow-lg border-b border-slate-200/50',
                centered ? 'flex items-center' : 'flex items-center justify-between pl-6 md:pl-12',
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
            )}
        >
            {centered ? (
                /* Centered: logo + title together, centred in the banner */
                <div className="flex-1 flex items-center justify-center gap-6">
                    <motion.div
                        className="hidden md:block flex-shrink-0"
                        initial={{ opacity: 0, x: -40 }}
                        animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
                        transition={{ duration: 2, delay: 1, ease: 'easeOut' }}
                    >
                        {logoEl}
                    </motion.div>
                    {storyTitle && (
                        <motion.div
                            className="text-slate-800 font-light text-3xl md:text-5xl"
                            style={{ fontFamily: themeFont || 'Raleway, sans-serif' }}
                            initial={{ opacity: 0, x: 40 }}
                            animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
                            transition={{ duration: 2, delay: 1, ease: 'easeOut' }}
                        >
                            {storyTitle}
                        </motion.div>
                    )}
                </div>
            ) : (
                <>
                    {/* Logo — standard left-justified layout */}
                    <motion.div
                        className="hidden md:block flex-shrink-0 ml-[100px]"
                        initial={{ opacity: 0, x: -80 }}
                        animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -80 }}
                        transition={{ duration: 2, delay: 1, ease: 'easeOut' }}
                    >
                        {logoEl}
                    </motion.div>

                    {/* Story title */}
                    {storyTitle && (
                        <motion.div
                            className="text-slate-800 flex-grow text-left font-light text-3xl md:text-5xl mx-4 md:mx-8"
                            style={{ fontFamily: themeFont || 'Raleway, sans-serif' }}
                            initial={{ opacity: 0, x: 80 }}
                            animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: 80 }}
                            transition={{ duration: 2, delay: 1, ease: 'easeOut' }}
                        >
                            {storyTitle}
                        </motion.div>
                    )}
                </>
            )}

            {/* Right-side action bar — full-height rectangle flush to banner edge */}
            {showPill && (
                <div className="self-stretch flex items-stretch border-l border-slate-200 flex-shrink-0">

                    {/* Chapter menu toggle */}
                    {hasChapters && onToggleChapterMenu && (
                        <>
                            <button
                                onClick={onToggleChapterMenu}
                                className={isChapterMenuOpen ? btnActive : btn}
                                title="Chapter menu"
                            >
                                <List className="w-5 h-5" />
                            </button>
                            {hasEditorial && divider}
                        </>
                    )}

                    {/* About */}
                    {hasAbout && onOpenAbout && (
                        <>
                            <button onClick={onOpenAbout} className={btn} title="About">
                                <Info className="w-5 h-5" />
                            </button>
                            {hasEditorial && divider}
                        </>
                    )}

                    {/* Editorial actions */}
                    {onViewOtherStories && (
                        <button onClick={onViewOtherStories} className={btn} title="More stories">
                            <BookOpen className="w-5 h-5" />
                        </button>
                    )}
                    {onEditStory && (
                        <>
                            {divider}
                            <button onClick={onEditStory} className={btn} title="Edit story">
                                <Pencil className="w-5 h-5" />
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
