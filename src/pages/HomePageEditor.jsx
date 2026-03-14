import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Image, AlignLeft, Globe, Palette, PanelBottom, Save, Upload, Loader2, Check } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_API_KEY || 'pk.eyJ1Ijoic3RldmVidXR0b24iLCJhIjoiNEw1T183USJ9.Sv_1qSC23JdXot8YIRPi8A';

const MAP_STYLES_CONFIG = {
    a: { label: 'Style A', description: 'Light cartographic — white banner, amber accents', owner: 'stevebutton', id: 'clummsfw1002701mpbiw3exg7' },
    b: { label: 'Style B', description: 'Mid-tone cartographic', owner: 'stevebutton', id: 'cktf8ygms085117nnzm4a97d0' },
    c: { label: 'Style C', description: 'Dark cartographic — Righteous type, strong route contrast', owner: 'stevebutton', id: 'ckn1s2y342eq018tidycnavti' },
    d: { label: 'Style D', description: 'Mapbox Standard — dynamic lighting, 3D buildings', owner: 'stevebutton', id: 'cmm9edvor004m01sc0wyug8vz' },
    e: { label: 'Style E', description: 'Custom style', owner: 'stevebutton', id: 'cmmanazrf000f01qvaghi0jhv' },
    f: { label: 'Plouer', description: 'Plouer cartographic — Oswald type', owner: 'stevebutton', id: 'cmmd2lwzp001m01s24puoahpd' },
    g: { label: 'Sauri', description: 'Sauri', owner: 'stevebutton', id: 'cmmd3clf0001o01s2biib8ju2' },
    h: { label: 'SB4A', description: 'SB4A', owner: 'stevebutton', id: 'ck9i8wv640t4c1iqeiphu3soc' },
    i: { label: 'PASSMAR', description: 'PASSMAR', owner: 'stevebutton', id: 'cllw84jo600f401r7afyy7ef4' },
    j: { label: 'Cartogram', description: 'Cartogram', owner: 'stevebutton', id: 'cmmg2352g002q01s82q1d6zzo' },
    k: { label: 'PASSMAR REWORK', description: 'PASSMAR Rework', owner: 'stevebutton', id: 'cmmmcnbw5009z01sb3xf72ldy' },
};

const DEFAULT_HP = {
    id: 1,
    hero_title: '',
    hero_subtitle: '',
    hero_image: null,
    hero_video: null,
    hero_type: 'image',
    hero_video_loop: true,
    overview_enabled: true,
    overview_heading: 'Overview',
    overview_body: '',
    overview_bg_image: null,
    globe_enabled: true,
    globe_heading: 'Explore Our Stories',
    footer_enabled: true,
    footer_content: '',
    map_style: 'a',
};

