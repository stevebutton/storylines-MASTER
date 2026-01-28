import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { List, Plus, Map, Menu, X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FloatingNavButtons({ 
    isChapterMenuOpen, 
    onToggleChapterMenu,
    hasChapters = false,
    isVisible = true,
    onViewOtherStories,
    onOpenLibrary
}) {
    return (
        <div 
            className={cn(
                "fixed top-0 left-0 right-0 z-[120] h-[100px] transition-all duration-700 flex items-center justify-between px-6",
                "bg-transparent",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
            )}
        >
            <div className="flex items-center absolute left-1/2" style={{ gap: '30px', marginTop: '53px' }}>
                {/* Chapters Toggle */}
                {hasChapters && (
                    <button
                        onClick={onToggleChapterMenu}
                        className="flex items-center gap-2 transition-colors text-sm font-medium text-slate-500 hover:text-black"
                    >
                        {isChapterMenuOpen ? (
                            <X className="w-5 h-5" />
                        ) : (
                            <Menu className="w-5 h-5" />
                        )}
                        <span>Story Chapters</span>
                    </button>
                )}

                {/* Document Library */}
                {onOpenLibrary && (
                    <button
                        onClick={() => {
                            console.log('FloatingNavButtons: "Library" button clicked');
                            onOpenLibrary();
                        }}
                        className="flex items-center gap-2 transition-colors text-sm font-medium text-slate-500 hover:text-black"
                    >
                        <FileText className="w-5 h-5" />
                        <span>Library</span>
                    </button>
                )}

                {/* View Other Stories */}
                {onViewOtherStories && (
                    <button
                        onClick={onViewOtherStories}
                        className="flex items-center gap-2 transition-colors text-sm font-medium text-slate-500 hover:text-black"
                    >
                        <Map className="w-5 h-5" />
                        <span>Other Stories</span>
                    </button>
                )}
            </div>
        </div>
    );
}