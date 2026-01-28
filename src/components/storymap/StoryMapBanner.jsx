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
            {/* Logo - Fixed position, always visible when banner is active */}
            <Link 
                to={createPageUrl('ProjectInterface')}
                className={cn(
                    "fixed left-[65px] top-[40px] z-[130] transition-all duration-700",
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
                )}
            >
                <img 
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/f1188d1fa_storylines-frame.png" 
                    alt="Storylines" 
                    className="h-auto hover:opacity-80 transition-opacity cursor-pointer"
                />
            </Link>

            {/* Banner Background */}
            <div 
                className={cn(
                    "fixed top-0 left-0 right-0 z-[115] h-[100px] transition-all duration-700",
                    "bg-white/95 backdrop-blur-xl shadow-lg border-b border-slate-200/50",
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
                )}
            >
                {/* Story Title */}
                {storyTitle && (
                    <motion.div 
                        className="absolute text-slate-800"
                        style={{ 
                            left: '342px', 
                            top: '28px', 
                            fontSize: '32px',
                            fontFamily: 'Montserrat, sans-serif',
                            fontWeight: '800'
                        }}
                        initial={{ opacity: 0, x: 20 }}
                        animate={hasExplored ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                        transition={{ duration: 1.5, delay: hasExplored ? 3 : 0, ease: "easeOut" }}
                    >
                        {storyTitle}
                    </motion.div>
                )}
            </div>

            {/* Footer */}
            <div 
                className={cn(
                    "fixed bottom-0 left-0 right-0 z-[100] h-[60px] transition-all duration-700 flex items-center",
                    "bg-white/95 backdrop-blur-xl shadow-lg border-t border-slate-200/50",
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full pointer-events-none"
                )}
            >
                {/* CTM Logo */}
                <img 
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/8b6a9082b_CTM.png"
                    alt="Content That Moves"
                    className="h-[60px] ml-[60px]"
                />

                {/* Buttons - Right Side */}
                <div className="absolute left-1/2 flex items-center" style={{ gap: '30px' }}>
                    {/* Social Share Buttons */}
                    {isShareable && storyId && (
                        <SocialShareButtons 
                            storyTitle={storyTitle}
                            storyUrl={`${window.location.origin}${createPageUrl('StoryMapView')}?id=${storyId}`}
                        />
                    )}

                    {/* Edit Stories */}
                    <Link
                        to={createPageUrl('Stories')}
                        className="flex items-center gap-2 transition-colors text-sm font-medium text-slate-500 hover:text-black"
                    >
                        <List className="w-5 h-5" />
                        <span>Edit Stories</span>
                    </Link>

                    {/* Auth Button */}
                    {!isLoading && (
                        user ? (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-slate-500" />
                                    <span className="text-sm text-slate-500">{user.email}</span>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 transition-colors text-sm font-medium text-slate-500 hover:text-black"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleLogin}
                                className="flex items-center gap-2 transition-colors text-sm font-medium text-slate-500 hover:text-black"
                            >
                                <LogIn className="w-4 h-4" />
                                Login
                            </button>
                        )
                    )}
                </div>
            </div>
        </>
    );
}