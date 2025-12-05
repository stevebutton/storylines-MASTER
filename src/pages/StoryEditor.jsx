import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Save, Eye, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ChapterEditor from '@/components/editor/ChapterEditor';

export default function StoryEditor() {
    const urlParams = new URLSearchParams(window.location.search);
    const storyId = urlParams.get('id');
    
    // Check for picked location from LocationPickerPage
    const pickedLat = urlParams.get('pickedLat');
    const pickedLng = urlParams.get('pickedLng');
    const pickedName = urlParams.get('pickedName');
    const pickedChapterId = urlParams.get('chapterId');
    const pickedSlideId = urlParams.get('slideId');

    const [story, setStory] = useState({ title: '', subtitle: '', author: '' });
    const [chapters, setChapters] = useState([]);
    const [slides, setSlides] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [pendingLocation, setPendingLocation] = useState(null);

    // Store picked location on mount before data loads
    useEffect(() => {
        if (pickedLat && pickedLng) {
            setPendingLocation({
                lat: parseFloat(pickedLat),
                lng: parseFloat(pickedLng),
                name: pickedName ? decodeURIComponent(pickedName) : null,
                chapterId: pickedChapterId,
                slideId: pickedSlideId
            });
            // Clean URL immediately
            window.history.replaceState({}, '', `${createPageUrl('StoryEditor')}${storyId ? `?id=${storyId}` : ''}`);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [storyId]);

    // Apply pending location after data loads
    useEffect(() => {
        if (!isLoading && pendingLocation) {
            const { lat, lng, name, chapterId, slideId } = pendingLocation;
            
            if (slideId) {
                setSlides(prev => prev.map(s => 
                    s.id === slideId 
                        ? { ...s, coordinates: [lat, lng], location: name ? name.split(',')[0] : s.location }
                        : s
                ));
            } else if (chapterId) {
                setChapters(prev => prev.map(c => 
                    c.id === chapterId 
                        ? { ...c, coordinates: [lat, lng] }
                        : c
                ));
            }
            
            setPendingLocation(null);
        }
    }, [isLoading, pendingLocation]);

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
                // Filter slides for this story's chapters
                const chapterIds = chaptersData.map(c => c.id);
                setSlides(slidesData.filter(s => chapterIds.includes(s.chapter_id)));
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
            
            // Save or create story
            if (storyId) {
                await base44.entities.Story.update(storyId, story);
            } else {
                const newStory = await base44.entities.Story.create(story);
                savedStoryId = newStory.id;
                setStory(newStory);
                // Update URL without reload
                window.history.replaceState({}, '', `${createPageUrl('StoryEditor')}?id=${newStory.id}`);
            }

            // Save chapters
            for (const chapter of chapters) {
                if (chapter.id.startsWith('temp-')) {
                    const { id, ...chapterData } = chapter;
                    const newChapter = await base44.entities.Chapter.create({ 
                        ...chapterData, 
                        story_id: savedStoryId 
                    });
                    // Update slides with new chapter id
                    setSlides(prev => prev.map(s => 
                        s.chapter_id === id ? { ...s, chapter_id: newChapter.id } : s
                    ));
                    setChapters(prev => prev.map(c => 
                        c.id === id ? newChapter : c
                    ));
                } else {
                    await base44.entities.Chapter.update(chapter.id, chapter);
                }
            }

            // Save slides
            for (const slide of slides) {
                if (slide.id.startsWith('temp-')) {
                    const { id, ...slideData } = slide;
                    const newSlide = await base44.entities.Slide.create(slideData);
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
            map_style: 'light',
            alignment: 'left'
        };
        setChapters([...chapters, newChapter]);
    };

    const updateChapter = (updatedChapter) => {
        setChapters(prev => prev.map(c => c.id === updatedChapter.id ? updatedChapter : c));
    };

    const deleteChapter = async (chapterId) => {
        if (!chapterId.startsWith('temp-')) {
            await base44.entities.Chapter.delete(chapterId);
            // Delete associated slides
            const chapterSlides = slides.filter(s => s.chapter_id === chapterId);
            for (const slide of chapterSlides) {
                if (!slide.id.startsWith('temp-')) {
                    await base44.entities.Slide.delete(slide.id);
                }
            }
        }
        setChapters(prev => prev.filter(c => c.id !== chapterId));
        setSlides(prev => prev.filter(s => s.chapter_id !== chapterId));
    };

    const addSlide = (chapterId) => {
        const chapterSlides = slides.filter(s => s.chapter_id === chapterId);
        const newSlide = {
            id: `temp-${Date.now()}`,
            chapter_id: chapterId,
            order: chapterSlides.length,
            title: '',
            description: '',
            location: '',
            image: ''
        };
        setSlides([...slides, newSlide]);
    };

    const updateSlide = (updatedSlide) => {
        setSlides(prev => prev.map(s => s.id === updatedSlide.id ? updatedSlide : s));
    };

    const deleteSlide = async (slideId) => {
        if (!slideId.startsWith('temp-')) {
            await base44.entities.Slide.delete(slideId);
        }
        setSlides(prev => prev.filter(s => s.id !== slideId));
    };

    const reorderSlides = (chapterId, sourceIndex, destIndex) => {
        const chapterSlides = slides.filter(s => s.chapter_id === chapterId);
        const otherSlides = slides.filter(s => s.chapter_id !== chapterId);
        
        const reordered = [...chapterSlides];
        const [removed] = reordered.splice(sourceIndex, 1);
        reordered.splice(destIndex, 0, removed);
        
        const updated = reordered.map((s, i) => ({ ...s, order: i }));
        setSlides([...otherSlides, ...updated]);
    };

    const handleChapterDragEnd = (result) => {
        if (!result.destination) return;
        
        const reordered = [...chapters];
        const [removed] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, removed);
        
        setChapters(reordered.map((c, i) => ({ ...c, order: i })));
    };

    const getSlidesForChapter = (chapterId) => {
        return slides
            .filter(s => s.chapter_id === chapterId)
            .sort((a, b) => a.order - b.order);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to={createPageUrl('Stories')}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <h1 className="text-lg font-semibold text-slate-800">
                            {storyId ? 'Edit Story' : 'New Story'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
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

            {/* Content */}
            <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
                {/* Story Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Story Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Title</Label>
                            <Input 
                                value={story.title || ''} 
                                onChange={(e) => setStory({ ...story, title: e.target.value })}
                                placeholder="A Journey Through Time"
                                className="max-w-md"
                            />
                        </div>
                        <div>
                            <Label>Subtitle</Label>
                            <Textarea 
                                value={story.subtitle || ''} 
                                onChange={(e) => setStory({ ...story, subtitle: e.target.value })}
                                placeholder="Exploring the world's most iconic landmarks..."
                                className="max-w-lg h-20"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Author</Label>
                                <Input 
                                    value={story.author || ''} 
                                    onChange={(e) => setStory({ ...story, author: e.target.value })}
                                    placeholder="Your name"
                                />
                            </div>
                            <div>
                                <Label>Category</Label>
                                <Select 
                                    value={story.category || 'other'} 
                                    onValueChange={(value) => setStory({ ...story, category: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="travel">Travel</SelectItem>
                                        <SelectItem value="history">History</SelectItem>
                                        <SelectItem value="nature">Nature</SelectItem>
                                        <SelectItem value="culture">Culture</SelectItem>
                                        <SelectItem value="adventure">Adventure</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Switch
                                checked={story.is_published || false}
                                onCheckedChange={(checked) => setStory({ ...story, is_published: checked })}
                            />
                            <Label className="cursor-pointer">
                                {story.is_published ? 'Published' : 'Draft'}
                            </Label>
                        </div>
                        </CardContent>
                </Card>

                {/* Chapters */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-800">Chapters</h2>
                        <Button onClick={addChapter} variant="outline">
                            <Plus className="w-4 h-4 mr-2" /> Add Chapter
                        </Button>
                    </div>

                    <DragDropContext onDragEnd={handleChapterDragEnd}>
                        <Droppable droppableId="chapters">
                            {(provided) => (
                                <div 
                                    ref={provided.innerRef} 
                                    {...provided.droppableProps}
                                    className="space-y-4"
                                >
                                    {chapters.map((chapter, index) => (
                                        <Draggable 
                                            key={chapter.id} 
                                            draggableId={chapter.id} 
                                            index={index}
                                        >
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                >
                                                    <ChapterEditor
                                                        chapter={chapter}
                                                        slides={getSlidesForChapter(chapter.id)}
                                                        index={index}
                                                        storyId={storyId}
                                                        onUpdateChapter={updateChapter}
                                                        onDeleteChapter={deleteChapter}
                                                        onAddSlide={addSlide}
                                                        onUpdateSlide={updateSlide}
                                                        onDeleteSlide={deleteSlide}
                                                        onReorderSlides={reorderSlides}
                                                        dragHandleProps={provided.dragHandleProps}
                                                    />
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>

                    {chapters.length === 0 && (
                        <Card className="border-2 border-dashed">
                            <CardContent className="py-12 text-center text-slate-400">
                                <p className="mb-4">No chapters yet. Start building your story!</p>
                                <Button onClick={addChapter} variant="outline">
                                    <Plus className="w-4 h-4 mr-2" /> Add First Chapter
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}