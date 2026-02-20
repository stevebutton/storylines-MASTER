import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Eye, Loader2, Sparkles, HelpCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StoryEditorSidebar from '@/components/editor/StoryEditorSidebar';
import TabbedContentEditor from '@/components/editor/TabbedContentEditor';
import AIAssistant from '@/components/editor/AIAssistant';
import HelpPanel from '@/components/editor/HelpPanel';
import TitleValidationDialog from '@/components/editor/TitleValidationDialog';

export default function StoryEditor() {
    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
    const [currentStoryId, setCurrentStoryId] = useState(urlParams.get('id'));

    const [story, setStory] = useState({ title: '', subtitle: '', author: '' });
    const [chapters, setChapters] = useState([]);
    const [slides, setSlides] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedItem, setSelectedItem] = useState({ type: 'story', id: null });
    const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
    const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false);
    const [showTitleValidationDialog, setShowTitleValidationDialog] = useState(false);
    const [pendingTitle, setPendingTitle] = useState('');

    useEffect(() => {
        loadData();
    }, [currentStoryId]);

    // Restore selected item from URL parameters (after returning from LocationPicker)
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const chapterId = urlParams.get('chapterId');
        const slideId = urlParams.get('slideId');
        
        if (slideId) {
            setSelectedItem({ type: 'slide', id: slideId });
        } else if (chapterId) {
            setSelectedItem({ type: 'chapter', id: chapterId });
        }
    }, [location.search]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            if (currentStoryId) {
                const [storyData, chaptersData, slidesData] = await Promise.all([
                    base44.entities.Story.filter({ id: currentStoryId }),
                    base44.entities.Chapter.filter({ story_id: currentStoryId }, 'order'),
                    base44.entities.Slide.list('order')
                ]);
                
                if (storyData.length > 0) {
                    setStory(storyData[0]);
                }
                setChapters(chaptersData);
                
                const chapterIds = chaptersData.map(c => c.id);
                const filteredSlides = slidesData.filter(s => chapterIds.includes(s.chapter_id));
                setSlides(filteredSlides);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        // Validate title length before saving
        if (story.title && story.title.length > 34) {
            setPendingTitle(story.title);
            setShowTitleValidationDialog(true);
            return;
        }

        setIsSaving(true);
        try {
            let savedStoryId = currentStoryId;
            
            if (currentStoryId) {
                await base44.entities.Story.update(currentStoryId, story);
            } else {
                const newStory = await base44.entities.Story.create(story);
                savedStoryId = newStory.id;
                setStory(newStory);
                setCurrentStoryId(newStory.id);
                urlParams.set('id', newStory.id);
                
                // Verify story is queryable before proceeding
                let retries = 0;
                const maxRetries = 5;
                while (retries < maxRetries) {
                    const verifyStory = await base44.entities.Story.filter({ id: newStory.id });
                    if (verifyStory.length > 0) {
                        break;
                    }
                    await new Promise(resolve => setTimeout(resolve, 200));
                    retries++;
                }
                
                const newUrl = `${createPageUrl('StoryEditor')}?id=${newStory.id}`;
                window.history.replaceState({}, '', newUrl);
            }

            const chapterIdMap = {};
            
            for (const chapter of chapters) {
                if (chapter.id.startsWith('temp-')) {
                    const { id, ...chapterData } = chapter;
                    const newChapter = await base44.entities.Chapter.create({ 
                        ...chapterData, 
                        story_id: savedStoryId 
                    });
                    chapterIdMap[id] = newChapter.id;
                    setChapters(prev => prev.map(c => c.id === id ? newChapter : c));
                } else {
                    await base44.entities.Chapter.update(chapter.id, chapter);
                }
            }

            for (const slide of slides) {
                if (slide.id.startsWith('temp-')) {
                    const { id, ...slideData } = slide;
                    const finalChapterId = chapterIdMap[slide.chapter_id] || slide.chapter_id;
                    const newSlide = await base44.entities.Slide.create({ 
                        ...slideData, 
                        chapter_id: finalChapterId 
                    });
                    setSlides(prev => prev.map(s => s.id === id ? newSlide : s));
                } else {
                    await base44.entities.Slide.update(slide.id, slide);
                }
            }

            await loadData();
        } catch (error) {
            console.error('Failed to save:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const addChapter = () => {
        const newChapter = {
            id: `temp-${Date.now()}`,
            story_id: currentStoryId,
            order: chapters.length,
            alignment: 'left'
        };
        setChapters([...chapters, newChapter]);
        setSelectedItem({ type: 'chapter', id: newChapter.id });
    };

    const addSlide = (chapterId) => {
        const chapterSlides = slides.filter(s => s.chapter_id === chapterId);
        const newSlide = {
            id: `temp-${Date.now()}`,
            chapter_id: chapterId,
            order: chapterSlides.length,
            title: '',
            description: '',
            location: ''
        };
        setSlides([...slides, newSlide]);
        setSelectedItem({ type: 'slide', id: newSlide.id });
    };

    const updateStory = (updatedStory) => {
        setStory(updatedStory);
    };

    const updateChapter = async (updatedChapter) => {
        setChapters(chapters.map(c => c.id === updatedChapter.id ? updatedChapter : c));
        
        // Auto-save if chapter has a real ID (not temp)
        if (!updatedChapter.id.startsWith('temp-')) {
            try {
                await base44.entities.Chapter.update(updatedChapter.id, updatedChapter);
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        }
    };

    const updateSlide = async (updatedSlide) => {
        setSlides(slides.map(s => s.id === updatedSlide.id ? updatedSlide : s));
        
        // Auto-save if slide has a real ID (not temp)
        if (!updatedSlide.id.startsWith('temp-')) {
            try {
                await base44.entities.Slide.update(updatedSlide.id, updatedSlide);
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        }
    };

    const deleteChapter = async (chapterId) => {
        if (!chapterId.startsWith('temp-')) {
            await base44.entities.Chapter.delete(chapterId);
            const chapterSlides = slides.filter(s => s.chapter_id === chapterId);
            for (const slide of chapterSlides) {
                if (!slide.id.startsWith('temp-')) {
                    await base44.entities.Slide.delete(slide.id);
                }
            }
        }
        setChapters(chapters.filter(c => c.id !== chapterId));
        setSlides(slides.filter(s => s.chapter_id !== chapterId));
        setSelectedItem({ type: 'story', id: null });
    };

    const deleteSlide = async (slideId) => {
        if (!slideId.startsWith('temp-')) {
            await base44.entities.Slide.delete(slideId);
        }
        setSlides(slides.filter(s => s.id !== slideId));
        setSelectedItem({ type: 'story', id: null });
    };

    const handleDragEnd = (result) => {
        const { destination, source, type } = result;

        // Dropped outside the list
        if (!destination) return;

        // Dropped in the same position
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        if (type === 'chapter') {
            // Reorder chapters
            const reorderedChapters = Array.from(chapters);
            const [movedChapter] = reorderedChapters.splice(source.index, 1);
            reorderedChapters.splice(destination.index, 0, movedChapter);

            // Update order field for all chapters
            const updatedChapters = reorderedChapters.map((chapter, index) => ({
                ...chapter,
                order: index
            }));

            setChapters(updatedChapters);
        } else if (type === 'slide') {
            // Extract chapter ID from droppableId (format: "slides-{chapterId}")
            const sourceChapterId = source.droppableId.replace('slides-', '');
            const destChapterId = destination.droppableId.replace('slides-', '');

            if (sourceChapterId === destChapterId) {
                // Reordering within the same chapter
                const chapterSlides = slides.filter(s => s.chapter_id === sourceChapterId);
                const otherSlides = slides.filter(s => s.chapter_id !== sourceChapterId);
                
                const reorderedSlides = Array.from(chapterSlides);
                const [movedSlide] = reorderedSlides.splice(source.index, 1);
                reorderedSlides.splice(destination.index, 0, movedSlide);

                // Update order field for slides in this chapter
                const updatedChapterSlides = reorderedSlides.map((slide, index) => ({
                    ...slide,
                    order: index
                }));

                setSlides([...otherSlides, ...updatedChapterSlides]);
            } else {
                // Moving slide to a different chapter
                const sourceSlides = slides.filter(s => s.chapter_id === sourceChapterId);
                const destSlides = slides.filter(s => s.chapter_id === destChapterId);
                const otherSlides = slides.filter(s => s.chapter_id !== sourceChapterId && s.chapter_id !== destChapterId);

                const [movedSlide] = sourceSlides.splice(source.index, 1);
                movedSlide.chapter_id = destChapterId;
                destSlides.splice(destination.index, 0, movedSlide);

                // Update order field for both affected chapters
                const updatedSourceSlides = sourceSlides.map((slide, index) => ({
                    ...slide,
                    order: index
                }));
                const updatedDestSlides = destSlides.map((slide, index) => ({
                    ...slide,
                    order: index
                }));

                setSlides([...otherSlides, ...updatedSourceSlides, ...updatedDestSlides]);
            }
        }
    };

    const getCurrentItem = () => {
        if (selectedItem.type === 'story') return story;
        if (selectedItem.type === 'chapter') return chapters.find(c => c.id === selectedItem.id);
        if (selectedItem.type === 'slide') return slides.find(s => s.id === selectedItem.id);
        return null;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white p-0 md:p-[50px]">
            <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
                <div className="px-4 py-3">
                    <div className="flex items-center gap-4 mb-4">
                        <Link to={createPageUrl('Stories')}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <Link to={createPageUrl('ProjectInterface')}>
                            <img 
                                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/af03c100d_storyline-logo.png" 
                                alt="Storylines" 
                                width="250"
                                height="100"
                                className="hover:opacity-80 transition-opacity cursor-pointer"
                            />
                        </Link>
                        <h1 className="text-2xl md:text-2xl font-bold text-slate-900 flex-1 leading-tight" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>
                            {story.title || 'Untitled Story'}
                        </h1>
                    </div>
                    
                    {/* Unified Menu Bar - Stats and Actions */}
                    <div className="flex flex-wrap md:flex-nowrap items-stretch gap-2 md:gap-4">
                        <div className="flex-1 bg-amber-50 rounded-lg p-2 md:p-4 flex flex-col justify-center min-w-[80px]">
                            <p className="text-xs md:text-sm text-amber-600">Chapters</p>
                            <p className="text-lg md:text-2xl font-bold text-amber-700">{chapters.length}</p>
                        </div>
                        <div className="flex-1 bg-blue-50 rounded-lg p-2 md:p-4 flex flex-col justify-center min-w-[80px]">
                            <p className="text-xs md:text-sm text-blue-600">Slides</p>
                            <p className="text-lg md:text-2xl font-bold text-blue-700">{slides.length}</p>
                        </div>
                        <div className="flex-1 bg-green-50 rounded-lg p-2 md:p-4 flex flex-col justify-center min-w-[80px]">
                            <p className="text-xs md:text-sm text-green-600">Media</p>
                            <p className="text-lg md:text-2xl font-bold text-green-700">
                                {slides.filter(s => s.image || s.video_url || s.pdf_url).length}
                            </p>
                        </div>
                        <button
                            onClick={async () => {
                                const updatedStory = { ...story, is_published: !story.is_published };
                                setStory(updatedStory);
                                if (storyId) {
                                    await base44.entities.Story.update(currentStoryId, { is_published: updatedStory.is_published });
                                }
                            }}
                            className={`flex-1 rounded-lg p-2 md:p-4 cursor-pointer transition-colors flex flex-col justify-center min-w-[80px] ${
                                story.is_published 
                                    ? 'bg-green-50 hover:bg-green-100' 
                                    : 'bg-slate-50 hover:bg-slate-100'
                            }`}
                        >
                            <p className={`text-xs md:text-sm ${story.is_published ? 'text-green-600' : 'text-slate-600'}`}>
                                Status
                            </p>
                            <p className={`text-lg md:text-2xl font-bold ${story.is_published ? 'text-green-700' : 'text-slate-700'}`}>
                                {story.is_published ? 'Published' : 'Draft'}
                            </p>
                        </button>
                        
                        <button
                            onClick={() => setIsHelpPanelOpen(true)}
                            className="hidden md:flex flex-1 bg-slate-50 hover:bg-slate-100 rounded-lg p-2 md:p-4 cursor-pointer transition-colors flex-col items-center justify-center min-w-[80px]"
                        >
                            <HelpCircle className="w-5 h-5 text-slate-600 mb-1" />
                            <p className="text-xs text-slate-600 font-semibold">Help</p>
                        </button>
                        <button
                            onClick={() => setIsAIAssistantOpen(true)}
                            className="hidden md:flex flex-1 bg-purple-50 hover:bg-purple-100 rounded-lg p-2 md:p-4 cursor-pointer transition-colors flex-col items-center justify-center min-w-[80px]"
                        >
                            <Sparkles className="w-5 h-5 text-purple-600 mb-1" />
                            <p className="text-xs text-purple-600 font-semibold">Story Helper</p>
                        </button>
                        {story.id && (
                            <Link to={`${createPageUrl('StoryMapView')}?id=${story.id}`} target="_blank" className="flex-1">
                                <button className="hidden md:flex w-full bg-indigo-50 hover:bg-indigo-100 rounded-lg p-2 md:p-4 cursor-pointer transition-colors flex-col items-center justify-center min-w-[80px]">
                                    <Eye className="w-5 h-5 text-indigo-600 mb-1" />
                                    <p className="text-xs text-indigo-600 font-semibold">Preview</p>
                                </button>
                            </Link>
                        )}
                        <button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg p-2 md:p-4 cursor-pointer transition-colors flex flex-col items-center justify-center min-w-[80px]"
                        >
                            {isSaving ? (
                                <Loader2 className="w-5 h-5 text-white mb-1 animate-spin" />
                            ) : (
                                <Save className="w-5 h-5 text-white mb-1" />
                            )}
                            <p className="text-xs text-white font-semibold">{isSaving ? 'Saving...' : 'Save'}</p>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-[25vw] md:w-auto">
                    <StoryEditorSidebar
                        story={story}
                        chapters={chapters}
                        slides={slides}
                        selectedItem={selectedItem}
                        onSelectStory={() => setSelectedItem({ type: 'story', id: null })}
                        onSelectChapter={(chapter) => setSelectedItem({ type: 'chapter', id: chapter.id })}
                        onSelectSlide={(slide) => setSelectedItem({ type: 'slide', id: slide.id })}
                        onDragEnd={handleDragEnd}
                    />
                </div>

                {/* Content Editor */}
                <div className="w-[75vw] md:flex-1 overflow-y-auto p-3 md:p-6">
                    <div className="max-w-4xl mx-auto">
                        <TabbedContentEditor
                            itemType={selectedItem.type}
                            item={getCurrentItem()}
                            storyId={currentStoryId}
                            onUpdate={
                                selectedItem.type === 'story' ? updateStory :
                                selectedItem.type === 'chapter' ? updateChapter :
                                updateSlide
                            }
                            onDelete={
                                selectedItem.type === 'chapter' ? deleteChapter :
                                selectedItem.type === 'slide' ? deleteSlide :
                                null
                            }
                            onAddChapter={addChapter}
                            onAddSlide={addSlide}
                        />
                    </div>
                </div>
            </div>

            {/* Help Panel */}
            <HelpPanel
                isOpen={isHelpPanelOpen}
                onClose={() => setIsHelpPanelOpen(false)}
            />

            {/* Title Validation Dialog */}
            <TitleValidationDialog
                isOpen={showTitleValidationDialog}
                onClose={() => setShowTitleValidationDialog(false)}
                title={pendingTitle}
                onEdit={() => {
                    setShowTitleValidationDialog(false);
                    setSelectedItem({ type: 'story', id: null });
                }}
            />

            {/* AI Assistant Panel */}
            <AIAssistant
                isOpen={isAIAssistantOpen}
                onClose={() => setIsAIAssistantOpen(false)}
                story={story}
                chapters={chapters}
                slides={slides}
                onApplyOutline={(outline) => {
                    setStory(prev => ({ 
                        ...prev, 
                        title: outline.title || prev.title,
                        subtitle: outline.subtitle || prev.subtitle 
                    }));
                    
                    const newChapters = [];
                    const newSlides = [];
                    const timestamp = Date.now();
                    
                    outline.chapters?.forEach((chapterData, idx) => {
                        const newChapter = {
                            id: `temp-ai-${timestamp}-${idx}`,
                            story_id: currentStoryId,
                            order: chapters.length + idx,
                            alignment: 'left'
                        };
                        newChapters.push(newChapter);
                        
                        chapterData.slides?.forEach((slideData, sIdx) => {
                            const newSlide = {
                                id: `temp-ai-slide-${timestamp}-${idx}-${sIdx}`,
                                chapter_id: newChapter.id,
                                order: sIdx,
                                title: slideData.title,
                                description: slideData.description,
                                location: chapterData.location,
                                image: ''
                            };
                            newSlides.push(newSlide);
                        });
                    });
                    
                    setChapters(prev => [...prev, ...newChapters]);
                    setSlides(prev => [...prev, ...newSlides]);
                    setIsAIAssistantOpen(false);
                }}
                onApplySlideContent={(content, chapterId) => {
                    const chapterSlides = slides.filter(s => s.chapter_id === chapterId);
                    const timestamp = Date.now();
                    const newSlides = [];
                    
                    let updatedSlides = slides.map(s => {
                        const idx = chapterSlides.findIndex(cs => cs.id === s.id);
                        if (idx !== -1 && content.slides?.[idx]) {
                            const slideData = content.slides[idx];
                            return { 
                                ...s, 
                                title: slideData.title, 
                                description: slideData.description, 
                                location: slideData.location || s.location 
                            };
                        }
                        return s;
                    });
                    
                    content.slides?.forEach((slideData, idx) => {
                        if (idx >= chapterSlides.length) {
                            const newSlide = {
                                id: `temp-ai-slide-${timestamp}-${idx}`,
                                chapter_id: chapterId,
                                order: chapterSlides.length + idx,
                                title: slideData.title,
                                description: slideData.description,
                                location: slideData.location || '',
                                image: ''
                            };
                            newSlides.push(newSlide);
                        }
                    });
                    
                    setSlides([...updatedSlides, ...newSlides]);
                    setIsAIAssistantOpen(false);
                }}
            />
        </div>
        </div>
    );
}