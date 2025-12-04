import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChapterProgress({ 
    totalChapters, 
    activeIndex, 
    onNavigate 
}) {
    if (totalChapters === 0) return null;

    const canGoPrev = activeIndex > 0;
    const canGoNext = activeIndex < totalChapters - 1;

    return (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-3">
            {/* Previous button */}
            <button
                onClick={() => canGoPrev && onNavigate(activeIndex - 1)}
                disabled={!canGoPrev}
                className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg",
                    canGoPrev 
                        ? "bg-white/95 hover:bg-white text-slate-700 hover:scale-110 cursor-pointer" 
                        : "bg-white/50 text-slate-300 cursor-not-allowed"
                )}
            >
                <ChevronUp className="w-5 h-5" />
            </button>

            {/* Progress dots */}
            <div className="bg-white/95 backdrop-blur-sm rounded-full py-3 px-2 shadow-lg flex flex-col items-center gap-4">
                {Array.from({ length: totalChapters }).map((_, index) => (
                    <button
                        key={index}
                        onClick={() => onNavigate(index)}
                        className={cn(
                            "rounded-full transition-all duration-300",
                            index === activeIndex 
                                ? "w-3 h-3 bg-amber-500" 
                                : "w-2 h-2 bg-slate-300 hover:bg-slate-400"
                        )}
                        title={`Chapter ${index + 1}`}
                    />
                ))}
            </div>

            {/* Next button */}
            <button
                onClick={() => canGoNext && onNavigate(activeIndex + 1)}
                disabled={!canGoNext}
                className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg",
                    canGoNext 
                        ? "bg-white/95 hover:bg-white text-slate-700 hover:scale-110 cursor-pointer" 
                        : "bg-white/50 text-slate-300 cursor-not-allowed"
                )}
            >
                <ChevronDown className="w-5 h-5" />
            </button>
        </div>
    );
}