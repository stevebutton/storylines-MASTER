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
                "fixed top-0 left-0 right-0 z-[100] px-4 py-3 transition-all duration-700",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
            )}
        >
            <div className="max-w-7xl mx-auto">
                <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200/50 px-4 py-3">
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