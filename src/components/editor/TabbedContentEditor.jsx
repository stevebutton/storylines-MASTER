import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, X, MapPin, FileText, Video, Image as ImageIcon, Trash2, Check } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import * as exifr from 'exifr';

const generateId = () => crypto.randomUUID().replace(/-/g, '').substring(0, 24);
import EmbeddedLocationPicker from '@/components/editor/EmbeddedLocationPicker';
import DocumentPicker from '@/components/editor/DocumentPicker';
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
    isComputingRoutes,
    routeComputeStatus,
    chapterRouteCount,
    totalChapterCount
}) {
    const [activeTab, setActiveTab] = useState('content');
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const [isUploadingHeroImage, setIsUploadingHeroImage] = useState(false);
    const [isUploadingHeroVideo, setIsUploadingHeroVideo] = useState(false);
    const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
    const [showDocumentPicker, setShowDocumentPicker] = useState(false);
    const [isUploadingChapterImage, setIsUploadingChapterImage] = useState(false);

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
                onUpdate({ ...item, thumbnail: file_url });
            } finally {
                setIsUploadingThumbnail(false);
            }
        };

        return (
            <div className="space-y-4">
                <Tabs defaultValue="story">
                    <TabsList className="w-full grid grid-cols-2">
                        <TabsTrigger value="story">Story</TabsTrigger>
                        <TabsTrigger value="style">Map Style</TabsTrigger>
                    </TabsList>

                    <TabsContent value="story">
                    <Card>
                    <CardContent className="pt-6 space-y-4">
                        <div>
                            <Label>Title <span className="text-red-500">*</span></Label>
                            <Input 
                                value={item.title || ''} 
                                onChange={(e) => onUpdate({ ...item, title: e.target.value })}
                                placeholder="A Journey Through Time"
                                style={{ fontSize: '0.9rem', lineHeight: '1.2rem' }}
                            />
                        </div>
                        <div>
                            <Label>Subtitle</Label>
                            <ReactQuill
                                value={item.subtitle || ''}
                                onChange={(content) => onUpdate({ ...item, subtitle: content })}
                                placeholder="Exploring the world's most iconic landmarks..."
                                className="bg-white"
                                style={{ height: '100px', marginBottom: '50px' }}
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
                            <Label>Story Description</Label>
                            <p className="text-xs text-slate-500 mb-1">Shown as a full panel between the hero and chapter one. Leave blank to skip.</p>
                            <ReactQuill
                                value={item.story_description || ''}
                                onChange={(content) => onUpdate({ ...item, story_description: content })}
                                placeholder="An overview of the project, its context and significance..."
                                className="bg-white"
                                style={{ height: '150px', marginBottom: '50px' }}
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
                            <Label>Project Overview</Label>
                            <p className="text-xs text-slate-500 mb-1">Displayed as a text panel on the left of the carousel in the Project Timeline view.</p>
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
                            <Label>Story Opening Map View</Label>
                            <p className="text-xs text-slate-500 mb-2">Set the initial map view when the story opens</p>
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
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Author</Label>
                                <Input 
                                    value={item.author || ''} 
                                    onChange={(e) => onUpdate({ ...item, author: e.target.value })}
                                    placeholder="Your name"
                                    style={{ fontSize: '0.9rem', lineHeight: '1.2rem' }}
                                />
                            </div>
                            <div>
                                <Label>Category</Label>
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
                            <Label>Hero Media</Label>
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
                                    <Label className="text-xs">Video URL (YouTube, Vimeo, or direct link)</Label>
                                    <Input 
                                        value={item.hero_video || ''} 
                                        onChange={(e) => onUpdate({ ...item, hero_video: e.target.value, hero_type: 'video' })}
                                        placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                                        className="text-xs"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <input type="file" accept="image/*" onChange={handleHeroImageUpload} className="hidden" id="hero-image" />
                                    <label htmlFor="hero-image">
                                        <Button type="button" variant="outline" disabled={isUploadingHeroImage || isUploadingHeroVideo} onClick={() => document.getElementById('hero-image').click()}>
                                            {isUploadingHeroImage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                            Upload Image
                                        </Button>
                                    </label>
                                    <input type="file" accept="video/*" onChange={handleHeroVideoUpload} className="hidden" id="hero-video" />
                                    <label htmlFor="hero-video">
                                        <Button type="button" variant="outline" disabled={isUploadingHeroVideo || isUploadingHeroImage} onClick={() => document.getElementById('hero-video').click()}>
                                            {isUploadingHeroVideo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                            Upload Video
                                        </Button>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Story Thumbnail */}
                        <div>
                            <Label>Story Thumbnail</Label>
                            <p className="text-xs text-slate-500 mt-0.5 mb-2">
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
                            <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" id="story-thumbnail" />
                            <label htmlFor="story-thumbnail">
                                <Button type="button" variant="outline" disabled={isUploadingThumbnail} onClick={() => document.getElementById('story-thumbnail').click()}>
                                    {isUploadingThumbnail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                    {item.thumbnail ? 'Replace Thumbnail' : 'Upload Thumbnail'}
                                </Button>
                            </label>
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
                                        <p className="text-xs text-slate-500">{routeComputeStatus}</p>
                                    )}
                                    {chapterRouteCount > 0 && !routeComputeStatus && (
                                        <p className="text-xs text-slate-500">
                                            {chapterRouteCount}/{totalChapterCount} chapters have routes
                                        </p>
                                    )}
                                </div>
                            )}
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
                        <p className="text-xs text-slate-500">
                            Select the base map style for this story. Thumbnails show the style over your story's opening location.
                        </p>
                        <div className="flex flex-col gap-4">
                            {Object.entries(MAP_STYLES_CONFIG).map(([key, style]) => {
                                const thumbLon = item.coordinates?.[1] ?? 2.3522;
                                const thumbLat = item.coordinates?.[0] ?? 48.8566;
                                const thumbZoom = Math.max(4, Math.min(item.zoom || 8, 13));
                                const thumbUrl = `https://api.mapbox.com/styles/v1/${style.owner}/${style.id}/static/${thumbLon},${thumbLat},${thumbZoom},0,0/600x280@2x?access_token=${MAPBOX_TOKEN}`;
                                const isSelected = (item.map_style || 'a') === key;
                                return (
                                    <div
                                        key={key}
                                        onClick={() => onUpdate({ ...item, map_style: key })}
                                        className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                                            isSelected
                                                ? 'border-amber-500 shadow-lg shadow-amber-500/20'
                                                : 'border-slate-200 hover:border-slate-400'
                                        }`}
                                    >
                                        <div className="relative">
                                            <img
                                                src={thumbUrl}
                                                alt={style.label}
                                                className="w-full h-44 object-cover"
                                            />
                                            {isSelected && (
                                                <div className="absolute top-2 right-2 w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center shadow-md">
                                                    <Check className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div className={`px-4 py-3 flex items-center justify-between ${isSelected ? 'bg-amber-50' : 'bg-white'}`}>
                                            <div>
                                                <span className={`text-sm font-medium block ${isSelected ? 'text-amber-700' : 'text-slate-700'}`}>
                                                    {style.label}
                                                </span>
                                                <span className="text-xs text-slate-400">{style.description}</span>
                                            </div>
                                            {isSelected && (
                                                <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Active</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                    </Card>
                    </TabsContent>

                </Tabs>
            </div>
        );
    }

    // Chapter Editor
    if (itemType === 'chapter') {
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
                onUpdate({ ...item, background_image: file_url });
            } finally {
                setIsUploadingChapterImage(false);
            }
        };

        return (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4 mt-4">
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b">
                                <h3 className="font-semibold text-slate-800">Chapter Content</h3>
                                {onDelete && (
                                    <Button 
                                        variant="destructive" 
                                        size="sm" 
                                        onClick={() => onDelete(item.id)}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" /> Delete Chapter
                                    </Button>
                                )}
                            </div>
                            <p className="text-sm text-slate-500">Chapters organize slides. The first slide defines the starting map location for this chapter.</p>
                            <div className="pt-4 border-t">
                                <Button onClick={() => onAddSlide(item.id)} className="w-full">
                                    <Plus className="w-4 h-4 mr-2" /> Add Slide to Chapter
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4 mt-4">
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            <div>
                                <Label>Chapter Name</Label>
                                <Input
                                    type="text"
                                    placeholder="e.g. Arriving in Rome"
                                    value={item.name || ''}
                                    onChange={(e) => onUpdate({ ...item, name: e.target.value })}
                                />
                                <p className="text-xs text-slate-500 mt-1">Shown as large title on the chapter card</p>
                            </div>

                            <div>
                                <Label>Chapter Description</Label>
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
                                <Label>Title Card Background Image</Label>
                                <p className="text-xs text-slate-500 mb-2">Full-bleed image shown behind the chapter title. If not set, uses the first slide's image.</p>
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
                                <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border rounded-md text-sm text-slate-600 hover:bg-slate-50 transition-colors w-fit">
                                    {isUploadingChapterImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                                    {isUploadingChapterImage ? 'Uploading...' : 'Upload Image'}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleChapterImageUpload} disabled={isUploadingChapterImage} />
                                </label>
                            </div>

                            {/* Chapter Location */}
                            <div>
                                <Label>Chapter Location</Label>
                                <p className="text-xs text-slate-500 mb-2">Sets the map view when this chapter's title card is shown</p>
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
                                />
                            </div>

                            <div>
                                <Label>Card Alignment</Label>
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
                </TabsContent>
            </Tabs>
        );
    }

    // Slide Editor
    if (itemType === 'slide') {
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
                onUpdate({ ...item, video_url: file_url });
            } finally {
                setIsUploadingVideo(false);
            }
        };



        return (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="location">Location</TabsTrigger>
                    <TabsTrigger value="media">Media</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4 mt-4">
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b">
                                <h3 className="font-semibold text-slate-800">Slide Content</h3>
                            </div>
                            <div>
                                <Label>Title</Label>
                                <Input 
                                    value={item.title || ''} 
                                    onChange={(e) => onUpdate({ ...item, title: e.target.value })}
                                    placeholder="Slide title"
                                    style={{ fontSize: '0.9rem', lineHeight: '1.2rem' }}
                                />
                            </div>
                            <div>
                                <Label>Description</Label>
                                <ReactQuill
                                    value={item.description || ''}
                                    onChange={(content) => onUpdate({ ...item, description: content })}
                                    placeholder="Slide description"
                                    className="bg-white"
                                    style={{ height: '120px', marginBottom: '50px' }}
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
                                <Label>Extended Content</Label>
                                <ReactQuill
                                    value={item.extended_content || ''}
                                    onChange={(content) => onUpdate({ ...item, extended_content: content })}
                                    placeholder="Additional detailed content (appears in fullscreen view)"
                                    className="bg-white"
                                    style={{ height: '150px', marginBottom: '50px' }}
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
                                <Label>Location Name</Label>
                                <Input 
                                    value={item.location || ''} 
                                    onChange={(e) => onUpdate({ ...item, location: e.target.value })}
                                    placeholder="e.g., Paris, France"
                                    style={{ fontSize: '0.9rem', lineHeight: '1.2rem' }}
                                />
                            </div>
                            <div>
                                <Label>Story Date</Label>
                                <Input
                                    type="date"
                                    value={item.story_date || ''}
                                    onChange={(e) => onUpdate({ ...item, story_date: e.target.value || null })}
                                />
                                {item.capture_date && (() => {
                                    const captureDay = item.capture_date.split('T')[0];
                                    return captureDay !== item.story_date ? (
                                        <p className="text-xs text-slate-500 mt-1">
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
                                <p className="text-xs text-slate-500 mt-1">The contextual date for this slide — used in the story timeline</p>
                            </div>
                            <div>
                                <Label>Card Style</Label>
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
                                <p className="text-xs text-slate-500 mt-1">Choose the visual style for this slide</p>
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
                            />
                            
                            <div className="pt-4 border-t">
                                <Label>Fly Duration (seconds)</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="60"
                                    value={item.fly_duration ?? ''}
                                    onChange={(e) => onUpdate({ ...item, fly_duration: e.target.value ? parseFloat(e.target.value) : undefined })}
                                    placeholder="8"
                                    style={{ fontSize: '0.9rem', lineHeight: '1.2rem' }}
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    How long the map takes to fly to this location. Defaults to 8 seconds.
                                </p>
                            </div>

                            <div className="pt-4 border-t">
                                <Label>Mapbox Layer ID (Optional)</Label>
                                <Input
                                    value={item.mapbox_layer_id || ''}
                                    onChange={(e) => onUpdate({ ...item, mapbox_layer_id: e.target.value })}
                                    placeholder="e.g., my-custom-layer"
                                    style={{ fontSize: '0.9rem', lineHeight: '1.2rem' }}
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Enter the ID of a Mapbox layer to display when this slide is active
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="media" className="space-y-4 mt-4">
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            {/* Image */}
                            <div>
                                <Label>Image</Label>
                                {item.image && (
                                    <div className="relative w-full h-40 rounded-lg overflow-hidden border mt-2">
                                        <img src={item.image} alt="Slide" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => onUpdate({ ...item, image: '' })}
                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="slide-image" />
                                <label htmlFor="slide-image">
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        disabled={isUploadingImage}
                                        onClick={() => document.getElementById('slide-image').click()}
                                        className="mt-2 w-full"
                                    >
                                        {isUploadingImage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                                        Upload Image
                                    </Button>
                                </label>
                            </div>

                            {/* Video */}
                            <div>
                                <Label>Video</Label>
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
                                    <Label className="text-xs">Video URL (YouTube, Vimeo, or direct link)</Label>
                                    <Input 
                                        value={item.video_url || ''} 
                                        onChange={(e) => onUpdate({ ...item, video_url: e.target.value })}
                                        placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                                        className="text-xs"
                                    />
                                </div>

                                <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" id="slide-video" />
                                <label htmlFor="slide-video">
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        disabled={isUploadingVideo}
                                        onClick={() => document.getElementById('slide-video').click()}
                                        className="mt-2 w-full"
                                    >
                                        {isUploadingVideo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Video className="w-4 h-4 mr-2" />}
                                        Upload Video
                                    </Button>
                                </label>
                            </div>

                            {/* PDF */}
                            <div>
                                <Label>PDF Document</Label>
                                {item.pdf_url ? (
                                    <div className="mt-2 p-3 bg-slate-50 rounded-lg border space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-5 h-5 text-red-600 shrink-0" />
                                                <span className="text-xs text-slate-500">PDF attached</span>
                                            </div>
                                            <button
                                                onClick={() => onUpdate({ ...item, pdf_url: '', pdf_title: '' })}
                                                className="text-red-500 hover:text-red-600"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Display Title</Label>
                                            <Input
                                                value={item.pdf_title || ''}
                                                onChange={(e) => onUpdate({ ...item, pdf_title: e.target.value })}
                                                placeholder="Short display title..."
                                                maxLength={60}
                                                className="mt-1 text-sm"
                                            />
                                            <p className="text-xs text-slate-400 mt-1">Shown in the story viewer. Saved with the slide.</p>
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
        );
    }

    return null;
}