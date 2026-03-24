import React, { useState } from 'react';
import LanguageSettingsTab from '@/components/editor/LanguageSettingsTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, X, MapPin, FileText, Video, Image as ImageIcon, Trash2, Check, Images, Wand2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import * as exifr from 'exifr';

const generateId = () => crypto.randomUUID().replace(/-/g, '').substring(0, 24);
import EmbeddedLocationPicker from '@/components/editor/EmbeddedLocationPicker';
import CesiumLocationPicker from '@/components/editor/CesiumLocationPicker';
import DocumentPicker from '@/components/editor/DocumentPicker';
import MediaLibraryDialog from '@/components/editor/MediaLibraryDialog';
import ImageCropHotspotPicker from '@/components/editor/ImageCropHotspotPicker';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_API_KEY || 'pk.eyJ1Ijoic3RldmVidXR0b24iLCJhIjoiNEw1T183USJ9.Sv_1qSC23JdXot8YIRPi8A';

const MAP_STYLES_CONFIG = {
    a: {
        label: 'Style A',
        description: 'Light cartographic — white banner, amber accents',
        owner: 'stevebutton',
        id: 'clummsfw1002701mpbiw3exg7',
    },
    b: {
        label: 'Style B',
        description: 'Mid-tone cartographic',
        owner: 'stevebutton',
        id: 'cktf8ygms085117nnzm4a97d0',
    },
    c: {
        label: 'Style C',
        description: 'Dark cartographic — Righteous type, strong route contrast',
        owner: 'stevebutton',
        id: 'ckn1s2y342eq018tidycnavti',
    },
    d: {
        label: 'Style D',
        description: 'Mapbox Standard — dynamic lighting, 3D buildings',
        owner: 'stevebutton',
        id: 'cmm9edvor004m01sc0wyug8vz',
    },
    e: {
        label: 'Style E',
        description: 'Custom style',
        owner: 'stevebutton',
        id: 'cmmanazrf000f01qvaghi0jhv',
    },
    f: {
        label: 'Plouer',
        description: 'Plouer cartographic — Oswald type',
        owner: 'stevebutton',
        id: 'cmmd2lwzp001m01s24puoahpd',
    },
    g: {
        label: 'Sauri',
        description: 'Sauri',
        owner: 'stevebutton',
        id: 'cmmd3clf0001o01s2biib8ju2',
    },
    h: {
        label: 'SB4A',
        description: 'SB4A',
        owner: 'stevebutton',
        id: 'ck9i8wv640t4c1iqeiphu3soc',
    },
    i: {
        label: 'PASSMAR',
        description: 'PASSMAR',
        owner: 'stevebutton',
        id: 'cllw84jo600f401r7afyy7ef4',
    },
    j: {
        label: 'Cartogram',
        description: 'Cartogram',
        owner: 'stevebutton',
        id: 'cmmg2352g002q01s82q1d6zzo',
    },
    k: {
        label: 'PASSMAR REWORK',
        description: 'PASSMAR Rework',
        owner: 'stevebutton',
        id: 'cmmmcnbw5009z01sb3xf72ldy',
    },
    l: {
        label: 'World',
        description: 'World overview style',
        owner: 'stevebutton',
        id: 'cmmuqyi1p00a501s955v9393b',
    },
    'photorealistic-3d': {
        label: 'Photorealistic 3D',
        description: 'Google Photorealistic 3D Tiles — immersive aerial view powered by Cesium',
        cesium: true,
    },
};

