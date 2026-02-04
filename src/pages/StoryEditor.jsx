import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Eye, Loader2, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StoryEditorSidebar from '@/components/editor/StoryEditorSidebar';
import TabbedContentEditor from '@/components/editor/TabbedContentEditor';
import AIAssistant from '@/components/editor/AIAssistant';

export default function StoryEditor() {
    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
    const storyId = urlParams.get('id');

    const [story, setStory] = useState({ title: '', subtitle: '', author: '' });
    const [chapters, setChapters] = useState([]);
    const [slides, setSlides] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedItem, setSelectedItem] = useState({ type: 'story', id: null });
    const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, [storyId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            if (storyId) {
                const [storyData, chaptersData, slidesData] = await Promise.all([
                    base44.entities.Story.filter({ id: storyId }),
                    base44.entities.Chapter.filter({ story_id: storyId }, 'order'),
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
        setIsSaving(true);
        try {
            let savedStoryId = storyId;
            
            if (storyId) {
                await base44.entities.Story.update(storyId, story);
            } else {
                const newStory = await base44.entities.Story.create(story);
                savedStoryId = newStory.id;
                setStory(newStory);
                const newUrl = `${createPageUrl('StoryEditor')}?id=${newStory.id}`;
                window.history.replaceState({}, '', newUrl);
                window.location.href = newUrl;
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
            story_id: storyId,
            order: chapters.length,
            coordinates: [0, 0],
            zoom: 12,
            bearing: 0,
            pitch: 0,
            map_style: 'light',
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

    const updateChapter = (updatedChapter) => {
        setChapters(chapters.map(c => c.id === updatedChapter.id ? updatedChapter : c));
    };

    const updateSlide = (updatedSlide) => {
        setSlides(slides.map(s => s.id === updatedSlide.id ? updatedSlide : s));
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
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to={createPageUrl('Stories')}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                {story.title || 'Untitled Story'}
                            </h1>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-slate-500">
                                    {chapters.length} chapters · {slides.length} slides
                                </span>
                                {story.category && (
                                    <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                                        {story.category}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAIAssistantOpen(true)}
                            className="border-amber-300 text-amber-700 hover:bg-amber-50"
                        >
                            <Sparkles className="w-4 h-4 mr-2" /> AI Assistant
                        </Button>
                        {storyId && (
                            <Link to={`${createPageUrl('StoryMapView')}?id=${storyId}`} target="_blank">
                                <Button variant="outline" size="sm">
                                    <Eye className="w-4 h-4 mr-2" /> Preview
                                </Button>
                            </Link>
                        )}
                        <Button onClick={handleSave} disabled={isSaving} className="bg-amber-600 hover:bg-amber-700">
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Save
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <StoryEditorSidebar
                    story={story}
                    chapters={chapters}
                    slides={slides}
                    selectedItem={selectedItem}
                    onSelectStory={() => setSelectedItem({ type: 'story', id: null })}
                    onSelectChapter={(chapter) => setSelectedItem({ type: 'chapter', id: chapter.id })}
                    onSelectSlide={(slide) => setSelectedItem({ type: 'slide', id: slide.id })}
                />

                {/* Content Editor */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-4xl mx-auto">
                        <TabbedContentEditor
                            itemType={selectedItem.type}
                            item={getCurrentItem()}
                            storyId={storyId}
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
                            story_id: storyId,
                            order: chapters.length + idx,
                            coordinates: chapterData.coordinates || [0, 0],
                            zoom: 12,
                            map_style: 'light',
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
    );
}