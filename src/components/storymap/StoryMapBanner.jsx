import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const THEME_FONTS = {
    c: 'Righteous, cursive',
};

export default function StoryMapBanner({
    isVisible = true,
    storyTitle = '',
    hasExplored = false,
    storyId = '',
    isShareable = false,
    isChapterMenuOpen,
    onToggleChapterMenu,
    hasChapters = false,
    mapStyle = 'a',
}) {
    const themeFont = THEME_FONTS[mapStyle] || null;
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Auth handled by Supabase — stubbed until Supabase Auth is wired up
    const handleLogin = () => {};
    const handleLogout = () => { setUser(null); };

    return (
        <div 
            className={cn(
                "fixed top-0 left-0 right-0 z-[10000] h-[100px] transition-all duration-700",
                "bg-white/95 backdrop-blur-xl shadow-lg border-b border-slate-200/50",
                "flex items-center justify-between px-6 md:px-12",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
            )}
        >
            {/* Logo - slides in from left after banner settles */}
            <motion.div
                className="hidden md:block flex-shrink-0 ml-[100px]"
                initial={{ opacity: 0, x: -80 }}
                animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -80 }}
                transition={{ duration: 2, delay: 1, ease: 'easeOut' }}
            >
                <Link to={createPageUrl('ProjectInterface')}>
                    <img
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/91ab42d74_logoadjustedpng.png"
                        alt="Storylines"
                        width="250"
                        height="100"
                        className="hover:scale-110 transition-transform duration-500 cursor-pointer"
                    />
                </Link>
            </motion.div>

            {/* Story title - slides in from right after banner settles */}
            {storyTitle && (
                <motion.div
                    className="text-slate-800 flex-grow text-left font-light text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl mx-4 md:mx-8"
                    style={themeFont ? { fontFamily: themeFont } : undefined}
                    initial={{ opacity: 0, x: 80 }}
                    animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: 80 }}
                    transition={{ duration: 2, delay: 1, ease: 'easeOut' }}
                >
                    {storyTitle}
                </motion.div>
            )}

            {/* Chapters Toggle Button - Right */}
            {hasChapters && (
                <button
                    onClick={onToggleChapterMenu}
                    className="flex-shrink-0 opacity-30 hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                >
                    <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/55fddbe88_Menubutton.png"
                        alt="Story Chapters"
                        width="50"
                        height="100"
                    />
                </button>
            )}
        </div>
    );
}