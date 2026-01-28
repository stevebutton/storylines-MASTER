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
        </div>
    );
}