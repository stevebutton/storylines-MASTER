import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

export default function FloatingNavButtons({ 
    isChapterMenuOpen, 
    onToggleChapterMenu,
    hasChapters = false,
    isVisible = true,
    onViewOtherStories,
    onOpenLibrary,
    storyId
}) {
    return (
        <div 
            className={cn(
                "fixed top-0 left-0 right-0 z-[120] h-[100px] transition-all duration-700 flex items-center justify-center px-6",
                "bg-transparent",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
            )}
        >
            <div className="ml-auto mr-[60px] flex items-center gap-[80px]">
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

                {/* View Other Stories */}
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

                {/* Edit Story */}
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
            </div>
        </div>
    );
}