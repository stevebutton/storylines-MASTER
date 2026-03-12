import React, { useState, useEffect } from 'react';
import { normalizeCoordinatePair } from '@/components/utils/coordinateUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';

// Generate a Base44-style 24-char hex ID for new records
const generateId = () => crypto.randomUUID().replace(/-/g, '').substring(0, 24);
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Eye, Loader2, Sparkles, HelpCircle, Images } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StoryEditorSidebar from '@/components/editor/StoryEditorSidebar';
import TabbedContentEditor from '@/components/editor/TabbedContentEditor';
import AIAssistant from '@/components/editor/AIAssistant';
import HelpPanel from '@/components/editor/HelpPanel';
import MapDataImportPanel from '@/components/editor/MapDataImportPanel';
import TitleValidationDialog from '@/components/editor/TitleValidationDialog';
import MediaLibraryDialog from '@/components/editor/MediaLibraryDialog';

export default function StoryEditor() {
    const location = useLocation();
    const navigate = useNavigate();
    const urlParams = new URLSearchParams(location.search);
    const [currentStoryId, setCurrentStoryId] = useState(urlParams.get('id'));
    const [isBackTransitioning, setIsBackTransitioning] = useState(false);

    const [story, setStory] = useState({ title: '', subtitle: '', author: '' });
    const [chapters, setChapters] = useState([]);
    const [slides, setSlides] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedItem, setSelectedItem] = useState({ type: 'story', id: null });
    const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
    const [isStoryHelperOpen, setIsStoryHelperOpen] = useState(false);
    const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false);
    const [showTitleValidationDialog, setShowTitleValidationDialog] = useState(false);
    const [pendingTitle, setPendingTitle] = useState('');
    const [isComputingRoutes, setIsComputingRoutes] = useState(false);
    const [routeComputeStatus, setRouteComputeStatus] = useState(null);
    const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, [currentStoryId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            if (currentStoryId) {
                const { data: storyData, error: storyErr } = await supabase
                    .from('stories').select('*').eq('id', currentStoryId).limit(1);
                if (storyErr) throw storyErr;
                if (storyData.length > 0) setStory(storyData[0]);

                const { data: chaptersData, error: chapErr } = await supabase
                    .from('chapters').select('*').eq('story_id', currentStoryId).order('order');
                if (chapErr) throw chapErr;
                setChapters(chaptersData);

                const chapterIds = chaptersData.map(c => c.id);
                const { data: slidesData, error: slideErr } = await supabase
                    .from('slides').select('*').in('chapter_id', chapterIds).order('order');
                if (slideErr) throw slideErr;
                setSlides(slidesData);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        // Validate title length before saving
        if (story.title && story.title.length > 42) {
            setPendingTitle(story.title);
            setShowTitleValidationDialog(true);
            return;
        }

        setIsSaving(true);
        try {
            let savedStoryId = currentStoryId;

            if (currentStoryId) {
                const { id, ...storyData } = story;
                const { error } = await supabase.from('stories').update(storyData).eq('id', currentStoryId);
                if (error) throw error;
            } else {
                const newId = generateId();
                const { data: newStory, error } = await supabase
                    .from('stories').insert({ ...story, id: newId, created_date: new Date().toISOString() }).select().single();
                if (error) throw error;
                savedStoryId = newStory.id;
                setStory(newStory);
                setCurrentStoryId(newStory.id);
                const newUrl = `${createPageUrl('StoryEditor')}?id=${newStory.id}`;
                window.history.replaceState({}, '', newUrl);
            }

            const chapterIdMap = {};

            for (const chapter of chapters) {
                if (chapter.id.startsWith('temp-')) {
                    const { id, ...chapterData } = chapter;
                    const newId = generateId();
                    const { data: newChapter, error } = await supabase
                        .from('chapters').insert({ ...chapterData, id: newId, story_id: savedStoryId }).select().single();
                    if (error) throw error;
                    chapterIdMap[id] = newChapter.id;
                    setChapters(prev => prev.map(c => c.id === id ? newChapter : c));
                } else {
                    const { id, ...chapterData } = chapter;
                    const { error } = await supabase.from('chapters').update(chapterData).eq('id', chapter.id);
                    if (error) throw error;
                }
            }

            for (const slide of slides) {
                if (slide.id.startsWith('temp-')) {
                    const { id, ...slideData } = slide;
                    const newId = generateId();
                    const finalChapterId = chapterIdMap[slide.chapter_id] || slide.chapter_id;
                    const { data: newSlide, error } = await supabase
                        .from('slides').insert({ ...slideData, id: newId, chapter_id: finalChapterId }).select().single();
                    if (error) throw error;
                    setSlides(prev => prev.map(s => s.id === id ? newSlide : s));
                } else {
                    const { id, ...slideData } = slide;
                    const { error } = await supabase.from('slides').update(slideData).eq('id', slide.id);
                    if (error) throw error;
                }
            }

            await loadData();
        } catch (error) {
            console.error('Failed to save:', error);
            alert(`Save failed: ${error?.message || error}`);
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

    const distributeDates = async () => {
        const start = story.project_start_date ? new Date(story.project_start_date) : null;
        const end   = story.project_end_date   ? new Date(story.project_end_date)   : null;
        if (!start || !end || end <= start) return;

        // Build flat ordered slide list: chapters by order, slides within by order
        const orderedChapters = [...chapters].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const orderedSlides = orderedChapters.flatMap(ch =>
            [...slides.filter(s => s.chapter_id === ch.id)]
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        );

        const n = orderedSlides.length;
        if (n === 0) return;

        const totalMs = end.getTime() - start.getTime();
        const updatedSlides = orderedSlides.map((slide, i) => {
            const ms = n === 1 ? 0 : (i / (n - 1)) * totalMs;
            const d = new Date(start.getTime() + ms);
            const dateStr = d.toISOString().split('T')[0];
            return { ...slide, story_date: dateStr };
        });

        // Update state
        setSlides(prev => prev.map(s => {
            const updated = updatedSlides.find(u => u.id === s.id);
            return updated || s;
        }));

        // Persist directly to DB (skip temp slides — they have no DB row yet)
        for (const slide of updatedSlides) {
            if (slide.id.startsWith('temp-')) continue;
            await supabase.from('slides').update({ story_date: slide.story_date }).eq('id', slide.id);
        }
    };

    const updateChapter = (updatedChapter) => {
        setChapters(chapters.map(c => c.id === updatedChapter.id ? updatedChapter : c));
    };

    const updateSlide = (updatedSlide) => {
        setSlides(slides.map(s => s.id === updatedSlide.id ? updatedSlide : s));
    };

    const computeRoutes = async () => {
        const token = import.meta.env.VITE_MAPBOX_API_KEY || 'pk.eyJ1Ijoic3RldmVidXR0b24iLCJhIjoiNEw1T183USJ9.Sv_1qSC23JdXot8YIRPi8A';
        setIsComputingRoutes(true);
        setRouteComputeStatus(null);
        let successCount = 0;

        for (const chapter of chapters) {
            // Skip unsaved chapters — they have no DB record to update
            if (chapter.id.startsWith('temp-')) continue;

            const chapterSlides = slides
                .filter(s => s.chapter_id === chapter.id)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

            const validCoords = chapterSlides
                .map(s => normalizeCoordinatePair(s.coordinates))
                .filter(Boolean);

            if (validCoords.length < 2) continue;

            // Mapbox Directions max 25 waypoints — cap if needed
            const capped = validCoords.length > 25
                ? [validCoords[0], ...validCoords.slice(1, 24), validCoords[validCoords.length - 1]]
                : validCoords;

            const waypoints = capped.map(c => `${c[1]},${c[0]}`).join(';');

            try {
                const resp = await fetch(
                    `https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}` +
                    `?geometries=geojson&overview=simplified&access_token=${token}`
                );
                const data = await resp.json();
                if (data.routes?.[0]?.geometry?.coordinates) {
                    let coords = data.routes[0].geometry.coordinates;
                    // Cap at 300 points to stay well within DB field size limits
                    if (coords.length > 300) {
                        const step = Math.ceil(coords.length / 300);
                        const sampled = coords.filter((_, i) => i % step === 0);
                        if (sampled[sampled.length - 1] !== coords[coords.length - 1]) {
                            sampled.push(coords[coords.length - 1]);
                        }
                        coords = sampled;
                    }
                    // Convert Directions API [lng,lat] → internal [lat,lng]
                    const routeGeometry = coords.map(c => [c[1], c[0]]);
                    console.log(`[route-debug] chapter ${chapter.id}: saving ${routeGeometry.length} pts`);
                    const { error: routeErr } = await supabase.from('chapters').update({ route_geometry: routeGeometry }).eq('id', chapter.id);
                    if (routeErr) throw routeErr;
                    successCount++;
                }
            } catch (e) {
                console.error('[route-debug] chapter update failed:', e);
                // Skip failed chapter (sea crossing, remote area, etc.) — continue
            }
        }

        setIsComputingRoutes(false);
        // Reload from DB so chapterRouteCount reflects what actually persisted
        await loadData();
        setRouteComputeStatus(`${successCount} of ${chapters.filter(c => !c.id.startsWith('temp-')).length} chapter routes computed`);
    };

    const clearRoutes = async () => {
        for (const chapter of chapters) {
            if (chapter.id.startsWith('temp-')) continue;
            await supabase.from('chapters').update({ route_geometry: null }).eq('id', chapter.id);
        }
        await loadData();
        setRouteComputeStatus('Routes cleared');
    };

    const deleteChapter = async (chapterId) => {
        if (!chapterId.startsWith('temp-')) {
            // ON DELETE CASCADE on slides FK means we only need to delete the chapter
            await supabase.from('chapters').delete().eq('id', chapterId);
        }
        setChapters(chapters.filter(c => c.id !== chapterId));
        setSlides(slides.filter(s => s.chapter_id !== chapterId));
        setSelectedItem({ type: 'story', id: null });
    };

    const deleteSlide = async (slideId) => {
        if (!slideId.startsWith('temp-')) {
            await supabase.from('slides').delete().eq('id', slideId);
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
        <motion.div
            className="min-h-screen bg-white p-0 md:p-[50px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
        >
        {/* Back-to-Stories slide panel — sweeps in from the left over the editor */}
        <AnimatePresence>
            {isBackTransitioning && (
                <motion.div
                    className="fixed inset-0 bg-white z-[9999] pointer-events-all"
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    transition={{ duration: 2, ease: 'easeIn' }}
                    onAnimationComplete={() => navigate(createPageUrl('Stories'))}
                />
            )}
        </AnimatePresence>
            <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
                <div className="px-4 py-3">
                    <div className="flex items-center gap-4 mb-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsBackTransitioning(true)}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
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
                                if (currentStoryId) {
                                    await supabase.from('stories').update({ is_published: updatedStory.is_published }).eq('id', currentStoryId);
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
                            onClick={() => setIsMediaLibraryOpen(true)}
                            className="hidden md:flex flex-1 bg-amber-50 hover:bg-amber-100 rounded-lg p-2 md:p-4 cursor-pointer transition-colors flex-col items-center justify-center min-w-[80px]"
                        >
                            <Images className="w-5 h-5 text-amber-600 mb-1" />
                            <p className="text-xs text-amber-600 font-semibold">Media</p>
                        </button>
                        <button
                            onClick={() => setIsHelpPanelOpen(true)}
                            className="hidden md:flex flex-1 bg-slate-50 hover:bg-slate-100 rounded-lg p-2 md:p-4 cursor-pointer transition-colors flex-col items-center justify-center min-w-[80px]"
                        >
                            <HelpCircle className="w-5 h-5 text-slate-600 mb-1" />
                            <p className="text-xs text-slate-600 font-semibold">Help</p>
                        </button>
                        <button
                            onClick={() => setIsStoryHelperOpen(true)}
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
                            onComputeRoutes={computeRoutes}
                            onClearRoutes={clearRoutes}
                            onDistributeDates={distributeDates}
                            isComputingRoutes={isComputingRoutes}
                            routeComputeStatus={routeComputeStatus}
                            chapterRouteCount={chapters.filter(c => c.route_geometry?.length).length}
                            totalChapterCount={chapters.length}
                            storyMapStyle={story.map_style || 'a'}
                        />
                    </div>
                </div>
            </div>

            {/* Media Library Dialog */}
            <MediaLibraryDialog
                storyId={story?.id}
                isOpen={isMediaLibraryOpen}
                onClose={() => setIsMediaLibraryOpen(false)}
                mode="manager"
            />

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

            {/* Story Helper — append chapters via ZIP upload */}
            <MapDataImportPanel
                isOpen={isStoryHelperOpen}
                onClose={() => { setIsStoryHelperOpen(false); loadData(); }}
                appendToStoryId={currentStoryId}
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
        </motion.div>
    );
}