export default function TabbedContentEditor({
    itemType,
    item,
    storyId,
    onUpdate,
    onDelete,
    onAddChapter,
    onAddSlide,
    onComputeRoutes,
    onClearRoutes,
    onDistributeDates,
    isComputingRoutes,
    routeComputeStatus,
    chapterRouteCount,
    totalChapterCount,
    storyMapStyle,
    defaultTab,
    onGenerateCaptions = null,
}) {
    const [activeTab, setActiveTab] = useState(defaultTab || 'content');

    // Sync activeTab when sidebar deep-links to a specific tab,
    // or reset to a sensible default when the item type changes.
    React.useEffect(() => {
        if (defaultTab) {
            setActiveTab(defaultTab);
        } else if (itemType === 'story') {
            setActiveTab('story');
        } else {
            setActiveTab('content');
        }
    }, [defaultTab, itemType]);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const [isUploadingHeroImage, setIsUploadingHeroImage] = useState(false);
    const [isUploadingHeroVideo, setIsUploadingHeroVideo] = useState(false);
    const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
    const [showDocumentPicker, setShowDocumentPicker] = useState(false);
    const [isUploadingChapterImage, setIsUploadingChapterImage] = useState(false);
    const [isUploadingChapterVideo, setIsUploadingChapterVideo] = useState(false);
    const [mediaPickerTarget, setMediaPickerTarget] = useState(null);
    const [isFillingCoords, setIsFillingCoords] = useState(false);

    // ── Pill helpers ────────────────────────────────────────────────────────
    const PanelTitle = ({ children }) => (
        <div className="mb-4 pl-[50px]">
            <span className="inline-flex items-center px-5 py-2 rounded-full bg-white shadow-md text-xl font-bold text-slate-800 tracking-tight">
                {children}
            </span>
        </div>
    );
    const FieldLabel = ({ children }) => (
        <span className="inline-flex items-center px-8 py-[9px] rounded-full bg-slate-700 shadow-sm text-sm font-semibold text-white uppercase tracking-wide mb-2 block w-fit">
            {children}
        </span>
    );
    // ────────────────────────────────────────────────────────────────────────

    // Handle missing item
    if (!item) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <p className="text-slate-500 text-center">Loading...</p>
                </CardContent>
            </Card>
        );
    }

    // Story Editor
    if (itemType === 'story') {
        const saveToMediaLibrary = async (file_url, file) => {
            if (!storyId) return;
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            await supabase.from('media').insert({
                id: generateId(),
                story_id: storyId,
                url: file_url,
                filename: safeName,
                title: file.name.split('.')[0],
                category: 'other',
                tags: [],
                type: file.type.startsWith('image') ? 'image' : 'video',
                file_size: file.size,
                created_date: new Date().toISOString(),
            });
        };

        const handleHeroImageUpload = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setIsUploadingHeroImage(true);
            try {
                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const filePath = `${generateId()}-${safeName}`;
                const { error: uploadError } = await supabase.storage
                    .from('media')
                    .upload(filePath, file, { contentType: file.type, upsert: false });
                if (uploadError) throw uploadError;
                const { data: { publicUrl: file_url } } = supabase.storage.from('media').getPublicUrl(filePath);
                await saveToMediaLibrary(file_url, file);
                onUpdate({ ...item, hero_image: file_url, hero_type: 'image' });
            } finally {
                setIsUploadingHeroImage(false);
            }
        };

        const handleHeroVideoUpload = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setIsUploadingHeroVideo(true);
            try {
                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const filePath = `${generateId()}-${safeName}`;
                const { error: uploadError } = await supabase.storage
                    .from('media')
                    .upload(filePath, file, { contentType: file.type, upsert: false });
                if (uploadError) throw uploadError;
                const { data: { publicUrl: file_url } } = supabase.storage.from('media').getPublicUrl(filePath);
                await saveToMediaLibrary(file_url, file);
                onUpdate({ ...item, hero_video: file_url, hero_type: 'video' });
            } finally {
                setIsUploadingHeroVideo(false);
            }
        };

        const handleThumbnailUpload = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setIsUploadingThumbnail(true);
            try {
                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const filePath = `${generateId()}-${safeName}`;
                const { error: uploadError } = await supabase.storage
                    .from('media')
                    .upload(filePath, file, { contentType: file.type, upsert: false });
                if (uploadError) throw uploadError;
                const { data: { publicUrl: file_url } } = supabase.storage.from('media').getPublicUrl(filePath);
                await saveToMediaLibrary(file_url, file);
                onUpdate({ ...item, thumbnail: file_url });
            } finally {
                setIsUploadingThumbnail(false);
            }
        };

        const handleFillMissingCoordinates = async () => {
            const coords = item?.coordinates;
            if (!Array.isArray(coords) || coords.length < 2 || isNaN(coords[0]) || isNaN(coords[1])) {
                toast.error('Set the story\'s opening map position first (Map View section above)');
                return;
            }
            setIsFillingCoords(true);
            try {
                const { data: chapters, error: chapErr } = await supabase
                    .from('chapters').select('id').eq('story_id', storyId);
                if (chapErr) throw chapErr;
                if (!chapters?.length) { toast.info('No chapters found'); return; }

                const { data: slides, error: slideErr } = await supabase
                    .from('slides').select('id, coordinates')
                    .in('chapter_id', chapters.map(c => c.id));
                if (slideErr) throw slideErr;

                const missing = (slides || []).filter(s =>
                    !s.coordinates ||
                    !Array.isArray(s.coordinates) ||
                    s.coordinates.length < 2 ||
                    isNaN(s.coordinates[0]) ||
                    isNaN(s.coordinates[1])
                );
                if (!missing.length) { toast.success('All slides already have coordinates'); return; }

                const patch = {
                    coordinates: coords,
                    zoom:    item.zoom    ?? 12,
                    bearing: item.bearing ?? 0,
                    pitch:   item.pitch   ?? 0,
                };

                // Update slides
                const updateResults = await Promise.all(
                    missing.map(s =>
                        supabase.from('slides').update(patch).eq('id', s.id)
                    )
                );
                const writeErrors = updateResults.filter(r => r.error);
                if (writeErrors.length > 0) {
                    throw new Error(writeErrors[0].error.message);
                }

                // Re-fetch to verify what the DB actually saved
                const { data: verifySlides, error: verifyErr } = await supabase
                    .from('slides')
                    .select('id, coordinates')
                    .in('id', missing.map(s => s.id));
                if (verifyErr) throw verifyErr;

                const saved = (verifySlides || []).filter(s =>
                    Array.isArray(s.coordinates) && s.coordinates.length >= 2 && !isNaN(s.coordinates[0])
                );

                if (saved.length === missing.length) {
                    toast.success(`Filled coordinates for ${saved.length} slide${saved.length === 1 ? '' : 's'}`);
                } else if (saved.length > 0) {
                    toast.success(`Partially filled: ${saved.length} of ${missing.length} slides updated`);
                } else {
                    toast.error(`Supabase accepted the update but nothing was saved — likely missing UPDATE policy on slides table`);
                }
            } catch (err) {
                toast.error('Failed: ' + (err?.message || 'unknown error'));
            } finally {
                setIsFillingCoords(false);
            }
        };

        return (<>
            <div className="space-y-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="flex flex-wrap gap-[50px] mb-4 pl-[50px]">
                        {[
                            { value: 'story',    label: 'Story Settings' },
                            { value: 'style',    label: 'Map Style' },
                            { value: 'language', label: 'Language' },
                            { value: 'about',    label: 'About' },
                        ].map(({ value: v, label }) => (
                            <button
                                key={v}
                                onClick={() => setActiveTab(v)}
                                className={`inline-flex items-center px-5 py-2 rounded-full shadow-md text-xl font-bold tracking-tight transition-all ${
                                    activeTab === v ? 'bg-amber-600 text-white' : 'bg-white text-slate-800 hover:brightness-95'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <TabsContent value="story">
                    <Card>
                    <CardContent className="pt-6 space-y-4">
                        {/* Project Timeline */}
                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                            <FieldLabel>Project Timeline (optional)</FieldLabel>
                            <p className="text-sm text-slate-900 mt-0.5 mb-3">
                                Set a start and end date, they will then be distributed evenly across all slides as a starting point for Timeline view.
                            </p>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <FieldLabel>Project Start</FieldLabel>
                                    <Input
                                        type="date"
                                        value={item.project_start_date || ''}
                                        onChange={(e) => onUpdate({ ...item, project_start_date: e.target.value || null })}
                                        className="h-9"
                                    />
                                </div>
                                <div>
                                    <FieldLabel>Project End</FieldLabel>
                                    <Input
                                        type="date"
                                        value={item.project_end_date || ''}
                                        onChange={(e) => onUpdate({ ...item, project_end_date: e.target.value || null })}
                                        className="h-9"
                                    />
                                </div>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={!item.project_start_date || !item.project_end_date}
                                onClick={onDistributeDates}
                                className="w-full border-amber-400 text-amber-700 hover:bg-amber-100"
                            >
                                Distribute Dates Evenly Across All Slides
                            </Button>
                        </div>

                        <div>
                            <FieldLabel>Location</FieldLabel>
                            <Input
                                value={item.location || ''}
                                onChange={(e) => onUpdate({ ...item, location: e.target.value })}
                                placeholder="e.g. Central Africa, Democratic Republic of Congo"
                            />
                        </div>

                        <div>
                            <FieldLabel>Title <span className="text-red-500">*</span></FieldLabel>
                            <Input
                                value={item.title || ''}
                                onChange={(e) => onUpdate({ ...item, title: e.target.value })}
                                placeholder="A Journey Through Time"
                            />
                        </div>
                        <div>
                            <FieldLabel>Subtitle</FieldLabel>
                            <ReactQuill
                                value={item.subtitle || ''}
                                onChange={(content) => onUpdate({ ...item, subtitle: content })}
                                placeholder="Exploring the world's most iconic landmarks..."
                                className="bg-white"
                                style={{ marginBottom: '42px' }}
                                modules={{
                                    toolbar: [
                                        ['bold', 'italic', 'underline'],
                                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                        ['link']
                                    ]
                                }}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <FieldLabel>Hero CTA Label</FieldLabel>
                                <Input
                                    value={item.hero_cta_label || ''}
                                    onChange={(e) => onUpdate({ ...item, hero_cta_label: e.target.value })}
                                    placeholder="e.g. Go to Dashboard"
                                    className="text-xs"
                                />
                            </div>
                            <div>
                                <FieldLabel>Hero CTA URL</FieldLabel>
                                <Input
                                    value={item.hero_cta_url || ''}
                                    onChange={(e) => onUpdate({ ...item, hero_cta_url: e.target.value })}
                                    placeholder="e.g. /Stories"
                                    className="text-xs"
                                />
                            </div>
                            <p className="col-span-2 text-xs text-slate-400 -mt-1">Optional secondary button on the hero section</p>
                        </div>
                        <div>
                            <FieldLabel>Story Description</FieldLabel>
                            <p className="text-sm text-slate-900 mb-1">Shown as a full panel between the hero and chapter one. Leave blank to skip.</p>
                            <ReactQuill
                                value={item.story_description || ''}
                                onChange={(content) => onUpdate({ ...item, story_description: content })}
                                placeholder="An overview of the project, its context and significance..."
                                className="bg-white"
                                style={{ marginBottom: '42px' }}
                                modules={{
                                    toolbar: [
                                        ['bold', 'italic', 'underline'],
                                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                        ['link']
                                    ]
                                }}
                            />
                        </div>

                        {/* Project Overview */}
                        <div>
                            <FieldLabel>Project Overview</FieldLabel>
                            <p className="text-sm text-slate-900 mb-1">Displayed as a text panel on the left of the carousel in the Project Timeline view.</p>
                            <Textarea
                                value={item.project_overview || ''}
                                onChange={(e) => onUpdate({ ...item, project_overview: e.target.value })}
                                placeholder="Provide context, background, and significance of this project..."
                                rows={5}
                                className="resize-none"
                            />
                        </div>

                        {/* Opening Map View */}
                        <div>
                            <FieldLabel>Story Opening Map View</FieldLabel>
                            <p className="text-sm text-slate-900 mb-2">Set the initial map view when the story opens</p>
                            <EmbeddedLocationPicker
                                location={{
                                    lat: item.coordinates?.[0] || 0,
                                    lng: item.coordinates?.[1] || 0,
                                    zoom: item.zoom || 2,
                                    bearing: item.bearing || 0,
                                    pitch: item.pitch || 0,
                                    name: ''
                                }}
                                onLocationChange={(newLocation) => {
                                    onUpdate({
                                        ...item,
                                        coordinates: [newLocation.lat, newLocation.lng],
                                        zoom: newLocation.zoom,
                                        bearing: newLocation.bearing,
                                        pitch: newLocation.pitch
                                    });
                                }}
                                mapStyle={item.map_style || storyMapStyle || 'a'}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <FieldLabel>Author</FieldLabel>
                                <Input 
                                    value={item.author || ''} 
                                    onChange={(e) => onUpdate({ ...item, author: e.target.value })}
                                    placeholder="Your name"
                                    style={{ fontSize: '0.9rem', lineHeight: '1.2rem' }}
                                />
                            </div>
                            <div>
                                <FieldLabel>Category</FieldLabel>
                                <Select 
                                    value={item.category || 'other'} 
                                    onValueChange={(value) => onUpdate({ ...item, category: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
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
                        
                        {/* Hero Media */}
                        <div>
                            <FieldLabel>Hero Media</FieldLabel>
                            <div className="mt-2 space-y-3">
                                {item.hero_type === 'video' && item.hero_video && (
                                    <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                                        <video src={item.hero_video} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                                        <button
                                            onClick={() => onUpdate({ ...item, hero_video: '', hero_type: 'image' })}
                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                {item.hero_type === 'image' && item.hero_image && (
                                    <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                                        <img src={item.hero_image} alt="Hero" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => onUpdate({ ...item, hero_image: '', hero_type: 'image' })}
                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                
                                {/* Video URL Input */}
                                <div>
                                    <FieldLabel>Video URL (YouTube, Vimeo, or direct link)</FieldLabel>
                                    <Input
                                        value={item.hero_video || ''}
                                        onChange={(e) => onUpdate({ ...item, hero_video: e.target.value, hero_type: 'video' })}
                                        placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                                        className="text-xs"
                                    />
                                </div>

                                {/* Loop option — only shown when a video is set */}
                                {item.hero_type === 'video' && item.hero_video && (
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={item.hero_video_loop !== false}
                                            onChange={(e) => onUpdate({ ...item, hero_video_loop: e.target.checked })}
                                            className="w-3.5 h-3.5 accent-amber-500"
                                        />
                                        <span className="text-xs text-slate-600">Loop video</span>
                                    </label>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    <input type="file" accept="image/*" onChange={handleHeroImageUpload} className="hidden" id="hero-image" />
                                    <label htmlFor="hero-image">
                                        <Button type="button" variant="outline" disabled={isUploadingHeroImage || isUploadingHeroVideo} onClick={() => document.getElementById('hero-image').click()}>
                                            {isUploadingHeroImage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                            Upload Image
                                        </Button>
                                    </label>
                                    <Button type="button" variant="outline" size="sm" onClick={() => setMediaPickerTarget('hero_image')}>
                                        <Images className="w-4 h-4 mr-1" /> Library
                                    </Button>
                                    <input type="file" accept="video/*" onChange={handleHeroVideoUpload} className="hidden" id="hero-video" />
                                    <label htmlFor="hero-video">
                                        <Button type="button" variant="outline" disabled={isUploadingHeroVideo || isUploadingHeroImage} onClick={() => document.getElementById('hero-video').click()}>
                                            {isUploadingHeroVideo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                            Upload Video
                                        </Button>
                                    </label>
                                    <Button type="button" variant="outline" size="sm" onClick={() => setMediaPickerTarget('hero_video')}>
                                        <Images className="w-4 h-4 mr-1" /> Library
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Story Thumbnail */}
                        <div>
                            <FieldLabel>Story Thumbnail</FieldLabel>
                            <p className="text-sm text-slate-900 mt-0.5 mb-2">
                                Shown in story browser cards. Use a still image even if the hero is a video.
                            </p>
                            {item.thumbnail && (
                                <div className="relative w-full h-32 rounded-lg overflow-hidden border mb-2">
                                    <img src={item.thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => onUpdate({ ...item, thumbnail: '' })}
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                                <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" id="story-thumbnail" />
                                <label htmlFor="story-thumbnail">
                                    <Button type="button" variant="outline" disabled={isUploadingThumbnail} onClick={() => document.getElementById('story-thumbnail').click()}>
                                        {isUploadingThumbnail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                        {item.thumbnail ? 'Replace Thumbnail' : 'Upload Thumbnail'}
                                    </Button>
                                </label>
                                <Button type="button" variant="outline" size="sm" onClick={() => setMediaPickerTarget('thumbnail')}>
                                    <Images className="w-4 h-4 mr-1" /> Library
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <Switch
                                    checked={item.is_published || false}
                                    onCheckedChange={(checked) => onUpdate({ ...item, is_published: checked })}
                                />
                                <Label>{item.is_published ? 'Published' : 'Draft'}</Label>
                            </div>
                            <div className="flex items-center gap-3">
                                <Switch
                                    checked={item.is_shareable || false}
                                    onCheckedChange={(checked) => onUpdate({ ...item, is_shareable: checked })}
                                />
                                <Label>Allow social media sharing</Label>
                            </div>
                        </div>

                        {/* Route Settings */}
                        <div className="border-t pt-4 mt-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <Switch
                                    checked={item.show_route !== false}
                                    onCheckedChange={(checked) => onUpdate({ ...item, show_route: checked })}
                                />
                                <Label>Show Route Line</Label>
                            </div>

                            {item.show_route !== false && (
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={onComputeRoutes}
                                            disabled={isComputingRoutes}
                                        >
                                            {isComputingRoutes ? 'Computing...' : 'Compute Routes'}
                                        </Button>
                                        {chapterRouteCount > 0 && (
                                            <Button size="sm" variant="ghost" onClick={onClearRoutes}>
                                                Clear
                                            </Button>
                                        )}
                                    </div>
                                    {routeComputeStatus && (
                                        <p className="text-sm text-slate-900">{routeComputeStatus}</p>
                                    )}
                                    {chapterRouteCount > 0 && !routeComputeStatus && (
                                        <p className="text-sm text-slate-900">
                                            {chapterRouteCount}/{totalChapterCount} chapters have routes
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Fill missing slide coordinates */}
                        <div className="border-t pt-4 mt-4 space-y-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleFillMissingCoordinates}
                                disabled={isFillingCoords || !item.coordinates}
                                className="w-full"
                            >
                                {isFillingCoords
                                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Filling…</>
                                    : <><MapPin className="w-4 h-4 mr-2" />Fill Missing Slide Coordinates</>
                                }
                            </Button>
                            <p className="text-xs text-slate-500">
                                Assigns the story's opening map position to any slides that have no coordinates set.
                                {!item.coordinates && <span className="text-amber-600"> Set the opening map position above first.</span>}
                            </p>
                        </div>

                        <div className="pt-4 border-t">
                            <Button onClick={onAddChapter} className="w-full">
                                <Plus className="w-4 h-4 mr-2" /> Add Chapter
                            </Button>
                        </div>
                    </CardContent>
                    </Card>
                    </TabsContent>

                    <TabsContent value="style">
                    <Card>
                    <CardContent className="pt-6 space-y-4">
                        <p className="text-sm text-slate-900">
                            Select the base map style for this story. Thumbnails show the style over your story's opening location.
                        </p>
                        <div className="flex flex-col gap-4">
                            {Object.entries(MAP_STYLES_CONFIG).map(([key, style]) => {
                                const thumbLon = item.coordinates?.[1] ?? 2.3522;
                                const thumbLat = item.coordinates?.[0] ?? 48.8566;
                                const thumbZoom = Math.max(4, Math.min(item.zoom || 8, 13));
                                const thumbUrl = style.cesium
                                    ? null
                                    : `https://api.mapbox.com/styles/v1/${style.owner}/${style.id}/static/${thumbLon},${thumbLat},${thumbZoom},0,0/600x280@2x?access_token=${MAPBOX_TOKEN}`;
                                const isSelected = (item.map_style || 'a') === key;
                                return (
                                    <div
                                        key={key}
                                        onClick={() => onUpdate({ ...item, map_style: key })}
                                        className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 flex ${
                                            isSelected
                                                ? 'border-amber-500 shadow-lg shadow-amber-500/20'
                                                : 'border-slate-200 hover:border-slate-400'
                                        }`}
                                    >
                                        {/* Thumbnail — fixed 600px width */}
                                        <div className="relative flex-shrink-0" style={{ width: 600 }}>
                                            {thumbUrl ? (
                                            <img
                                                src={thumbUrl}
                                                alt={style.label}
                                                className="w-full h-44 object-cover"
                                            />
                                            ) : (
                                            <div className="w-full h-44 flex items-center justify-center bg-slate-900 text-slate-400 text-xs tracking-widest uppercase">
                                                Google Photorealistic 3D Tiles
                                            </div>
                                            )}
                                            {isSelected && (
                                                <div className="absolute top-2 right-2 w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center shadow-md">
                                                    <Check className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        {/* Info column */}
                                        <div className={`flex-1 px-5 py-4 flex flex-col justify-between ${isSelected ? 'bg-amber-50' : 'bg-white'}`}>
                                            <div>
                                                <span className={`text-sm font-semibold block mb-1 ${isSelected ? 'text-amber-700' : 'text-slate-700'}`}>
                                                    {style.label}
                                                </span>
                                                <span className="text-sm text-slate-900">{style.description}</span>
                                            </div>
                                            {isSelected && (
                                                <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full w-fit">Active</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                    </Card>
                    </TabsContent>

                    <TabsContent value="language">
                    <Card>
                    <CardContent className="pt-6">
                        <LanguageSettingsTab item={item} onUpdate={onUpdate} />
                    </CardContent>
                    </Card>
                    </TabsContent>

                    <TabsContent value="about">
                    <Card>
                    <CardContent className="pt-6 space-y-4">
                        <p className="text-sm text-slate-900">Shown in the About panel, accessible from the story banner. Leave blank to hide the About button.</p>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <FieldLabel>Organisation Name</FieldLabel>
                                <Input
                                    value={item.about_org_name || ''}
                                    onChange={(e) => onUpdate({ ...item, about_org_name: e.target.value })}
                                    placeholder="Your organisation"
                                    style={{ fontSize: '0.9rem', lineHeight: '1.2rem' }}
                                />
                            </div>
                            <div>
                                <FieldLabel>Logo URL</FieldLabel>
                                <Input
                                    value={item.about_logo_url || ''}
                                    onChange={(e) => onUpdate({ ...item, about_logo_url: e.target.value })}
                                    placeholder="https://..."
                                    style={{ fontSize: '0.9rem', lineHeight: '1.2rem' }}
                                />
                            </div>
                        </div>

                        <div>
                            <FieldLabel>Who We Are</FieldLabel>
                            <ReactQuill
                                value={item.about_who_we_are || ''}
                                onChange={(content) => onUpdate({ ...item, about_who_we_are: content })}
                                placeholder="A brief introduction to your organisation..."
                                className="bg-white"
                                style={{ marginBottom: '42px' }}
                                modules={{ toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link']] }}
                            />
                        </div>

                        <div>
                            <FieldLabel>What We Do</FieldLabel>
                            <ReactQuill
                                value={item.about_what_we_do || ''}
                                onChange={(content) => onUpdate({ ...item, about_what_we_do: content })}
                                placeholder="Describe your work and focus areas..."
                                className="bg-white"
                                style={{ marginBottom: '42px' }}
                                modules={{ toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link']] }}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <FieldLabel>Website</FieldLabel>
                                <Input
                                    value={item.about_website || ''}
                                    onChange={(e) => onUpdate({ ...item, about_website: e.target.value })}
                                    placeholder="https://yourorg.org"
                                    style={{ fontSize: '0.9rem', lineHeight: '1.2rem' }}
                                />
                            </div>
                            <div>
                                <FieldLabel>Email</FieldLabel>
                                <Input
                                    value={item.about_email || ''}
                                    onChange={(e) => onUpdate({ ...item, about_email: e.target.value })}
                                    placeholder="contact@yourorg.org"
                                    style={{ fontSize: '0.9rem', lineHeight: '1.2rem' }}
                                />
                            </div>
                        </div>
                    </CardContent>
                    </Card>
                    </TabsContent>

                </Tabs>
            </div>
            <MediaLibraryDialog
                storyId={storyId}
                isOpen={!!mediaPickerTarget}
                onClose={() => setMediaPickerTarget(null)}
                mode="picker"
                accept={mediaPickerTarget === 'hero_video' ? 'video' : 'image'}
                onSelect={(url) => {
                    const updates = {
                        hero_image: { hero_image: url, hero_type: 'image' },
                        hero_video: { hero_video: url, hero_type: 'video' },
                        thumbnail:  { thumbnail: url },
                    };
                    onUpdate({ ...item, ...(updates[mediaPickerTarget] || {}) });
                    setMediaPickerTarget(null);
                }}
            />
        </>);
    }

    // Chapter Editor
    if (itemType === 'chapter') {
        const saveToMediaLibrary = async (file_url, file) => {
            if (!storyId) return;
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            await supabase.from('media').insert({
                id: generateId(),
                story_id: storyId,
                url: file_url,
                filename: safeName,
                title: file.name.split('.')[0],
                category: 'other',
                tags: [],
                type: file.type.startsWith('image') ? 'image' : 'video',
                file_size: file.size,
                created_date: new Date().toISOString(),
            });
        };

        const handleChapterImageUpload = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setIsUploadingChapterImage(true);
            try {
                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const filePath = `${generateId()}-${safeName}`;
                const { error: uploadError } = await supabase.storage
                    .from('media')
                    .upload(filePath, file, { contentType: file.type, upsert: false });
                if (uploadError) throw uploadError;
                const { data: { publicUrl: file_url } } = supabase.storage.from('media').getPublicUrl(filePath);
                await saveToMediaLibrary(file_url, file);
                onUpdate({ ...item, background_image: file_url });
            } finally {
                setIsUploadingChapterImage(false);
            }
        };

        const handleChapterVideoUpload = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setIsUploadingChapterVideo(true);
            try {
                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const filePath = `${generateId()}-${safeName}`;
                const { error: uploadError } = await supabase.storage
                    .from('media')
                    .upload(filePath, file, { contentType: file.type, upsert: false });
                if (uploadError) throw uploadError;
                const { data: { publicUrl: file_url } } = supabase.storage.from('media').getPublicUrl(filePath);
                await saveToMediaLibrary(file_url, file);
                onUpdate({ ...item, chapter_video: file_url });
            } finally {
                setIsUploadingChapterVideo(false);
            }
        };

        return (<>
            <div className="w-full space-y-4">
                <PanelTitle>Chapter Settings</PanelTitle>
                <Card>
                    <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center justify-end pb-2 border-b">
                            <div className="flex items-center gap-2">
                                <Button onClick={() => onAddSlide(item.id)} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                                    <Plus className="w-4 h-4 mr-1" /> Add Slide
                                </Button>
                                {onGenerateCaptions && itemType === 'chapter' && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onGenerateCaptions(item.id)}
                                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                    >
                                        <Wand2 className="w-4 h-4 mr-1" /> Generate Captions
                                    </Button>
                                )}
                                {onDelete && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => onDelete(item.id)}
                                    >
                                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div>
                            <FieldLabel>Chapter Name</FieldLabel>
                            <Input
                                type="text"
                                placeholder="e.g. Arriving in Rome"
                                value={item.name || ''}
                                onChange={(e) => onUpdate({ ...item, name: e.target.value })}
                            />
                            <p className="text-sm text-slate-900 mt-1">Shown as large title on the chapter card</p>
                        </div>

                        <div>
                            <FieldLabel>Chapter Description</FieldLabel>
                            <Textarea
                                placeholder="Brief chapter introduction shown on the title card"
                                value={item.description || ''}
                                onChange={(e) => onUpdate({ ...item, description: e.target.value })}
                                rows={3}
                                className="resize-none"
                            />
                        </div>

                        {/* Chapter Background Image */}
                        <div>
                            <FieldLabel>Title Card Background Image</FieldLabel>
                            <p className="text-sm text-slate-900 mb-2">Full-bleed image shown behind the chapter title. If not set, uses the first slide's image.</p>
                            {item.background_image && (
                                <div className="relative w-full h-32 rounded-lg overflow-hidden border mb-3">
                                    <img src={item.background_image} className="w-full h-full object-cover" alt="Chapter background" />
                                    <button
                                        onClick={() => onUpdate({ ...item, background_image: null })}
                                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2 items-center">
                                <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border rounded-md text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                                    {isUploadingChapterImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                                    {isUploadingChapterImage ? 'Uploading...' : 'Upload Image'}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleChapterImageUpload} disabled={isUploadingChapterImage} />
                                </label>
                                <Button type="button" variant="outline" size="sm" onClick={() => setMediaPickerTarget('background_image')}>
                                    <Images className="w-4 h-4 mr-1" /> Library
                                </Button>
                            </div>
                        </div>

                        {/* Chapter Background Video */}
                        <div>
                            <FieldLabel>Title Card Background Video</FieldLabel>
                            <p className="text-sm text-slate-900 mb-2">Video plays looped behind the chapter title. Overrides the background image when set.</p>
                            {item.chapter_video && (
                                <div className="relative w-full h-32 rounded-lg overflow-hidden border mb-3">
                                    <video src={item.chapter_video} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                                    <button
                                        onClick={() => onUpdate({ ...item, chapter_video: null })}
                                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                            {item.chapter_video && (
                                <label className="flex items-center gap-2 mb-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={item.chapter_video_loop !== false}
                                        onChange={(e) => onUpdate({ ...item, chapter_video_loop: e.target.checked })}
                                        className="w-3.5 h-3.5 accent-amber-500"
                                    />
                                    <span className="text-xs text-slate-600">Loop video</span>
                                </label>
                            )}
                            <div className="flex flex-wrap gap-2 items-center">
                                <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border rounded-md text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                                    {isUploadingChapterVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                                    {isUploadingChapterVideo ? 'Uploading...' : 'Upload Video'}
                                    <input type="file" accept="video/*" className="hidden" onChange={handleChapterVideoUpload} disabled={isUploadingChapterVideo} />
                                </label>
                                <Button type="button" variant="outline" size="sm" onClick={() => setMediaPickerTarget('chapter_video')}>
                                    <Images className="w-4 h-4 mr-1" /> Library
                                </Button>
                            </div>
                        </div>

                        {/* Chapter Location */}
                        <div>
                            <FieldLabel>Chapter Location</FieldLabel>
                            {storyMapStyle === 'photorealistic-3d' ? (
                                <CesiumLocationPicker
                                    value={item.cesium_camera || null}
                                    onChange={(cam) => onUpdate({ ...item, cesium_camera: cam })}
                                />
                            ) : (
                                <>
                                    <p className="text-sm text-slate-900 mb-2">Sets the map view when this chapter's title card is shown</p>
                                    <EmbeddedLocationPicker
                                        location={{
                                            lat: item.coordinates?.[0] || 0,
                                            lng: item.coordinates?.[1] || 0,
                                            zoom: item.zoom || 12,
                                            bearing: item.bearing || 0,
                                            pitch: item.pitch || 0,
                                        }}
                                        onLocationChange={(newLocation) => {
                                            onUpdate({
                                                ...item,
                                                coordinates: [newLocation.lat, newLocation.lng],
                                                zoom: newLocation.zoom,
                                                bearing: newLocation.bearing,
                                                pitch: newLocation.pitch,
                                            });
                                        }}
                                        mapStyle={storyMapStyle || 'a'}
                                    />
                                </>
                            )}
                        </div>

                        <div>
                            <FieldLabel>Card Alignment</FieldLabel>
                            <Select
                                value={item.alignment || 'left'}
                                onValueChange={(value) => onUpdate({ ...item, alignment: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="left">Left</SelectItem>
                                    <SelectItem value="center">Center</SelectItem>
                                    <SelectItem value="right">Right</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <MediaLibraryDialog
                storyId={storyId}
                isOpen={!!mediaPickerTarget}
                onClose={() => setMediaPickerTarget(null)}
                mode="picker"
                accept={mediaPickerTarget === 'chapter_video' ? 'video' : 'image'}
                onSelect={(url) => {
                    const updates = {
                        background_image: { background_image: url },
                        chapter_video:    { chapter_video: url },
                    };
                    onUpdate({ ...item, ...(updates[mediaPickerTarget] || {}) });
                    setMediaPickerTarget(null);
                }}
            />
        </>);
    }

    // Slide Editor
    if (itemType === 'slide') {
        const saveToMediaLibrary = async (file_url, file) => {
            if (!storyId) return;
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            await supabase.from('media').insert({
                id: generateId(),
                story_id: storyId,
                url: file_url,
                filename: safeName,
                title: file.name.split('.')[0],
                category: 'other',
                tags: [],
                type: file.type.startsWith('image') ? 'image' : 'video',
                file_size: file.size,
                created_date: new Date().toISOString(),
            });
        };

        const handleImageUpload = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setIsUploadingImage(true);
            try {
                // Extract capture date from EXIF before upload
                let captureDate = null;
                try {
                    const exif = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate']);
                    captureDate = exif?.DateTimeOriginal || exif?.CreateDate || null;
                } catch (_) {}

                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const filePath = `${generateId()}-${safeName}`;
                const { error: uploadError } = await supabase.storage
                    .from('media')
                    .upload(filePath, file, { contentType: file.type, upsert: false });
                if (uploadError) throw uploadError;
                const { data: { publicUrl: file_url } } = supabase.storage.from('media').getPublicUrl(filePath);
                await saveToMediaLibrary(file_url, file);
                onUpdate({
                    ...item,
                    image: file_url,
                    ...(captureDate ? {
                        capture_date: captureDate.toISOString(),
                        story_date: captureDate.toISOString().split('T')[0],
                    } : {}),
                });
            } finally {
                setIsUploadingImage(false);
            }
        };

        const handleVideoUpload = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setIsUploadingVideo(true);
            try {
                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const filePath = `${generateId()}-${safeName}`;
                const { error: uploadError } = await supabase.storage
                    .from('media')
                    .upload(filePath, file, { contentType: file.type, upsert: false });
                if (uploadError) throw uploadError;
                const { data: { publicUrl: file_url } } = supabase.storage.from('media').getPublicUrl(filePath);
                await saveToMediaLibrary(file_url, file);
                onUpdate({ ...item, video_url: file_url });
            } finally {
                setIsUploadingVideo(false);
            }
        };



        return (<>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex flex-wrap gap-[50px] mb-4 pl-[50px]">
                    {[
                        { value: 'content',  label: 'Content' },
                        { value: 'location', label: 'Location' },
                        { value: 'media',    label: 'Media' },
                    ].map(({ value: v, label }) => (
                        <button
                            key={v}
                            onClick={() => setActiveTab(v)}
                            className={`inline-flex items-center px-5 py-2 rounded-full shadow-md text-xl font-bold tracking-tight transition-all ${
                                activeTab === v ? 'bg-amber-600 text-white' : 'bg-white text-slate-800 hover:brightness-95'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <TabsContent value="content" className="space-y-4 mt-4">
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            <div>
                                <FieldLabel>Title</FieldLabel>
                                <Input
                                    value={item.title || ''}
                                    onChange={(e) => onUpdate({ ...item, title: e.target.value })}
                                    placeholder="Slide title"
                                />
                            </div>
                            <div>
                                <FieldLabel>Description</FieldLabel>
                                <ReactQuill
                                    value={item.description || ''}
                                    onChange={(content) => onUpdate({ ...item, description: content })}
                                    placeholder="Slide description"
                                    className="bg-white"
                                    style={{ marginBottom: '42px' }}
                                    modules={{
                                        toolbar: [
                                            ['bold', 'italic', 'underline'],
                                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                            ['link']
                                        ]
                                    }}
                                />
                            </div>
                            <div>
                                <FieldLabel>Extended Content</FieldLabel>
                                <ReactQuill
                                    value={item.extended_content || ''}
                                    onChange={(content) => onUpdate({ ...item, extended_content: content })}
                                    placeholder="Additional detailed content (appears in fullscreen view)"
                                    className="bg-white"
                                    style={{ marginBottom: '42px' }}
                                    modules={{
                                        toolbar: [
                                            ['bold', 'italic', 'underline'],
                                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                            ['link']
                                        ]
                                    }}
                                />
                            </div>
                            <div>
                                <FieldLabel>Milestone <span className="text-slate-400 font-normal text-xs normal-case tracking-normal">(Timeline View)</span></FieldLabel>
                                <ReactQuill
                                    value={item.milestone || ''}
                                    onChange={(content) => onUpdate({ ...item, milestone: content })}
                                    placeholder="Chronological milestone note — only shown in Timeline View..."
                                    className="bg-white"
                                    style={{ marginBottom: '42px' }}
                                    modules={{
                                        toolbar: [
                                            ['bold', 'italic', 'underline'],
                                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                            ['link']
                                        ]
                                    }}
                                />
                            </div>
                            <div>
                                <FieldLabel>Location Name</FieldLabel>
                                <Input
                                    value={item.location || ''}
                                    onChange={(e) => onUpdate({ ...item, location: e.target.value })}
                                    placeholder="e.g., Paris, France"
                                    style={{ fontSize: '0.9rem', lineHeight: '1.2rem' }}
                                />
                            </div>
                            <div>
                                <FieldLabel>Story Date</FieldLabel>
                                <Input
                                    type="date"
                                    value={item.story_date || ''}
                                    onChange={(e) => onUpdate({ ...item, story_date: e.target.value || null })}
                                />
                                {item.capture_date && (() => {
                                    const captureDay = item.capture_date.split('T')[0];
                                    return captureDay !== item.story_date ? (
                                        <p className="text-sm text-slate-900 mt-1">
                                            Photo taken: {captureDay}{' '}
                                            <button
                                                type="button"
                                                onClick={() => onUpdate({ ...item, story_date: captureDay })}
                                                className="text-amber-500 hover:text-amber-600 underline"
                                            >
                                                reset
                                            </button>
                                        </p>
                                    ) : null;
                                })()}
                                <p className="text-sm text-slate-900 mt-1">The contextual date for this slide — used in the story timeline</p>
                            </div>
                            <div>
                                <FieldLabel>Card Style</FieldLabel>
                                <Select
                                    value={item.card_style || 'default'}
                                    onValueChange={(value) => onUpdate({ ...item, card_style: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="default">Default Card</SelectItem>
                                        <SelectItem value="full_background">Full Background</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-sm text-slate-900 mt-1">Choose the visual style for this slide</p>
                            </div>
                            {onDelete && (
                                <Button 
                                    variant="destructive" 
                                    size="sm" 
                                    onClick={() => onDelete(item.id)}
                                    className="w-full"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete Slide
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="location" className="space-y-4 mt-4">
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            {storyMapStyle === 'photorealistic-3d' ? (
                                <CesiumLocationPicker
                                    value={item.cesium_camera || null}
                                    onChange={(cam) => onUpdate({ ...item, cesium_camera: cam })}
                                />
                            ) : (
                            <EmbeddedLocationPicker
                                location={{
                                    lat: item.coordinates?.[0] || 0,
                                    lng: item.coordinates?.[1] || 0,
                                    zoom: item.zoom || 12,
                                    bearing: item.bearing || 0,
                                    pitch: item.pitch || 0,
                                    name: item.location
                                }}
                                onLocationChange={(newLocation) => {
                                    onUpdate({
                                        ...item,
                                        coordinates: [newLocation.lat, newLocation.lng],
                                        zoom: newLocation.zoom,
                                        bearing: newLocation.bearing,
                                        pitch: newLocation.pitch,
                                        location: newLocation.name || item.location
                                    });
                                }}
                                mapStyle={storyMapStyle || 'a'}
                            />
                            )}
                            
                            <div className="pt-4 border-t">
                                <FieldLabel>Fly Duration (seconds)</FieldLabel>
                                <Input
                                    type="number"
                                    min="1"
                                    max="60"
                                    value={item.fly_duration ?? ''}
                                    onChange={(e) => onUpdate({ ...item, fly_duration: e.target.value ? parseFloat(e.target.value) : undefined })}
                                    placeholder="8"
                                    style={{ fontSize: '0.9rem', lineHeight: '1.2rem' }}
                                />
                                <p className="text-sm text-slate-900 mt-1">
                                    How long the map takes to fly to this location. Defaults to 8 seconds.
                                </p>
                            </div>

                            <div className="pt-4 border-t space-y-3">
                                <div>
                                    <FieldLabel>Mapbox Layer ID (Optional)</FieldLabel>
                                    <Input
                                        value={item.mapbox_layer_id || ''}
                                        onChange={(e) => onUpdate({ ...item, mapbox_layer_id: e.target.value })}
                                        placeholder="e.g., my-custom-layer"
                                        style={{ fontSize: '0.9rem', lineHeight: '1.2rem' }}
                                    />
                                    <p className="text-sm text-slate-900 mt-1">
                                        Enter the ID of a Mapbox layer to display when this slide is active
                                    </p>
                                </div>
                                <div>
                                    <FieldLabel>Layer Display Name (Optional)</FieldLabel>
                                    <Input
                                        value={item.layer_display_name || ''}
                                        onChange={(e) => onUpdate({ ...item, layer_display_name: e.target.value })}
                                        placeholder="e.g., Tree Canopy 2024"
                                        style={{ fontSize: '0.9rem', lineHeight: '1.2rem' }}
                                    />
                                    <p className="text-sm text-slate-900 mt-1">
                                        Label shown on the map layer toggle button
                                    </p>
                                </div>
                                <div className="pt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={!!item.show_rain_button}
                                            onChange={(e) => onUpdate({ ...item, show_rain_button: e.target.checked })}
                                            className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                                        />
                                        <span className="text-sm font-medium text-slate-700">Show Rain Button</span>
                                    </label>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Adds a rain effect toggle to the map pill when this slide is active
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="media" className="space-y-4 mt-4">
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            {/* Image */}
                            <div>
                                <FieldLabel>Image</FieldLabel>
                                {item.image && (
                                    <div className="mt-2 relative">
                                        <div className="relative">
                                            <ImageCropHotspotPicker
                                                imageUrl={item.image}
                                                imagePosition={item.image_position || '50% 50%'}
                                                onImagePositionChange={(pos) => onUpdate({ ...item, image_position: pos })}
                                                hotspots={
                                                    item.hotspots?.length
                                                        ? item.hotspots
                                                        : (item.hotspot_x != null
                                                            ? [{ x: item.hotspot_x, y: item.hotspot_y, title: item.hotspot_title || '', body: item.hotspot_body || '' }]
                                                            : [])
                                                }
                                                onHotspotsChange={(hotspots) => onUpdate({ ...item, hotspots })}
                                            />
                                            <button
                                                onClick={() => onUpdate({ ...item, image: '' })}
                                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 z-10"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <div className="flex gap-2 mt-2">
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="slide-image" />
                                    <label htmlFor="slide-image" className="flex-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={isUploadingImage}
                                            onClick={() => document.getElementById('slide-image').click()}
                                            className="w-full"
                                        >
                                            {isUploadingImage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                                            Upload Image
                                        </Button>
                                    </label>
                                    <Button type="button" variant="outline" size="sm" onClick={() => setMediaPickerTarget('slide_image')}>
                                        <Images className="w-4 h-4 mr-1" /> Library
                                    </Button>
                                </div>
                            </div>

                            {/* Video */}
                            <div>
                                <FieldLabel>Video</FieldLabel>
                                {item.video_url && (
                                    <div className="relative w-full h-40 rounded-lg overflow-hidden border mt-2">
                                        <video src={item.video_url} className="w-full h-full object-cover" controls />
                                        <button
                                            onClick={() => onUpdate({ ...item, video_url: '' })}
                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                
                                {/* Video URL Input */}
                                <div className="mt-2">
                                    <FieldLabel>Video URL (YouTube, Vimeo, or direct link)</FieldLabel>
                                    <Input
                                        value={item.video_url || ''} 
                                        onChange={(e) => onUpdate({ ...item, video_url: e.target.value })}
                                        placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                                        className="text-xs"
                                    />
                                </div>

                                {/* Loop option — only shown when a video is set */}
                                {item.video_url && (
                                    <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={item.video_loop === true}
                                            onChange={(e) => onUpdate({ ...item, video_loop: e.target.checked })}
                                            className="w-3.5 h-3.5 accent-amber-500"
                                        />
                                        <span className="text-xs text-slate-600">Loop video</span>
                                    </label>
                                )}

                                <div className="flex gap-2 mt-2">
                                    <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" id="slide-video" />
                                    <label htmlFor="slide-video" className="flex-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={isUploadingVideo}
                                            onClick={() => document.getElementById('slide-video').click()}
                                            className="w-full"
                                        >
                                            {isUploadingVideo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Video className="w-4 h-4 mr-2" />}
                                            Upload Video
                                        </Button>
                                    </label>
                                    <Button type="button" variant="outline" size="sm" onClick={() => setMediaPickerTarget('slide_video')}>
                                        <Images className="w-4 h-4 mr-1" /> Library
                                    </Button>
                                </div>
                            </div>

                            {/* PDF */}
                            <div>
                                <FieldLabel>PDF Document</FieldLabel>
                                {item.pdf_url ? (
                                    <div className="mt-2 p-3 bg-slate-50 rounded-lg border space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-5 h-5 text-red-600 shrink-0" />
                                                <span className="text-sm text-slate-900">PDF attached</span>
                                            </div>
                                            <button
                                                onClick={() => onUpdate({ ...item, pdf_url: '', pdf_title: '' })}
                                                className="text-red-500 hover:text-red-600"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div>
                                            <FieldLabel>Display Title</FieldLabel>
                                            <Input
                                                value={item.pdf_title || ''}
                                                onChange={(e) => onUpdate({ ...item, pdf_title: e.target.value })}
                                                placeholder="Short display title..."
                                                maxLength={60}
                                                className="mt-1 text-sm"
                                            />
                                            <p className="text-sm text-slate-900 mt-1">Shown in the story viewer. Saved with the slide.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        onClick={() => setShowDocumentPicker(true)}
                                        className="mt-2 w-full"
                                    >
                                        <FileText className="w-4 h-4 mr-2" />
                                        Browse Document Library
                                    </Button>
                                )}
                            </div>
                            
                            {/* Document Picker Dialog */}
                            <DocumentPicker
                                isOpen={showDocumentPicker}
                                onClose={() => setShowDocumentPicker(false)}
                                storyId={storyId}
                                onSelect={(doc) => {
                                    onUpdate({ ...item, pdf_url: doc.file_url, pdf_title: doc.title });
                                    setShowDocumentPicker(false);
                                }}
                            />

                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            <MediaLibraryDialog
                storyId={storyId}
                isOpen={!!mediaPickerTarget}
                onClose={() => setMediaPickerTarget(null)}
                mode="picker"
                accept={mediaPickerTarget === 'slide_video' ? 'video' : 'image'}
                onSelect={(url) => {
                    const updates = {
                        slide_image: { image: url },
                        slide_video: { video_url: url },
                    };
                    onUpdate({ ...item, ...(updates[mediaPickerTarget] || {}) });
                    setMediaPickerTarget(null);
                }}
            />
        </>);
    }

    return null;
}