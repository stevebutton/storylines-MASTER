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
            <div className="flex items-center flex-shrink-0 px-4 py-3 ml-auto" style={{ gap: '30px', marginTop: '35px' }}>
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

                {/* Document Library */}
                {onOpenLibrary && (
                    <button
                        onClick={() => {
                            console.log('FloatingNavButtons: "Library" button clicked');
                            onOpenLibrary();
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors text-sm font-medium"
                    >
                        <FileText className="w-5 h-5" />
                        <span>Library</span>
                    </button>
                )}

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
            </div>
        </div>
    );
}