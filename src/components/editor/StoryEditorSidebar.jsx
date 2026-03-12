import React, { useState } from 'react';
import { ChevronRight, ChevronDown, FileText, MapPin, Image, GripVertical, Book } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const CHAPTER_COLORS = ['#d97706','#2563eb','#16a34a','#9333ea','#e11d48','#0d9488'];

export default function StoryEditorSidebar({ 
    story, 
    chapters, 
    slides,
    selectedItem,
    onSelectStory,
    onSelectChapter,
    onSelectSlide,
    onDragEnd
}) {
    const [expandedChapters, setExpandedChapters] = useState([]);

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
            <button
                onClick={onSelectStory}
                className="flex items-stretch mx-2 mt-2 mb-1 rounded-lg transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 w-[calc(100%-16px)]"
            >
                {/* Coloured left strip */}
                <div className="flex items-center justify-center px-[26px] py-2 bg-indigo-600 rounded-l-lg flex-shrink-0">
                    <Book className="w-12 h-12 text-white" />
                </div>
                {/* Text */}
                <div className="flex-1 flex items-center px-3 py-2 bg-white rounded-r-lg">
                    <span className="text-xl font-bold text-slate-900">Story Settings</span>
                </div>
            </button>

            {/* Chapters List */}
            <div className="flex-1 overflow-y-auto">
                {chapters.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        <p className="text-sm">No chapters yet</p>
                        <p className="text-xs mt-1">Add a chapter to get started</p>
                    </div>
                ) : (
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="chapters" type="chapter">
                            {(provided) => (
                                <div 
                                    className="py-2"
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                >
                                    {chapters.map((chapter, index) => {
                                        const chapterSlides = getSlidesForChapter(chapter.id);
                                        const isExpanded = expandedChapters.includes(chapter.id);
                                        const selected = isChapterSelected(chapter.id);
                                        const chapterColor = CHAPTER_COLORS[index % CHAPTER_COLORS.length];

                                        return (
                                            <Draggable
                                                key={chapter.id}
                                                draggableId={`chapter-${chapter.id}`}
                                                index={index}
                                            >
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                    >
                                                        {/* Chapter Item */}
                                                        <div
                                                            className={cn(
                                                                "group flex items-stretch mx-2 rounded-lg mb-5 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5",
                                                                snapshot.isDragging && "opacity-50"
                                                            )}
                                                            style={{
                                                                backgroundColor: selected ? `${chapterColor}18` : 'white',
                                                            }}
                                                        >
                                                            {/* Coloured left strip — grip + chevron */}
                                                            <div
                                                                className="flex items-center gap-0.5 px-4 py-2 flex-shrink-0 rounded-l-lg"
                                                                style={{ backgroundColor: chapterColor }}
                                                            >
                                                                <div
                                                                    {...provided.dragHandleProps}
                                                                    className="cursor-grab active:cursor-grabbing"
                                                                >
                                                                    <GripVertical className="w-6 h-6 text-white/70" />
                                                                </div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleChapter(chapter.id);
                                                                    }}
                                                                    className="flex-shrink-0"
                                                                >
                                                                    {isExpanded ? (
                                                                        <ChevronDown className="w-12 h-12 text-white/80" />
                                                                    ) : (
                                                                        <ChevronRight className="w-12 h-12 text-white/80" />
                                                                    )}
                                                                </button>
                                                            </div>

                                                            {/* Text area */}
                                                            <div
                                                                onClick={() => onSelectChapter(chapter)}
                                                                className="flex-1 flex flex-col min-w-0 px-2 py-2 cursor-pointer"
                                                            >
                                                                <span className="text-xs font-medium text-slate-400 leading-none">
                                                                    Chapter {String(index + 1).padStart(2, '0')}
                                                                </span>
                                                                <span className="text-sm font-bold text-slate-900 leading-snug">
                                                                    {chapter.name || 'Untitled'}
                                                                </span>
                                                            </div>

                                                            {/* Indicators */}
                                                            <div className="flex items-center gap-1 flex-shrink-0 pr-2">
                                                                {chapter.coordinates && (
                                                                    <MapPin className="w-3 h-3" style={{ color: chapterColor }} />
                                                                )}
                                                                <span className="text-xs text-slate-400">
                                                                    {chapterSlides.length}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Slides List */}
                                                        {isExpanded && chapterSlides.length > 0 && (
                                                            <Droppable droppableId={`slides-${chapter.id}`} type="slide">
                                                                {(provided) => (
                                                                    <div 
                                                                        className="bg-slate-50"
                                                                        {...provided.droppableProps}
                                                                        ref={provided.innerRef}
                                                                    >
                                                                        {chapterSlides.map((slide, slideIndex) => (
                                                                            <Draggable
                                                                                key={slide.id}
                                                                                draggableId={`slide-${slide.id}`}
                                                                                index={slideIndex}
                                                                            >
                                                                                {(provided, snapshot) => (
                                                                                    <div
                                                                                        ref={provided.innerRef}
                                                                                        {...provided.draggableProps}
                                                                                        onClick={() => onSelectSlide(slide)}
                                                                                        className={cn(
                                                                                            "flex items-center justify-center gap-1 md:gap-2 pl-2 md:pl-12 pr-2 md:pr-4 py-[18px] mx-2 mb-[10px] rounded-lg bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer transition-all",
                                                                                            isSlideSelected(slide.id) && "bg-red-100 border-l-4 border-l-amber-600",
                                                                                            snapshot.isDragging && "opacity-50"
                                                                                        )}
                                                                                    >
                                                                                        <div 
                                                                                            {...provided.dragHandleProps}
                                                                                            className="cursor-grab active:cursor-grabbing"
                                                                                        >
                                                                                            <GripVertical className="w-5 h-5 text-slate-400" />
                                                                                        </div>
                                                                                        <Image className="w-3 h-3 md:hidden text-slate-400" />
                                                                                        <span className="text-xs md:text-sm text-slate-900 font-medium leading-tight">
                                                                                            <span className="md:hidden">slide {slideIndex + 1}</span>
                                                                                            <span className="hidden md:inline">{slide.title || `Slide ${slideIndex + 1}`}</span>
                                                                                        </span>
                                                                                        <div className="hidden md:flex items-center gap-0.5 md:gap-1 ml-auto">
                                                                                            {getSlideIndicators(slide)}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </Draggable>
                                                                        ))}
                                                                        {provided.placeholder}
                                                                    </div>
                                                                )}
                                                            </Droppable>
                                                        )}
                                                    </div>
                                                )}
                                            </Draggable>
                                        );
                                    })}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
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