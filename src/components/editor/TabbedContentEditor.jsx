import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, X, MapPin, FileText, Video, Image as ImageIcon, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import EmbeddedLocationPicker from '@/components/editor/EmbeddedLocationPicker';
import DocumentPicker from '@/components/editor/DocumentPicker';
import SlideEditor from '@/components/editor/SlideEditor';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function TabbedContentEditor({ 
    itemType, 
    item, 
    storyId,
    onUpdate,
    onDelete,
    onAddChapter,
    onAddSlide 
}) {
    const [activeTab, setActiveTab] = useState('content');
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const [isUploadingHeroImage, setIsUploadingHeroImage] = useState(false);
    const [isUploadingHeroVideo, setIsUploadingHeroVideo] = useState(false);
    const [showDocumentPicker, setShowDocumentPicker] = useState(false);

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
                const { file_url } = await base44.integrations.Core.UploadFile({ file });
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
                const { file_url } = await base44.integrations.Core.UploadFile({ file });
                onUpdate({ ...item, hero_video: file_url, hero_type: 'video' });
            } finally {
                setIsUploadingHeroVideo(false);
            }
        };

        return (
            <div className="space-y-6">
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

                        <div>
                            <Label>Map Style</Label>
                            <Select 
                                value={item.map_style || 'light'} 
                                onValueChange={(value) => onUpdate({ ...item, map_style: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="light">Light</SelectItem>
                                    <SelectItem value="dark">Dark</SelectItem>
                                    <SelectItem value="satellite">Satellite</SelectItem>
                                    <SelectItem value="terrain">Terrain</SelectItem>
                                </SelectContent>
                            </Select>
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

                        <div className="pt-4 border-t">
                            <Button onClick={onAddChapter} className="w-full">
                                <Plus className="w-4 h-4 mr-2" /> Add Chapter
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Chapter Editor
    if (itemType === 'chapter') {
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
                                <Label>Chapter Name (optional)</Label>
                                <Input
                                    type="text"
                                    placeholder="Enter chapter name..."
                                    value={item.name || ''}
                                    onChange={(e) => onUpdate({ ...item, name: e.target.value.slice(0, 25) })}
                                    maxLength={25}
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    {item.name?.length || 0}/25 characters
                                </p>
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
        return (
            <SlideEditor 
                slide={item} 
                storyId={storyId} 
                chapterId={item.chapter_id}
                onUpdate={onUpdate} 
                onDelete={onDelete} 
            />
        );
    }

    return null;
}