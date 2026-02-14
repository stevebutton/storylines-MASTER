import React from 'react';
import { cn } from '@/lib/utils';

export default function FloatingNavButtons({ 
    isChapterMenuOpen, 
    onToggleChapterMenu,
    hasChapters = false,
    isVisible = true
}) {
    return (
        <div 
            className={cn(
                "fixed top-0 right-6 z-[100010] h-[100px] transition-all duration-700 flex items-center",
                "bg-transparent",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
            )}
        >
            {/* Chapters Toggle */}
            {hasChapters && (
                <button
                    onClick={onToggleChapterMenu}
                    className="opacity-30 hover:opacity-100 transition-opacity duration-300 cursor-pointer"
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