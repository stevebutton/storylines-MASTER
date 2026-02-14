import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, LogIn, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

export default function StoryFooter({ onRestart, onViewOtherStories, storyId, isVisible = true }) {
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
        <div className="min-h-screen flex items-center justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent z-10" />
            
            <motion.div 
                className="relative z-20 text-center px-6 max-w-2xl pointer-events-auto"
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
                
                <h2 className="text-3xl md:text-4xl font-light text-white mb-4">
                    The End
                </h2>
                
                <p className="text-white/70 mb-8">
                    Thank you for exploring this story with us.
                </p>
                
                <Button
                    onClick={onRestart}
                    variant="outline"
                    className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:border-white/50 gap-2"
                >
                    <ArrowUp className="w-4 h-4" />
                    Back to Beginning
                </Button>
            </motion.div>

            {/* Footer Bar */}
            <div 
                className={cn(
                    "fixed bottom-0 left-0 right-0 z-[100] h-[60px] transition-all duration-700",
                    "bg-white/95 backdrop-blur-xl shadow-lg border-t border-slate-200/50",
                    "flex items-center justify-between px-[60px]",
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full pointer-events-none"
                )}
            >
                {/* Logo */}
                <img 
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/6d075347b_footer-logo.png"
                    alt="Content That Moves"
                    width="200"
                    height="50"
                    className="hidden md:block"
                />

                {/* More Stories Button */}
                {onViewOtherStories && (
                    <button
                        onClick={onViewOtherStories}
                        className="opacity-30 hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                    >
                        <img 
                            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/250f728a2_MoreStories.png"
                            alt="More Stories"
                            width="50"
                            height="100"
                        />
                    </button>
                )}

                {/* Edit Story Button */}
                {storyId && (
                    <Link
                        to={`${createPageUrl('StoryEditor')}?id=${storyId}`}
                        className="opacity-30 hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                    >
                        <img 
                            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/44e8e4095_EditStory.png"
                            alt="Edit Story"
                            width="50"
                            height="100"
                        />
                    </Link>
                )}

                {/* User Auth */}
                {!isLoading && (
                    user ? (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-slate-500" />
                                <span className="text-sm text-slate-500">{user.email}</span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 transition-colors text-sm font-medium text-slate-500 hover:text-black cursor-pointer"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleLogin}
                            className="flex items-center gap-2 transition-colors text-sm font-medium text-slate-500 hover:text-black cursor-pointer"
                        >
                            <LogIn className="w-4 h-4" />
                            Login
                        </button>
                    )
                )}
            </div>
        </div>
    );
}