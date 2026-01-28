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
                    {/* Logo - Link to ProjectInterface */}
                    <Link to={createPageUrl('ProjectInterface')} className="absolute left-[65px] top-[40px] z-[120]">
                        <img 
                            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/f1188d1fa_storylines-frame.png" 
                            alt="Storylines" 
                            className="h-auto hover:opacity-80 transition-opacity cursor-pointer"
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