import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { List, Plus, Map, Menu, X, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FloatingNavButtons({ 
    isChapterMenuOpen, 
    onToggleChapterMenu,
    hasChapters = false,
    isVisible = true,
    onViewOtherStories
}) {
    return (
        <div 
            className={cn(
                "fixed top-4 left-0 right-0 z-[110] transition-all duration-700 flex items-center justify-between px-6",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
            )}
        >
            {/* Logo on the left */}
            <div className="flex-shrink-0">
                <img 
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/e4051c9fc_ctmlogo-centered.png" 
                    alt="Logo" 
                    className="h-[60px] w-auto"
                />
            </div>

            <div className="flex items-center flex-shrink-0 px-4 py-3" style={{ gap: '30px' }}>
                {/* View Other Stories */}
                {onViewOtherStories && (
                    <button
                        onClick={onViewOtherStories}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors text-sm font-medium"
                    >
                        <Map className="w-5 h-5" />
                        <span>Other Stories</span>
                    </button>
                )}

                {/* Chapters Toggle */}
                {hasChapters && (
                    <button
                        onClick={onToggleChapterMenu}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium",
                            isChapterMenuOpen 
                                ? "bg-amber-100 text-amber-700" 
                                : "hover:bg-slate-100 text-slate-600"
                        )}
                    >
                        {isChapterMenuOpen ? (
                            <X className="w-5 h-5" />
                        ) : (
                            <Menu className="w-5 h-5" />
                        )}
                        <span>Story Chapters</span>
                    </button>
                )}

                {/* My Stories */}
                <Link
                    to={createPageUrl('Stories')}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors text-sm font-medium"
                >
                    <List className="w-5 h-5" />
                    <span>Edit Stories</span>
                </Link>

                {/* Media Library */}
                <Link
                    to={createPageUrl('MediaLibrary')}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors text-sm font-medium"
                >
                    <Image className="w-5 h-5" />
                    <span>Media</span>
                </Link>

                {/* Create Story */}
                <Link
                    to={createPageUrl('StoryEditor')}
                    className="p-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                    title="Create Story"
                >
                    <Plus className="w-5 h-5" />
                </Link>
            </div>
        </div>
    );
}