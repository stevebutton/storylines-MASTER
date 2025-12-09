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
                "fixed top-0 left-0 right-0 z-50 px-4 py-3 transition-all duration-700",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
            )}
        >
            <div className="max-w-7xl mx-auto">
                <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200/50 px-4 py-3">
                    {/* Left - Logo and Title */}
                    <div className="flex flex-col min-w-0 flex-shrink">
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
                            <h2 className="text-2xl md:text-4xl font-thin text-slate-800 leading-tight whitespace-nowrap">{storyTitle}</h2>
                        )}
                    </div>


                </div>
            </div>
        </div>
    );
}