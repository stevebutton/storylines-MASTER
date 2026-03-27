import React, { useState } from 'react';
import { ChevronRight, ChevronDown, FileText, MapPin, Image, GripVertical, Map, Languages, Info, PlusCircle, Images, ScrollText, Wand2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const CHAPTER_COLORS = ['#d97706','#2563eb','#16a34a','#9333ea','#e11d48','#0d9488'];

const GUIDE_KEY = 'storylines_editor_guide_dismissed';

const GUIDE_STEPS = [
    {
        num: 1,
        color: 'bg-orange-500',
        title: 'Import your content',
        body: 'Have photos from the field or a Storyboarder export? Use Story Helper to build chapters automatically from a ZIP archive.',
    },
    {
        num: 2,
        color: 'bg-amber-500',
        title: 'Add chapters manually',
        body: 'Building from scratch? Add a chapter and fill in slides, locations and media one by one.',
    },
    {
        num: 3,
        color: 'bg-teal-600',
        title: 'Write a script first',
        body: 'Prefer to plan before you build? Draft an outline in the Script panel — it stays alongside your story as you work.',
    },
    {
        num: 4,
        color: 'bg-blue-600',
        title: 'Generate captions',
        body: 'Once your slides have images, use Captions to write AI-powered descriptions shaped by the voice and context you choose.',
    },
];

export default function StoryEditorSidebar({
    story,
    chapters,
    slides,
    selectedItem,
    onSelectStory,
    onSelectChapter,
    onSelectSlide,
    onDragEnd,
    onAddChapter,
    onOpenStoryHelper,
    onOpenScript,
    onOpenCaptions,
    showGuide,
    onGuideClose,
}) {
    const [expandedChapters, setExpandedChapters] = useState([]);
    const [guideLocalDismissed, setGuideLocalDismissed] = useState(
        () => localStorage.getItem(GUIDE_KEY) === 'true'
    );

    const guideVisible = showGuide || !guideLocalDismissed;

    const dismissGuide = () => {
        localStorage.setItem(GUIDE_KEY, 'true');
        setGuideLocalDismissed(true);
        onGuideClose?.();
    };

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
        <div className="w-full md:w-[450px] border-r flex flex-col bg-slate-100">

            {/* ── TOOLS ── */}
            <p className="ml-[50px] mt-6 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Tools</p>
            <div className="ml-[50px] mr-[48px] mb-4 grid grid-cols-2 gap-2">
                <button
                    onClick={onAddChapter}
                    className="bg-amber-500 hover:bg-amber-600 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 transition-colors"
                >
                    <PlusCircle className="w-5 h-5 text-white" />
                    <span className="text-xs text-white font-semibold">Add Chapter</span>
                </button>
                <button
                    onClick={onOpenStoryHelper}
                    className="bg-orange-500 hover:bg-orange-600 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 transition-colors"
                >
                    <Images className="w-5 h-5 text-white" />
                    <span className="text-xs text-white font-semibold">Story Helper</span>
                </button>
                <button
                    onClick={onOpenScript}
                    className="bg-teal-600 hover:bg-teal-700 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 transition-colors"
                >
                    <ScrollText className="w-5 h-5 text-white" />
                    <span className="text-xs text-white font-semibold">Script</span>
                </button>
                <button
                    onClick={onOpenCaptions}
                    className="bg-blue-600 hover:bg-blue-700 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 transition-colors"
                >
                    <Wand2 className="w-5 h-5 text-white" />
                    <span className="text-xs text-white font-semibold">Captions</span>
                </button>
            </div>

            {/* ── PROJECT ── */}
            <p className="ml-[50px] mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Project</p>
            <div className="ml-[50px] mr-[48px] mb-4 rounded-3xl shadow-md overflow-hidden">
                <div className="flex items-stretch">
                    <div
                        className="flex items-center justify-center px-[28px] bg-indigo-600 flex-shrink-0 cursor-pointer"
                        onClick={() => onSelectStory('story')}
                    >
                        <img src="https://uevxdwzgkodbkzludrni.supabase.co/storage/v1/object/public/media/43a4c13812d9402098d0daa5-logowhite.png" alt="Storylines" className="w-12 h-12 object-contain" />
                    </div>
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
                                className="flex items-center gap-2 px-3 py-1 hover:bg-blue-50 transition-colors border-b border-slate-100"
                                title="Language"
                            >
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shadow-sm flex-shrink-0">
                                    <Languages className="w-3 h-3 text-blue-600" />
                                </div>
                                <span className="text-sm font-medium text-blue-700">Language</span>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onSelectStory('about'); }}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors"
                                title="About"
                            >
                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shadow-sm flex-shrink-0">
                                    <Info className="w-3 h-3 text-slate-600" />
                                </div>
                                <span className="text-sm font-medium text-slate-600">About</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── HOW TO GUIDE ── */}
            {guideVisible && (
                <div className="ml-[50px] mr-[48px] mb-4 rounded-2xl bg-white shadow-md overflow-hidden">
                    <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Getting Started</span>
                        <button
                            onClick={dismissGuide}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                            title="Dismiss"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {GUIDE_STEPS.map(step => (
                            <div key={step.num} className="flex items-start gap-3 px-4 py-3">
                                <span className={`${step.color} text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                    {step.num}
                                </span>
                                <div>
                                    <p className="text-xs font-semibold text-slate-700">{step.title}</p>
                                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.body}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── CHAPTERS ── */}
            <p className="ml-[50px] mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Chapters</p>

            {/* Chapters List */}
            <div className="bg-slate-100 flex-1 pb-6">
                {chapters.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center mt-6 px-8">
                        No chapters yet — use the tools above to build your story
                    </p>
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
                                                                "group flex items-stretch ml-[50px] mr-[48px] rounded-3xl mb-5 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 relative",
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
                                                                className="flex items-center gap-0.5 px-4 py-2 flex-shrink-0 rounded-l-3xl"
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
                                                                <span className="text-[18px] font-bold text-slate-900 leading-snug">
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
                                                                        style={{ background: 'transparent' }}
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
                                                                                            "relative flex items-center gap-2 px-2 py-2 ml-[70px] mr-[48px] mb-[10px] rounded-3xl bg-white shadow-md hover:shadow-xl hover:-translate-y-0.5 cursor-pointer transition-all",
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
                                                                                        {/* Grip handle */}
                                                                                        <div
                                                                                            {...provided.dragHandleProps}
                                                                                            onClick={(e) => e.stopPropagation()}
                                                                                            className="cursor-grab active:cursor-grabbing flex-shrink-0"
                                                                                        >
                                                                                            <GripVertical className="w-6 h-6 text-slate-400" />
                                                                                        </div>
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
                                                                                        {/* Title — click → content tab */}
                                                                                        <div
                                                                                            onClick={(e) => { e.stopPropagation(); onSelectSlide(slide, 'content'); }}
                                                                                            className="flex-1 min-w-0 hover:text-amber-600 transition-colors"
                                                                                        >
                                                                                            <span className="text-[18px] text-slate-900 font-medium leading-tight block">
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
                                                                                        {/* Map Pins indicator — click → mappins tab */}
                                                                                        {(slide.map_annotations?.length > 0) && (
                                                                                            <button
                                                                                                onClick={(e) => { e.stopPropagation(); onSelectSlide(slide, 'mappins'); }}
                                                                                                className="flex-shrink-0 transition-colors"
                                                                                                title={`${slide.map_annotations.length} map pin${slide.map_annotations.length !== 1 ? 's' : ''}`}
                                                                                            >
                                                                                                <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm bg-blue-100 relative">
                                                                                                    <Map className="w-4 h-4 text-blue-600" />
                                                                                                    <span style={{ position: 'absolute', top: -3, right: -3, background: '#2563eb', color: 'white', borderRadius: '50%', width: 14, height: 14, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                                                                                                        {slide.map_annotations.length}
                                                                                                    </span>
                                                                                                </div>
                                                                                            </button>
                                                                                        )}
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