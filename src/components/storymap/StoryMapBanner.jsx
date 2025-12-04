import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { List, Plus, Map, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StoryMapBanner({ 
    isChapterMenuOpen, 
    onToggleChapterMenu,
    hasChapters = false 
}) {
    return (
        <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200/50 px-4 py-3 flex items-center justify-between">
                    {/* Left - Logo */}
                    <div className="flex items-center gap-3">
                        <Link to={createPageUrl('Stories')} className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                                <Map className="w-4 h-4 text-white" />
                            </div>
                        </Link>
                    </div>

                    {/* Center - Title */}
                    <div className="absolute left-1/2 -translate-x-1/2">
                        <h1 className="text-slate-800 text-2xl md:text-3xl font-thin tracking-wide">
                            mapflow
                        </h1>
                    </div>

                    {/* Right - Navigation Icons */}
                    <div className="flex items-center gap-2">
                        {/* Chapters Toggle */}
                        {hasChapters && (
                            <button
                                onClick={onToggleChapterMenu}
                                className={cn(
                                    "p-2 rounded-lg transition-colors",
                                    isChapterMenuOpen 
                                        ? "bg-amber-100 text-amber-700" 
                                        : "hover:bg-slate-100 text-slate-600"
                                )}
                                title="Chapters"
                            >
                                {isChapterMenuOpen ? (
                                    <X className="w-5 h-5" />
                                ) : (
                                    <Menu className="w-5 h-5" />
                                )}
                            </button>
                        )}

                        {/* My Stories */}
                        <Link
                            to={createPageUrl('Stories')}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                            title="My Stories"
                        >
                            <List className="w-5 h-5" />
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
            </div>
        </div>
    );
}