import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Image, AlignLeft, Globe, Palette, PanelBottom, Save, Upload, Loader2, Check, Info } from 'lucide-react';
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
    footer_col1: '',
    footer_col2: '',
    footer_col3: '',
    map_style: 'a',
    // Info / About panel
    about_org_name: '',
    about_logo_url: null,
    about_who_we_are: '',
    about_what_we_do: '',
    about_website: '',
    about_email: '',
};

export default function HomePageEditor() {
    const [hp, setHp] = useState(DEFAULT_HP);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeSection, setActiveSection] = useState('hero');
    const [isUploadingHero, setIsUploadingHero] = useState(false);
    const [isUploadingOverviewBg, setIsUploadingOverviewBg] = useState(false);
    const [isUploadingAboutLogo, setIsUploadingAboutLogo] = useState(false);
    const heroFileRef = useRef(null);
    const overviewBgFileRef = useRef(null);
    const aboutLogoFileRef = useRef(null);

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

    const FieldLabel = ({ children }) => (
        <span className="inline-flex items-center px-8 py-[9px] rounded-full bg-slate-100 shadow-sm text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block w-fit">
            {children}
        </span>
    );

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-slate-900 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
                <div className="flex items-center gap-4">
                    <Link
                        to={createPageUrl('Stories')}
                        className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1 text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Stories
                    </Link>
                    <span className="text-slate-700">|</span>
                    <h1 className="text-lg font-semibold text-slate-900">Home Page Editor</h1>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to={createPageUrl('HomePageView')}
                        className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
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
                <div className="w-64 border-r border-slate-200 bg-slate-50 flex-shrink-0 p-4 space-y-2">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-3 px-2">Sections</p>

                    {/* Hero */}
                    <button
                        onClick={() => setActiveSection('hero')}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left ${
                            activeSection === 'hero'
                                ? 'bg-amber-50 border-l-2 border-amber-500 pl-[10px]'
                                : 'hover:bg-slate-100'
                        }`}
                    >
                        <Image className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <span className="text-sm font-medium">Hero</span>
                    </button>

                    {/* Overview */}
                    <button
                        onClick={() => setActiveSection('overview')}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left ${
                            activeSection === 'overview'
                                ? 'bg-amber-50 border-l-2 border-amber-500 pl-[10px]'
                                : 'hover:bg-slate-100'
                        }`}
                    >
                        <AlignLeft className="w-4 h-4 text-slate-500 flex-shrink-0" />
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
                                ? 'bg-amber-50 border-l-2 border-amber-500 pl-[10px]'
                                : 'hover:bg-slate-100'
                        }`}
                    >
                        <Globe className="w-4 h-4 text-slate-500 flex-shrink-0" />
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
                                ? 'bg-amber-50 border-l-2 border-amber-500 pl-[10px]'
                                : 'hover:bg-slate-100'
                        }`}
                    >
                        <PanelBottom className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <span className="text-sm font-medium flex-1">Footer</span>
                        <Switch
                            checked={hp.footer_enabled}
                            onCheckedChange={(v) => set('footer_enabled', v)}
                            onClick={(e) => e.stopPropagation()}
                            className="scale-75"
                        />
                    </button>

                    {/* Info */}
                    <button
                        onClick={() => setActiveSection('info')}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left ${
                            activeSection === 'info'
                                ? 'bg-amber-50 border-l-2 border-amber-500 pl-[10px]'
                                : 'hover:bg-slate-100'
                        }`}
                    >
                        <Info className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <span className="text-sm font-medium flex-1">Info Panel</span>
                    </button>

                    {/* Style */}
                    <button
                        onClick={() => setActiveSection('style')}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left ${
                            activeSection === 'style'
                                ? 'bg-amber-50 border-l-2 border-amber-500 pl-[10px]'
                                : 'hover:bg-slate-100'
                        }`}
                    >
                        <Palette className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <span className="text-sm font-medium flex-1">Map Style</span>
                        <span className="text-xs text-amber-400 font-mono uppercase">{hp.map_style || 'a'}</span>
                    </button>
                </div>

                {/* Right panel */}
                <div className="flex-1 overflow-y-auto p-8">
                    {activeSection === 'hero' && (
                        <div className="max-w-2xl space-y-6">
                            <h2 className="text-xl font-semibold text-slate-900 mb-6">Hero Section</h2>

                            <div className="space-y-2">
                                <FieldLabel>Title</FieldLabel>
                                <Input
                                    value={hp.hero_title || ''}
                                    onChange={(e) => set('hero_title', e.target.value)}
                                    placeholder="Enter hero title"
                                    className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                                />
                            </div>

                            <div className="space-y-2">
                                <FieldLabel>Subtitle</FieldLabel>
                                <Textarea
                                    value={hp.hero_subtitle || ''}
                                    onChange={(e) => set('hero_subtitle', e.target.value)}
                                    placeholder="Enter hero subtitle"
                                    rows={3}
                                    className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                                />
                            </div>

                            <div className="space-y-2">
                                <FieldLabel>Hero Type</FieldLabel>
                                <Select value={hp.hero_type || 'image'} onValueChange={(v) => set('hero_type', v)}>
                                    <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="image">Image</SelectItem>
                                        <SelectItem value="video">Video</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <FieldLabel>Hero Image</FieldLabel>
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
                                        className="border-slate-300 text-slate-600 hover:bg-slate-50"
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
                                        <FieldLabel>Hero Video URL</FieldLabel>
                                        <Input
                                            value={hp.hero_video || ''}
                                            onChange={(e) => set('hero_video', e.target.value)}
                                            placeholder="https://..."
                                            className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600">Loop Video</span>
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
                                <h2 className="text-xl font-semibold text-slate-900">Overview Section</h2>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-600">Enabled</span>
                                    <Switch
                                        checked={hp.overview_enabled}
                                        onCheckedChange={(v) => set('overview_enabled', v)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <FieldLabel>Heading</FieldLabel>
                                <Input
                                    value={hp.overview_heading || ''}
                                    onChange={(e) => set('overview_heading', e.target.value)}
                                    placeholder="Overview"
                                    className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                                />
                            </div>

                            <div className="space-y-2">
                                <FieldLabel>Body Text</FieldLabel>
                                <div className="rounded-lg overflow-hidden border border-slate-200">
                                    <ReactQuill
                                        value={hp.overview_body || ''}
                                        onChange={(v) => set('overview_body', v)}
                                        theme="snow"
                                        placeholder="Enter overview body text..."
                                        className="bg-white"
                                        style={{ marginBottom: '42px' }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <FieldLabel>Background Image</FieldLabel>
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
                                        className="border-slate-300 text-slate-600 hover:bg-slate-50"
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
                            <h2 className="text-xl font-semibold text-slate-900 mb-2">Map Style</h2>
                            <p className="text-sm text-slate-500 mb-6">
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
                                                    : 'border-slate-200 hover:border-slate-400'
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
                                            <div className={`flex-1 px-4 py-3 flex flex-col justify-center ${isSelected ? 'bg-amber-50' : 'bg-white'}`}>
                                                <span className={`text-sm font-semibold block mb-1 ${isSelected ? 'text-amber-600' : 'text-slate-800'}`}>
                                                    {style.label}
                                                </span>
                                                <span className="text-xs text-slate-500">{style.description}</span>
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
                        <div className="max-w-4xl space-y-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-900">Footer</h2>
                                    <p className="text-xs text-slate-500 mt-1">Three columns on a black background — 400px tall</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-600">Enabled</span>
                                    <Switch
                                        checked={hp.footer_enabled}
                                        onCheckedChange={(v) => set('footer_enabled', v)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-6">
                                {[
                                    { key: 'footer_col1', label: 'Column 1', placeholder: 'e.g. Organisation name, description...' },
                                    { key: 'footer_col2', label: 'Column 2', placeholder: 'e.g. Navigation links...' },
                                    { key: 'footer_col3', label: 'Column 3', placeholder: 'e.g. © 2024 Contact details...' },
                                ].map(({ key, label, placeholder }) => (
                                    <div key={key} className="space-y-2">
                                        <FieldLabel>{label}</FieldLabel>
                                        <div className="rounded-lg overflow-hidden border border-slate-200">
                                            <ReactQuill
                                                value={hp[key] || ''}
                                                onChange={(v) => set(key, v)}
                                                theme="snow"
                                                placeholder={placeholder}
                                                className="bg-white"
                                        style={{ marginBottom: '42px' }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeSection === 'info' && (
                        <div className="max-w-2xl space-y-6">
                            <div className="mb-6">
                                <h2 className="text-xl font-semibold text-slate-900">Info Panel</h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    Shown when the visitor clicks the Info button in the banner. Leave blank to hide the button.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <FieldLabel>Organisation Name</FieldLabel>
                                <Input
                                    value={hp.about_org_name || ''}
                                    onChange={(e) => set('about_org_name', e.target.value)}
                                    placeholder="Your Organisation"
                                    className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                                />
                            </div>

                            <div className="space-y-2">
                                <FieldLabel>Organisation Logo</FieldLabel>
                                {hp.about_logo_url && (
                                    <div className="relative w-40 h-20 rounded-lg overflow-hidden mb-2 bg-slate-100 flex items-center justify-center">
                                        <img src={hp.about_logo_url} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <input
                                        ref={aboutLogoFileRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) uploadImage(file, 'about_logo_url', setIsUploadingAboutLogo);
                                            e.target.value = '';
                                        }}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => aboutLogoFileRef.current?.click()}
                                        disabled={isUploadingAboutLogo}
                                        className="border-slate-300 text-slate-600 hover:bg-slate-50"
                                    >
                                        {isUploadingAboutLogo
                                            ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            : <Upload className="w-4 h-4 mr-2" />}
                                        Upload Logo
                                    </Button>
                                    {hp.about_logo_url && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => set('about_logo_url', null)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <FieldLabel>Who We Are</FieldLabel>
                                <div className="rounded-lg overflow-hidden border border-slate-200">
                                    <ReactQuill
                                        value={hp.about_who_we_are || ''}
                                        onChange={(v) => set('about_who_we_are', v)}
                                        theme="snow"
                                        placeholder="Describe your organisation..."
                                        className="bg-white"
                                        style={{ marginBottom: '42px' }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <FieldLabel>What We Do</FieldLabel>
                                <div className="rounded-lg overflow-hidden border border-slate-200">
                                    <ReactQuill
                                        value={hp.about_what_we_do || ''}
                                        onChange={(v) => set('about_what_we_do', v)}
                                        theme="snow"
                                        placeholder="Describe your work..."
                                        className="bg-white"
                                        style={{ marginBottom: '42px' }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <FieldLabel>Website</FieldLabel>
                                <Input
                                    value={hp.about_website || ''}
                                    onChange={(e) => set('about_website', e.target.value)}
                                    placeholder="https://yourorganisation.org"
                                    className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                                />
                            </div>

                            <div className="space-y-2">
                                <FieldLabel>Email</FieldLabel>
                                <Input
                                    value={hp.about_email || ''}
                                    onChange={(e) => set('about_email', e.target.value)}
                                    placeholder="contact@yourorganisation.org"
                                    className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                                />
                            </div>
                        </div>
                    )}

                    {activeSection === 'globe' && (
                        <div className="max-w-2xl space-y-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-slate-900">Globe Section</h2>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-600">Enabled</span>
                                    <Switch
                                        checked={hp.globe_enabled}
                                        onCheckedChange={(v) => set('globe_enabled', v)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <FieldLabel>Banner Title</FieldLabel>
                                <p className="text-xs text-slate-500">Shown in the top bar when the globe is visible</p>
                                <Input
                                    value={hp.globe_heading || ''}
                                    onChange={(e) => set('globe_heading', e.target.value)}
                                    placeholder="Explore Our Stories"
                                    className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                                />
                            </div>

                            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-500">
                                <Globe className="w-4 h-4 inline-block mr-2 text-slate-400" />
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
