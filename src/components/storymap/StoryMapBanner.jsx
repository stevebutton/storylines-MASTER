import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { List, Plus, Map, Menu, X, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StoryMapBanner({ 
    isChapterMenuOpen, 
    onToggleChapterMenu,
    hasChapters = false,
    isVisible = true,
    storyTitle = ''
}) {
    return (
        <div 
            className={cn(
                "fixed top-0 left-0 right-0 z-50 px-4 py-3 transition-all duration-700",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
            )}
        >
            <div className="max-w-7xl mx-auto">
                <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200/50 px-4 py-3 flex items-start justify-between">
                    {/* Left - Logo and Title */}
                    <div className="flex flex-col" style={{ gap: '5px' }}>
                        <Link 
                            to={createPageUrl('StoryMap')} 
                            className="block transition-transform duration-200 hover:scale-105"
                        >
                            <img 
                                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/412e922b9_ctmlogo-centered.png" 
                                alt="content that moves stories"
                                style={{ width: '430px', height: '78px' }}
                            />
                        </Link>
                        {storyTitle && (
                            <h2 className="text-2xl md:text-3xl font-light text-slate-800 leading-tight whitespace-nowrap max-w-3xl">{storyTitle}</h2>
                        )}
                    </div>

                    {/* Right - Navigation Icons */}
                    <div className="flex items-center" style={{ gap: '30px' }}>
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
                            <span>Stories</span>
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
            </div>
        </div>
    );
}