export default function HomePageEditor() {
    const [hp, setHp] = useState(DEFAULT_HP);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeSection, setActiveSection] = useState('hero');
    const [isUploadingHero, setIsUploadingHero] = useState(false);
    const [isUploadingOverviewBg, setIsUploadingOverviewBg] = useState(false);
    const heroFileRef = useRef(null);
    const overviewBgFileRef = useRef(null);

    useEffect(() => {
        loadHomepage();
    }, []);

    const loadHomepage = async () => {
        try {
            const { data, error } = await supabase.from('homepage').select('*').eq('id', 1).single();
            if (error && error.code !== 'PGRST116') throw error;
            if (data) setHp({ ...DEFAULT_HP, ...data });
        } catch (error) {
            console.error('Failed to load homepage:', error);
            toast.error('Could not load homepage config');
        } finally {
            setIsLoading(false);
        }
    };

    const save = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('homepage')
                .upsert({ ...hp, id: 1, updated_at: new Date().toISOString() });
            if (error) throw error;
            toast.success('Homepage saved');
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Failed to save homepage');
        } finally {
            setIsSaving(false);
        }
    };

    const uploadImage = async (file, fieldKey, setUploading) => {
        setUploading(true);
        try {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const filePath = `${crypto.randomUUID().replace(/-/g, '').substring(0, 24)}-${safeName}`;
            const { error: uploadError } = await supabase.storage
                .from('media')
                .upload(filePath, file, { contentType: file.type, upsert: false });
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
            setHp(prev => ({ ...prev, [fieldKey]: publicUrl }));
            toast.success('Image uploaded');
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const set = (key, value) => setHp(prev => ({ ...prev, [key]: value }));

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800">
                <div className="flex items-center gap-4">
                    <Link
                        to={createPageUrl('Stories')}
                        className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Stories
                    </Link>
                    <span className="text-slate-600">|</span>
                    <h1 className="text-lg font-semibold text-white">Home Page Editor</h1>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to={createPageUrl('HomePageView')}
                        className="text-sm text-slate-400 hover:text-white transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        View Home Page ↗
                    </Link>
                    <Button
                        onClick={save}
                        disabled={isSaving}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save
                    </Button>
                </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 border-r border-slate-700 bg-slate-800 flex-shrink-0 p-4 space-y-2">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 px-2">Sections</p>

                    {/* Hero */}
                    <button
                        onClick={() => setActiveSection('hero')}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left ${
                            activeSection === 'hero'
                                ? 'bg-slate-700 border-l-2 border-amber-500 pl-[10px]'
                                : 'hover:bg-slate-700/50'
                        }`}
                    >
                        <Image className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-sm font-medium">Hero</span>
                    </button>

                    {/* Overview */}
                    <button
                        onClick={() => setActiveSection('overview')}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left ${
                            activeSection === 'overview'
                                ? 'bg-slate-700 border-l-2 border-amber-500 pl-[10px]'
                                : 'hover:bg-slate-700/50'
                        }`}
                    >
                        <AlignLeft className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-sm font-medium flex-1">Overview</span>
                        <Switch
                            checked={hp.overview_enabled}
                            onCheckedChange={(v) => set('overview_enabled', v)}
                            onClick={(e) => e.stopPropagation()}
                            className="scale-75"
                        />
                    </button>

                    {/* Globe */}
                    <button
                        onClick={() => setActiveSection('globe')}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left ${
                            activeSection === 'globe'
                                ? 'bg-slate-700 border-l-2 border-amber-500 pl-[10px]'
                                : 'hover:bg-slate-700/50'
                        }`}
                    >
                        <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-sm font-medium flex-1">Globe</span>
                        <Switch
                            checked={hp.globe_enabled}
                            onCheckedChange={(v) => set('globe_enabled', v)}
                            onClick={(e) => e.stopPropagation()}
                            className="scale-75"
                        />
                    </button>

                    {/* Footer */}
                    <button
                        onClick={() => setActiveSection('footer')}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left ${
                            activeSection === 'footer'
                                ? 'bg-slate-700 border-l-2 border-amber-500 pl-[10px]'
                                : 'hover:bg-slate-700/50'
                        }`}
                    >
                        <PanelBottom className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-sm font-medium flex-1">Footer</span>
                        <Switch
                            checked={hp.footer_enabled}
                            onCheckedChange={(v) => set('footer_enabled', v)}
                            onClick={(e) => e.stopPropagation()}
                            className="scale-75"
                        />
                    </button>

                    {/* Style */}
                    <button
                        onClick={() => setActiveSection('style')}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left ${
                            activeSection === 'style'
                                ? 'bg-slate-700 border-l-2 border-amber-500 pl-[10px]'
                                : 'hover:bg-slate-700/50'
                        }`}
                    >
                        <Palette className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-sm font-medium flex-1">Map Style</span>
                        <span className="text-xs text-amber-400 font-mono uppercase">{hp.map_style || 'a'}</span>
                    </button>
                </div>

                {/* Right panel */}
                <div className="flex-1 overflow-y-auto p-8">
                    {activeSection === 'hero' && (
                        <div className="max-w-2xl space-y-6">
                            <h2 className="text-xl font-semibold text-white mb-6">Hero Section</h2>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Title</Label>
                                <Input
                                    value={hp.hero_title || ''}
                                    onChange={(e) => set('hero_title', e.target.value)}
                                    placeholder="Enter hero title"
                                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Subtitle</Label>
                                <Textarea
                                    value={hp.hero_subtitle || ''}
                                    onChange={(e) => set('hero_subtitle', e.target.value)}
                                    placeholder="Enter hero subtitle"
                                    rows={3}
                                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Hero Type</Label>
                                <Select value={hp.hero_type || 'image'} onValueChange={(v) => set('hero_type', v)}>
                                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="image">Image</SelectItem>
                                        <SelectItem value="video">Video</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Hero Image</Label>
                                {hp.hero_image && (
                                    <div className="relative w-48 h-28 rounded-lg overflow-hidden mb-2">
                                        <img src={hp.hero_image} alt="Hero" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <input
                                        ref={heroFileRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) uploadImage(file, 'hero_image', setIsUploadingHero);
                                            e.target.value = '';
                                        }}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => heroFileRef.current?.click()}
                                        disabled={isUploadingHero}
                                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                    >
                                        {isUploadingHero
                                            ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            : <Upload className="w-4 h-4 mr-2" />}
                                        Upload Image
                                    </Button>
                                    {hp.hero_image && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => set('hero_image', null)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {hp.hero_type === 'video' && (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Hero Video URL</Label>
                                        <Input
                                            value={hp.hero_video || ''}
                                            onChange={(e) => set('hero_video', e.target.value)}
                                            placeholder="https://..."
                                            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label className="text-slate-300">Loop Video</Label>
                                        <Switch
                                            checked={hp.hero_video_loop !== false}
                                            onCheckedChange={(v) => set('hero_video_loop', v)}
                                        />
                                    </div>
                                </>
                            )}

                        </div>
                    )}

                    {activeSection === 'overview' && (
                        <div className="max-w-2xl space-y-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-white">Overview Section</h2>
                                <div className="flex items-center gap-2">
                                    <Label className="text-slate-300">Enabled</Label>
                                    <Switch
                                        checked={hp.overview_enabled}
                                        onCheckedChange={(v) => set('overview_enabled', v)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Heading</Label>
                                <Input
                                    value={hp.overview_heading || ''}
                                    onChange={(e) => set('overview_heading', e.target.value)}
                                    placeholder="Overview"
                                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Body Text</Label>
                                <div className="rounded-lg overflow-hidden border border-slate-600">
                                    <ReactQuill
                                        value={hp.overview_body || ''}
                                        onChange={(v) => set('overview_body', v)}
                                        theme="snow"
                                        placeholder="Enter overview body text..."
                                        style={{ background: '#1e293b', color: 'white' }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Background Image</Label>
                                {hp.overview_bg_image && (
                                    <div className="relative w-48 h-28 rounded-lg overflow-hidden mb-2">
                                        <img src={hp.overview_bg_image} alt="Overview background" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <input
                                        ref={overviewBgFileRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) uploadImage(file, 'overview_bg_image', setIsUploadingOverviewBg);
                                            e.target.value = '';
                                        }}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => overviewBgFileRef.current?.click()}
                                        disabled={isUploadingOverviewBg}
                                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                    >
                                        {isUploadingOverviewBg
                                            ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            : <Upload className="w-4 h-4 mr-2" />}
                                        Upload Background
                                    </Button>
                                    {hp.overview_bg_image && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => set('overview_bg_image', null)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'style' && (
                        <div className="max-w-2xl space-y-4">
                            <h2 className="text-xl font-semibold text-white mb-2">Map Style</h2>
                            <p className="text-sm text-slate-400 mb-6">
                                Sets the base map tiles and theme font across the whole home page.
                            </p>
                            <div className="flex flex-col gap-4">
                                {Object.entries(MAP_STYLES_CONFIG).map(([key, style]) => {
                                    const thumbUrl = `https://api.mapbox.com/styles/v1/${style.owner}/${style.id}/static/2.3522,48.8566,4,0,0/600x220@2x?access_token=${MAPBOX_TOKEN}`;
                                    const isSelected = (hp.map_style || 'a') === key;
                                    return (
                                        <div
                                            key={key}
                                            onClick={() => set('map_style', key)}
                                            className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 flex ${
                                                isSelected
                                                    ? 'border-amber-500 shadow-lg shadow-amber-500/20'
                                                    : 'border-slate-600 hover:border-slate-400'
                                            }`}
                                        >
                                            <div className="relative flex-shrink-0 w-[220px]">
                                                <img
                                                    src={thumbUrl}
                                                    alt={style.label}
                                                    className="w-full h-[110px] object-cover"
                                                />
                                                {isSelected && (
                                                    <div className="absolute top-2 right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-md">
                                                        <Check className="w-3.5 h-3.5 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`flex-1 px-4 py-3 flex flex-col justify-center ${isSelected ? 'bg-slate-700' : 'bg-slate-800'}`}>
                                                <span className={`text-sm font-semibold block mb-1 ${isSelected ? 'text-amber-400' : 'text-slate-200'}`}>
                                                    {style.label}
                                                </span>
                                                <span className="text-xs text-slate-400">{style.description}</span>
                                                {isSelected && (
                                                    <span className="mt-2 text-xs font-medium text-amber-600 bg-amber-500/20 px-2 py-0.5 rounded-full w-fit">Active</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeSection === 'footer' && (
                        <div className="max-w-2xl space-y-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-white">Footer</h2>
                                <div className="flex items-center gap-2">
                                    <Label className="text-slate-300">Enabled</Label>
                                    <Switch
                                        checked={hp.footer_enabled}
                                        onCheckedChange={(v) => set('footer_enabled', v)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Content</Label>
                                <p className="text-xs text-slate-500">Legal text, links, credits — displayed on a black background</p>
                                <div className="rounded-lg overflow-hidden border border-slate-600">
                                    <ReactQuill
                                        value={hp.footer_content || ''}
                                        onChange={(v) => set('footer_content', v)}
                                        theme="snow"
                                        placeholder="© 2024 Your Organisation. All rights reserved."
                                        style={{ background: '#1e293b', color: 'white' }}
                                    />
                                </div>
                            </div>

                            <div className="rounded-lg bg-slate-800 border border-slate-700 p-4 h-[60px] flex items-center justify-center">
                                <p className="text-xs text-slate-500 italic">Preview: 240px black footer bar</p>
                            </div>
                        </div>
                    )}

                    {activeSection === 'globe' && (
                        <div className="max-w-2xl space-y-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-white">Globe Section</h2>
                                <div className="flex items-center gap-2">
                                    <Label className="text-slate-300">Enabled</Label>
                                    <Switch
                                        checked={hp.globe_enabled}
                                        onCheckedChange={(v) => set('globe_enabled', v)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Banner Title</Label>
                                <p className="text-xs text-slate-500">Shown in the top bar when the globe is visible</p>
                                <Input
                                    value={hp.globe_heading || ''}
                                    onChange={(e) => set('globe_heading', e.target.value)}
                                    placeholder="Explore Our Stories"
                                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                                />
                            </div>

                            <div className="rounded-lg bg-slate-700/50 border border-slate-600 p-4 text-sm text-slate-400">
                                <Globe className="w-4 h-4 inline-block mr-2 text-slate-500" />
                                All published stories with map coordinates appear automatically on the globe.
                                Manage stories from the{' '}
                                <Link to={createPageUrl('Stories')} className="text-amber-400 hover:underline">
                                    Stories dashboard
                                </Link>.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
