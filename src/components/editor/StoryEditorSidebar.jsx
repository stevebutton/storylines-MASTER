import React, { useState } from 'react';
import { ChevronRight, ChevronDown, FileText, MapPin, Image, GripVertical, Map, Languages, Info } from 'lucide-react';
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
        <div className="w-full md:w-[400px] border-r flex flex-col" style={{ background: 'white' }}>
            {/* Story Settings Card */}
            <div className="ml-[50px] mr-[48px] mt-[100px] mb-1 rounded-lg shadow-md overflow-hidden">
                <div className="flex items-stretch">
                    {/* Indigo strip — full height, 2px wider */}
                    <div
                        className="flex items-center justify-center px-[28px] bg-indigo-600 flex-shrink-0 cursor-pointer"
                        onClick={() => onSelectStory('story')}
                    >
                        <img src="https://uevxdwzgkodbkzludrni.supabase.co/storage/v1/object/public/media/43a4c13812d9402098d0daa5-logowhite.png" alt="Storylines" className="w-12 h-12 object-contain" />
                    </div>
                    {/* Right: title + sub-buttons stacked */}
                    <div className="flex-1 bg-white">
                        <div
                            className="px-3 py-1 cursor-pointer hover:brightness-[0.97] transition-all"
                            onClick={() => onSelectStory('story')}
                        >
                            <span className="text-xl font-bold text-slate-900">Story Settings</span>
                        </div>
                        <div className="flex flex-col border-t border-slate-100">
                            <button
                                onClick={(e) => { e.stopPropagation(); onSelectStory('style'); }}
                                className="flex items-center gap-2 px-3 py-1 hover:bg-amber-50 transition-colors border-b border-slate-100"
                                title="Map Style"
                            >
                                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shadow-sm flex-shrink-0">
                                    <Map className="w-3 h-3 text-amber-600" />
                                </div>
                                <span className="text-sm font-medium text-amber-700">Map Style</span>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onSelectStory('language'); }}
                                className="flex items-center gap-2 px-3 py-1 pb-5 hover:bg-blue-50 transition-colors"
                                title="Language"
                            >
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shadow-sm flex-shrink-0">
                                    <Languages className="w-3 h-3 text-blue-600" />
                                </div>
                                <span className="text-sm font-medium text-blue-700">Language</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Separator */}
            <div className="ml-[50px] mr-[48px] my-2 border-t border-slate-300" />

            {/* About card */}
            <div className="ml-[50px] mr-[48px] mb-4 rounded-lg shadow-md overflow-hidden">
                <div className="flex items-stretch">
                    <div
                        className="flex items-center justify-center px-[28px] bg-slate-600 flex-shrink-0 cursor-pointer"
                        onClick={() => onSelectStory('about')}
                    >
                        <Info className="w-6 h-6 text-white" />
                    </div>
                    <div
                        className="flex-1 bg-white px-3 py-3 cursor-pointer hover:brightness-[0.97] transition-all"
                        onClick={() => onSelectStory('about')}
                    >
                        <span className="text-xl font-bold text-slate-900">About</span>
                        <p className="text-xs text-slate-400 mt-0.5">Organisation info &amp; contact</p>
                    </div>
                </div>
            </div>

            {/* Chapters List */}
            <div>
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
                                                                "group flex items-stretch ml-[50px] mr-[48px] rounded-lg mb-5 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 relative",
                                                                snapshot.isDragging && "opacity-50"
                                                            )}
                                                            style={{
                                                                backgroundColor: selected ? `${chapterColor}18` : 'white',
                                                            }}
                                                        >
                                                            {/* Connector line to panel */}
                                                            {selected && !snapshot.isDragging && (
                                                                <div
                                                                    className="absolute bg-white pointer-events-none z-20"
                                                                    style={{ right: -48, top: '50%', transform: 'translateY(-50%)', width: 48, height: 4 }}
                                                                />
                                                            )}
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
                                                                        style={{ background: 'white' }}
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
                                                                                            "relative flex items-center gap-2 px-2 py-2 ml-[50px] mr-[48px] mb-[10px] rounded-lg bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer transition-all",
                                                                                            isSlideSelected(slide.id) && "ring-2 ring-amber-500",
                                                                                            snapshot.isDragging && "opacity-50"
                                                                                        )}
                                                                                    >
                                                                                        {/* Connector line to panel */}
                                                                                        {isSlideSelected(slide.id) && !snapshot.isDragging && (
                                                                                            <div
                                                                                                className="absolute bg-white pointer-events-none z-20"
                                                                                                style={{ right: -48, top: '50%', transform: 'translateY(-50%)', width: 48, height: 4 }}
                                                                                            />
                                                                                        )}
                                                                                        {/* Thumbnail — click → media tab */}
                                                                                        <div
                                                                                            onClick={(e) => { e.stopPropagation(); onSelectSlide(slide, 'media'); }}
                                                                                            className="w-20 h-[60px] rounded overflow-hidden flex-shrink-0 bg-slate-100 hover:ring-2 hover:ring-amber-400 transition-all"
                                                                                        >
                                                                                            {slide.image ? (
                                                                                                <img src={slide.image} alt="" className="w-full h-full object-cover" style={{ objectPosition: slide.image_position || '50% 50%' }} />
                                                                                            ) : slide.video_thumbnail_url ? (
                                                                                                <img src={slide.video_thumbnail_url} alt="" className="w-full h-full object-cover" />
                                                                                            ) : (
                                                                                                <div className="w-full h-full flex items-center justify-center">
                                                                                                    <Image className="w-4 h-4 text-slate-300" />
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                        {/* Grip handle */}
                                                                                        <div
                                                                                            {...provided.dragHandleProps}
                                                                                            onClick={(e) => e.stopPropagation()}
                                                                                            className="cursor-grab active:cursor-grabbing flex-shrink-0"
                                                                                        >
                                                                                            <GripVertical className="w-4 h-4 text-slate-400" />
                                                                                        </div>
                                                                                        {/* Title — click → content tab */}
                                                                                        <div
                                                                                            onClick={(e) => { e.stopPropagation(); onSelectSlide(slide, 'content'); }}
                                                                                            className="flex-1 min-w-0 hover:text-amber-600 transition-colors"
                                                                                        >
                                                                                            <span className="text-sm text-slate-900 font-medium leading-tight block truncate">
                                                                                                {slide.title || `Slide ${slideIndex + 1}`}
                                                                                            </span>
                                                                                        </div>
                                                                                        {/* Location pin — click → location tab */}
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); onSelectSlide(slide, 'location'); }}
                                                                                            className="flex-shrink-0 transition-colors"
                                                                                            title="Location"
                                                                                        >
                                                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${slide.coordinates ? 'bg-amber-100' : 'bg-slate-100'}`}>
                                                                                                <MapPin className={`w-4 h-4 ${slide.coordinates ? 'text-amber-600' : 'text-slate-400'}`} />
                                                                                            </div>
                                                                                        </button>
                                                                                        {/* PDF indicator */}
                                                                                        {slide.pdf_url && (
                                                                                            <button
                                                                                                onClick={(e) => { e.stopPropagation(); onSelectSlide(slide, 'content'); }}
                                                                                                className="flex-shrink-0 transition-colors"
                                                                                                title="PDF attached"
                                                                                            >
                                                                                                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shadow-sm">
                                                                                                    <FileText className="w-4 h-4 text-red-500" />
                                                                                                </div>
                                                                                            </button>
                                                                                        )}
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

        </div>
    );
}