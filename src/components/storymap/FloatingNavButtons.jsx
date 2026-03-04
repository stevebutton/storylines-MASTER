import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';

export default function FloatingNavButtons({
    isChapterMenuOpen,
    onToggleChapterMenu,
    hasChapters = false,
    isVisible = true,
    storyId = null,
}) {
    return (
        <div
            className={cn(
                "fixed top-0 right-6 z-[100010] h-[100px] transition-all duration-700 flex items-center gap-3",
                "bg-transparent",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
            )}
        >
            {/* Timeline link */}
            {storyId && (
                <Link
                    to={createPageUrl(`StoryTimeline?storyId=${storyId}`)}
                    onClick={() => sessionStorage.setItem(`return_scroll_${storyId}`, String(window.scrollY))}
                    className="opacity-30 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center w-9 h-9 rounded-full bg-black/30 hover:bg-black/50"
                    title="Story Timeline"
                >
                    <Calendar className="w-4 h-4 text-white" />
                </Link>
            )}

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