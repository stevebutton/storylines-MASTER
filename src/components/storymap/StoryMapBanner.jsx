import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { List, LogIn, LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import SocialShareButtons from './SocialShareButtons';

export default function StoryMapBanner({ 
    isVisible = true,
    storyTitle = '',
    hasExplored = false,
    storyId = '',
    isShareable = false
}) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const currentUser = await base44.auth.me();
                setUser(currentUser);
            } catch (error) {
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };
        checkAuth();
    }, []);

    const handleLogin = () => {
        base44.auth.redirectToLogin();
    };

    const handleLogout = () => {
        base44.auth.logout();
    };
    return (
        <>
            {/* Logo - Fixed position, always visible when banner is active, hidden on mobile */}
            {isVisible && (
                <Link 
                    to={createPageUrl('ProjectInterface')}
                    className="hidden md:block fixed left-[65px] top-0 z-[10000] transition-all duration-700 opacity-100 translate-y-0"
                >
                    <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/992378b3f_storyline-logo.png" 
                        alt="Storylines" 
                        width="250"
                        height="100"
                        className="hover:scale-110 transition-transform duration-500 cursor-pointer"
                    />
                </Link>
            )}

            {/* Banner Background */}
            <div 
                className={cn(
                    "fixed top-0 left-0 right-0 z-[10000] h-[100px] transition-all duration-700",
                    "bg-white/95 backdrop-blur-xl shadow-lg border-b border-slate-200/50",
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
                )}
            >
                {/* Story Title */}
                {storyTitle && (
                    <motion.div 
                        className="absolute text-slate-800 left-0 right-0 md:left-[322px] md:right-[50px] font-light text-center md:text-left px-4 md:px-0 text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl"
                        style={{ 
                            top: '26px'
                        }}
                        initial={{ opacity: 0, x: 20 }}
                        animate={hasExplored ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                        transition={{ duration: 1.5, delay: hasExplored ? 3 : 0, ease: "easeOut" }}
                    >
                        {storyTitle}
                    </motion.div>
                )}
            </div>

            {/* Footer - Hidden, navigation moved to StoryFooter */}
        </>
    );
}