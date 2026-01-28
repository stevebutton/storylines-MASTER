import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import { cn } from '@/lib/utils';

export default function StoryMapBanner({ 
    isVisible = true,
    storyTitle = ''
}) {
    return (
        <div 
            className={cn(
                "fixed top-0 left-0 right-0 z-[100] h-[100px] transition-all duration-700",
                "bg-white/95 backdrop-blur-xl shadow-lg border-b border-slate-200/50",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
            )}
        >
            <div className="w-full h-full">
                <div className="w-full h-full px-4 py-3">
                    {/* Logo - Link to StoriesMap */}
                    <Link to={createPageUrl('StoriesMap')} className="absolute top-4 left-4 z-10">
                        <img 
                            src="https://i.ibb.co/wcQgqn0/map-logo.png" 
                            alt="Logo" 
                            className="h-10 w-10 hover:opacity-80 transition-opacity cursor-pointer"
                        />
                    </Link>

                    {/* Story Title */}
                    <div className="flex flex-col min-w-0 flex-shrink">
                        {storyTitle && (
                            <h2 className="text-2xl md:text-4xl font-thin text-slate-800 leading-tight whitespace-nowrap pt-[50px]">{storyTitle}</h2>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}