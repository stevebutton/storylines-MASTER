import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Save, Eye, Loader2, Undo2, Redo2, AlertCircle, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ChapterEditor from '@/components/editor/ChapterEditor';
import AIAssistant from '@/components/editor/AIAssistant';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function StoryEditor() {
    const urlParams = new URLSearchParams(window.location.search);
    const storyId = urlParams.get('id');
    
    // Check for picked location from LocationPickerPage
    const pickedLat = urlParams.get('pickedLat');
    const pickedLng = urlParams.get('pickedLng');
    const pickedZoom = urlParams.get('pickedZoom');
    const pickedBearing = urlParams.get('pickedBearing');
    const pickedPitch = urlParams.get('pickedPitch');
    const pickedName = urlParams.get('pickedName');
    const pickedChapterId = urlParams.get('chapterId');
    const pickedSlideId = urlParams.get('slideId');

    const [story, setStory] = useState({ title: '', subtitle: '', author: '' });
    const [chapters, setChapters] = useState([]);
    const [slides, setSlides] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [pendingLocation, setPendingLocation] = useState(null);
    const [storyErrors, setStoryErrors] = useState({});
    const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
    const [isUploadingHeroImage, setIsUploadingHeroImage] = useState(false);
    const [isUploadingHeroVideo, setIsUploadingHeroVideo] = useState(false);
    
    // Undo/Redo state
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const maxHistory = 50;

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    const saveToHistory = useCallback((newChapters, newSlides) => {
        const snapshot = { chapters: newChapters, slides: newSlides };
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push(snapshot);
            if (newHistory.length > maxHistory) newHistory.shift();
            return newHistory;
        });
        setHistoryIndex(prev => Math.min(prev + 1, maxHistory - 1));
    }, [historyIndex, maxHistory]);

    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            const prevState = history[historyIndex - 1];
            setChapters(prevState.chapters);
            setSlides(prevState.slides);
            setHistoryIndex(prev => prev - 1);
        }
    }, [historyIndex, history]);

    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            setChapters(nextState.chapters);
            setSlides(nextState.slides);
            setHistoryIndex(prev => prev + 1);
        }
    }, [historyIndex, history]);

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    handleRedo();
                } else {
                    handleUndo();
                }
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
                e.preventDefault();
                handleRedo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo]);

    const validateStoryField = (field, value) => {
        switch (field) {
            case 'title':
                if (!value || value.trim().length === 0) return 'Title is required';
                if (value.length > 100) return 'Title must be under 100 characters';
                return null;
            case 'subtitle':
                if (value && value.length > 300) return 'Subtitle must be under 300 characters';
                return null;
            case 'author':
                if (value && value.length > 50) return 'Author name must be under 50 characters';
                return null;
            default:
                return null;
        }
    };

    // Store picked location on mount before data loads
    useEffect(() => {
        if (pickedLat && pickedLng) {
            setPendingLocation({
                lat: parseFloat(pickedLat),
                lng: parseFloat(pickedLng),
                zoom: pickedZoom ? parseFloat(pickedZoom) : null,
                bearing: pickedBearing ? parseFloat(pickedBearing) : null,
                pitch: pickedPitch ? parseFloat(pickedPitch) : null,
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

    // Apply pending location after data loads and auto-save
    useEffect(() => {
        if (!isLoading && pendingLocation) {
            const { lat, lng, zoom, bearing, pitch, name, chapterId, slideId } = pendingLocation;
            
            const saveLocationUpdate = async () => {
                if (slideId && !slideId.startsWith('temp-')) {
                    // Update slide in database
                    const slideToUpdate = slides.find(s => s.id === slideId);
                    if (slideToUpdate) {
                        const updatedSlide = { 
                            ...slideToUpdate, 
                            coordinates: [lat, lng],
                            zoom: zoom ?? slideToUpdate.zoom,
                            bearing: bearing ?? slideToUpdate.bearing,
                            pitch: pitch ?? slideToUpdate.pitch,
                            location: name ? name.split(',')[0] : slideToUpdate.location 
                        };
                        await base44.entities.Slide.update(slideId, updatedSlide);
                        setSlides(prev => prev.map(s => s.id === slideId ? updatedSlide : s));
                    }
                } else if (slideId) {
                    // Just update local state for temp slides
                    setSlides(prev => prev.map(s => 
                        s.id === slideId 
                            ? { 
                                ...s, 
                                coordinates: [lat, lng], 
                                zoom: zoom ?? s.zoom,
                                bearing: bearing ?? s.bearing,
                                pitch: pitch ?? s.pitch,
                                location: name ? name.split(',')[0] : s.location 
                              }
                            : s
                    ));
                }
                
                if (chapterId && !slideId) {
                    if (!chapterId.startsWith('temp-')) {
                        // Update chapter in database
                        const chapterToUpdate = chapters.find(c => c.id === chapterId);
                        if (chapterToUpdate) {
                            const updatedChapter = { 
                                ...chapterToUpdate, 
                                coordinates: [lat, lng],
                                zoom: zoom ?? chapterToUpdate.zoom,
                            };
                            await base44.entities.Chapter.update(chapterId, updatedChapter);
                            setChapters(prev => prev.map(c => c.id === chapterId ? updatedChapter : c));
                        }
                    } else {
                        // Just update local state for temp chapters
                        setChapters(prev => prev.map(c => 
                            c.id === chapterId 
                                ? { ...c, coordinates: [lat, lng], zoom: zoom ?? c.zoom }
                                : c
                        ));
                    }
                }
            };
            
            saveLocationUpdate();
            setPendingLocation(null);
        }
    }, [isLoading, pendingLocation, slides, chapters]);

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
                const filteredSlides = slidesData.filter(s => chapterIds.includes(s.chapter_id));
                setSlides(filteredSlides);
                // Initialize history
                setHistory([{ chapters: chaptersData, slides: filteredSlides }]);
                setHistoryIndex(0);
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

            // Track chapter ID mappings for updating slides
            const chapterIdMap = {};
            
            // Save chapters and build ID mapping
            for (const chapter of chapters) {
                if (chapter.id.startsWith('temp-')) {
                    const { id, ...chapterData } = chapter;
                    const newChapter = await base44.entities.Chapter.create({ 
                        ...chapterData, 
                        story_id: currentStoryId 
                    });
                    chapterIdMap[id] = newChapter.id;
                    setChapters(prev => prev.map(c => 
                        c.id === id ? newChapter : c
                    ));
                } else {
                    await base44.entities.Chapter.update(chapter.id, chapter);
                }
            }

            // Save slides using updated chapter IDs
            for (const slide of slides) {
                if (slide.id.startsWith('temp-')) {
                    const { id, ...slideData } = slide;
                    // Use mapped chapter ID if this slide belongs to a newly created chapter
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
            map_style: 'light',
            alignment: 'left'
        };
        const newChapters = [...chapters, newChapter];
        setChapters(newChapters);
        saveToHistory(newChapters, slides);
    };

    const updateChapter = (updatedChapter) => {
        const newChapters = chapters.map(c => c.id === updatedChapter.id ? updatedChapter : c);
        setChapters(newChapters);
        saveToHistory(newChapters, slides);
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
        const newChapters = chapters.filter(c => c.id !== chapterId);
        const newSlides = slides.filter(s => s.chapter_id !== chapterId);
        setChapters(newChapters);
        setSlides(newSlides);
        saveToHistory(newChapters, newSlides);
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
        const newSlides = [...slides, newSlide];
        setSlides(newSlides);
        saveToHistory(chapters, newSlides);
    };

    const updateSlide = (updatedSlide) => {
        const newSlides = slides.map(s => s.id === updatedSlide.id ? updatedSlide : s);
        setSlides(newSlides);
        saveToHistory(chapters, newSlides);
    };

    const deleteSlide = async (slideId) => {
        if (!slideId.startsWith('temp-')) {
            await base44.entities.Slide.delete(slideId);
        }
        const newSlides = slides.filter(s => s.id !== slideId);
        setSlides(newSlides);
        saveToHistory(chapters, newSlides);
    };

    const reorderSlides = (chapterId, sourceIndex, destIndex) => {
        const chapterSlides = slides.filter(s => s.chapter_id === chapterId);
        const otherSlides = slides.filter(s => s.chapter_id !== chapterId);
        
        const reordered = [...chapterSlides];
        const [removed] = reordered.splice(sourceIndex, 1);
        reordered.splice(destIndex, 0, removed);
        
        const updated = reordered.map((s, i) => ({ ...s, order: i }));
        const newSlides = [...otherSlides, ...updated];
        setSlides(newSlides);
        saveToHistory(chapters, newSlides);
    };

    const handleChapterDragEnd = (result) => {
        if (!result.destination) return;
        
        const reordered = [...chapters];
        const [removed] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, removed);
        
        const newChapters = reordered.map((c, i) => ({ ...c, order: i }));
        setChapters(newChapters);
        saveToHistory(newChapters, slides);
    };

    const getSlidesForChapter = (chapterId) => {
        return slides
            .filter(s => s.chapter_id === chapterId)
            .sort((a, b) => a.order - b.order);
    };

    const handleHeroImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingHeroImage(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            setStory({ ...story, hero_image: file_url, hero_type: 'image' });
        } catch (error) {
            console.error('Failed to upload hero image:', error);
        } finally {
            setIsUploadingHeroImage(false);
        }
    };

    const handleHeroVideoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingHeroVideo(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            setStory({ ...story, hero_video: file_url, hero_type: 'video' });
        } catch (error) {
            console.error('Failed to upload hero video:', error);
        } finally {
            setIsUploadingHeroVideo(false);
        }
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
                        <TooltipProvider>
                            <div className="flex items-center gap-1 mr-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={handleUndo} 
                                            disabled={!canUndo}
                                            className="h-8 w-8"
                                        >
                                            <Undo2 className="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={handleRedo} 
                                            disabled={!canRedo}
                                            className="h-8 w-8"
                                        >
                                            <Redo2 className="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
                                </Tooltip>
                            </div>
                        </TooltipProvider>
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

            {/* Content */}
            <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
                {/* Story Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Story Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Title <span className="text-red-500">*</span></Label>
                            <Input 
                                value={story.title || ''} 
                                onChange={(e) => {
                                    const error = validateStoryField('title', e.target.value);
                                    setStoryErrors(prev => ({ ...prev, title: error }));
                                    setStory({ ...story, title: e.target.value });
                                }}
                                placeholder="A Journey Through Time"
                                className={`max-w-md ${storyErrors.title ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                            />
                            {storyErrors.title && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {storyErrors.title}
                                </p>
                            )}
                        </div>
                        <div>
                            <Label>Subtitle</Label>
                            <Textarea 
                                value={story.subtitle || ''} 
                                onChange={(e) => {
                                    const error = validateStoryField('subtitle', e.target.value);
                                    setStoryErrors(prev => ({ ...prev, subtitle: error }));
                                    setStory({ ...story, subtitle: e.target.value });
                                }}
                                placeholder="Exploring the world's most iconic landmarks..."
                                className={`max-w-lg h-20 ${storyErrors.subtitle ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                            />
                            {storyErrors.subtitle && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {storyErrors.subtitle}
                                </p>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Author</Label>
                                <Input 
                                    value={story.author || ''} 
                                    onChange={(e) => {
                                        const error = validateStoryField('author', e.target.value);
                                        setStoryErrors(prev => ({ ...prev, author: error }));
                                        setStory({ ...story, author: e.target.value });
                                    }}
                                    placeholder="Your name"
                                    className={storyErrors.author ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                />
                                {storyErrors.author && (
                                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> {storyErrors.author}
                                    </p>
                                )}
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
                        <div>
                            <Label>Hero Media</Label>
                            <div className="mt-2 space-y-3">
                                {/* Preview */}
                                {story.hero_type === 'video' && story.hero_video && (
                                    <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                                        <video 
                                            src={story.hero_video} 
                                            className="w-full h-full object-cover"
                                            autoPlay
                                            muted
                                            loop
                                            playsInline
                                        />
                                        <button
                                            onClick={() => setStory({ ...story, hero_video: '', hero_type: 'image' })}
                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                {story.hero_type === 'image' && story.hero_image && (
                                    <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                                        <img 
                                            src={story.hero_image} 
                                            alt="Hero" 
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            onClick={() => setStory({ ...story, hero_image: '', hero_type: 'image' })}
                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                
                                {/* Upload Buttons */}
                                <div className="flex gap-2">
                                    <div>
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png"
                                            onChange={handleHeroImageUpload}
                                            className="hidden"
                                            id="hero-image-upload"
                                            disabled={isUploadingHeroImage}
                                        />
                                        <label htmlFor="hero-image-upload">
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                disabled={isUploadingHeroImage || isUploadingHeroVideo}
                                                onClick={() => document.getElementById('hero-image-upload').click()}
                                            >
                                                {isUploadingHeroImage ? (
                                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                                                ) : (
                                                    <><Plus className="w-4 h-4 mr-2" /> Upload Image</>
                                                )}
                                            </Button>
                                        </label>
                                    </div>
                                    <div>
                                        <input
                                            type="file"
                                            accept="video/mp4,video/webm,video/quicktime"
                                            onChange={handleHeroVideoUpload}
                                            className="hidden"
                                            id="hero-video-upload"
                                            disabled={isUploadingHeroVideo}
                                        />
                                        <label htmlFor="hero-video-upload">
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                disabled={isUploadingHeroVideo || isUploadingHeroImage}
                                                onClick={() => document.getElementById('hero-video-upload').click()}
                                            >
                                                {isUploadingHeroVideo ? (
                                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                                                ) : (
                                                    <><Plus className="w-4 h-4 mr-2" /> Upload Video</>
                                                )}
                                            </Button>
                                        </label>
                                    </div>
                                </div>
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
                                    className="space-y-4 max-h-[75vh] overflow-y-auto pr-2"
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
                    saveToHistory([...chapters, ...newChapters], [...slides, ...newSlides]);
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
                    
                    const finalSlides = [...updatedSlides, ...newSlides];
                    setSlides(finalSlides);
                    saveToHistory(chapters, finalSlides);
                    setIsAIAssistantOpen(false);
                }}
            />
        </div>
    );
}