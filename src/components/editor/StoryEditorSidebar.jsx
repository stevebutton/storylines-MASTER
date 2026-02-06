import React, { useState } from 'react';
import { ChevronRight, ChevronDown, FileText, MapPin, Image, GripVertical, Book } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StoryEditorSidebar({ 
    story, 
    chapters, 
    slides,
    selectedItem,
    onSelectStory,
    onSelectChapter,
    onSelectSlide 
}) {
    const [expandedChapters, setExpandedChapters] = useState(
        chapters.map(c => c.id)
    );

    const toggleChapter = (chapterId) => {
        setExpandedChapters(prev => 
            prev.includes(chapterId)
                ? prev.filter(id => id !== chapterId)
                : [...prev, chapterId]
        );
    };

    const getSlidesForChapter = (chapterId) => {
        return slides
            .filter(s => s.chapter_id === chapterId)
            .sort((a, b) => a.order - b.order);
    };

    const getSlideIndicators = (slide) => {
        const indicators = [];
        if (slide.coordinates && slide.coordinates.length === 2) {
            indicators.push(<MapPin key="map" className="w-3 h-3 text-amber-600" />);
        }
        if (slide.image || slide.video_url) {
            indicators.push(<Image key="img" className="w-3 h-3 text-blue-600" />);
        }
        if (slide.pdf_url) {
            indicators.push(<FileText key="pdf" className="w-3 h-3 text-red-600" />);
        }
        return indicators;
    };

    const isStorySelected = selectedItem?.type === 'story';
    const isChapterSelected = (chapterId) => 
        selectedItem?.type === 'chapter' && selectedItem?.id === chapterId;
    const isSlideSelected = (slideId) => 
        selectedItem?.type === 'slide' && selectedItem?.id === slideId;

    return (
        <div className="w-full md:w-80 border-r bg-white h-screen overflow-y-auto flex flex-col">
            {/* Story Settings Button */}
            <div 
                onClick={onSelectStory}
                className={cn(
                    "p-2 md:p-4 border-b cursor-pointer hover:bg-slate-50 transition-colors",
                    isStorySelected && "bg-amber-50 border-l-4 border-l-amber-600"
                )}
            >
                <div className="flex items-center gap-2">
                    <Book className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />
                    <span className="text-xs md:text-sm font-medium text-slate-700 truncate">Story Settings</span>
                </div>
            </div>

            {/* Chapters List */}
            <div className="flex-1 overflow-y-auto">
                {chapters.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        <p className="text-sm">No chapters yet</p>
                        <p className="text-xs mt-1">Add a chapter to get started</p>
                    </div>
                ) : (
                    <div className="py-2">
                        {chapters.map((chapter, index) => {
                            const chapterSlides = getSlidesForChapter(chapter.id);
                            const isExpanded = expandedChapters.includes(chapter.id);
                            const selected = isChapterSelected(chapter.id);

                            return (
                                <div key={chapter.id}>
                                    {/* Chapter Item */}
                                    <div
                                        className={cn(
                                            "group flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 hover:bg-slate-800 hover:text-white cursor-pointer transition-colors",
                                            selected ? "bg-amber-50 border-l-4 border-l-amber-600" : "bg-slate-900 text-white"
                                        )}
                                    >
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleChapter(chapter.id);
                                            }}
                                            className="p-0.5 hover:bg-slate-700 rounded"
                                        >
                                            {isExpanded ? (
                                                <ChevronDown className={cn("w-4 h-4", selected ? "text-slate-600" : "text-white")} />
                                            ) : (
                                                <ChevronRight className={cn("w-4 h-4", selected ? "text-slate-600" : "text-white")} />
                                            )}
                                        </button>
                                        
                                        <div 
                                            onClick={() => onSelectChapter(chapter)}
                                            className="flex-1 flex items-center gap-1 md:gap-2 min-w-0"
                                        >
                                            <span className={cn("text-[10px] md:text-xs font-medium min-w-[15px] md:min-w-[20px]", selected ? "text-slate-500" : "text-slate-300")}>
                                                {index + 1}
                                            </span>
                                            <span className={cn("text-xs md:text-sm font-medium flex-1 truncate", selected ? "text-slate-700" : "text-white")}>
                                                Chapter {index + 1}
                                            </span>
                                            <div className="flex items-center gap-0.5 md:gap-1">
                                                {chapter.coordinates && (
                                                    <MapPin className={cn("w-2.5 h-2.5 md:w-3 md:h-3", selected ? "text-amber-600" : "text-amber-400")} />
                                                )}
                                                <span className={cn("text-[10px] md:text-xs", selected ? "text-slate-400" : "text-slate-300")}>
                                                    {chapterSlides.length}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Slides List */}
                                    {isExpanded && chapterSlides.length > 0 && (
                                        <div className="bg-slate-50">
                                            {chapterSlides.map((slide, slideIndex) => (
                                                <div
                                                    key={slide.id}
                                                    onClick={() => onSelectSlide(slide)}
                                                    className={cn(
                                                        "flex items-center gap-1 md:gap-2 pl-6 md:pl-12 pr-2 md:pr-4 py-2 hover:bg-slate-100 cursor-pointer transition-colors",
                                                        isSlideSelected(slide.id) && "bg-amber-100 border-l-4 border-l-amber-600"
                                                    )}
                                                >
                                                    <span className="text-[10px] md:text-xs font-medium text-slate-400 min-w-[15px] md:min-w-[20px]">
                                                        {slideIndex + 1}
                                                    </span>
                                                    <span className="text-xs md:text-sm text-slate-600 flex-1 truncate">
                                                        {slide.title || `Slide ${slideIndex + 1}`}
                                                    </span>
                                                    <div className="flex items-center gap-0.5 md:gap-1">
                                                        {getSlideIndicators(slide)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Stats Footer */}
            <div className="border-t p-2 md:p-3 bg-slate-50">
                <div className="grid grid-cols-3 gap-1 md:gap-2 text-center">
                    <div>
                        <div className="text-base md:text-lg font-semibold text-amber-600">{chapters.length}</div>
                        <div className="text-[10px] md:text-xs text-slate-500">Chapters</div>
                    </div>
                    <div>
                        <div className="text-base md:text-lg font-semibold text-blue-600">{slides.length}</div>
                        <div className="text-[10px] md:text-xs text-slate-500">Slides</div>
                    </div>
                    <div>
                        <div className="text-base md:text-lg font-semibold text-green-600">
                            {slides.filter(s => s.image || s.video_url).length}
                        </div>
                        <div className="text-[10px] md:text-xs text-slate-500">Media</div>
                    </div>
                </div>
            </div>
        </div>
    );
}