import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import {
    ArrowLeft, Plus, Save, Trash2, ChevronUp, ChevronDown,
    Upload, Loader2, X, Layers, ExternalLink, Check, Eye, Edit2,
} from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_API_KEY || 'pk.eyJ1Ijoic3RldmVidXR0b24iLCJhIjoiNEw1T183USJ9.Sv_1qSC23JdXot8YIRPi8A';

const MAP_STYLES_CONFIG = {
    a: { label: 'Style A',         description: 'Light cartographic — white banner, amber accents', owner: 'stevebutton', id: 'clummsfw1002701mpbiw3exg7' },
    b: { label: 'Style B',         description: 'Mid-tone cartographic',                            owner: 'stevebutton', id: 'cktf8ygms085117nnzm4a97d0' },
    c: { label: 'Style C',         description: 'Dark cartographic — strong route contrast',        owner: 'stevebutton', id: 'ckn1s2y342eq018tidycnavti' },
    d: { label: 'Style D',         description: 'Mapbox Standard — dynamic lighting, 3D buildings', owner: 'stevebutton', id: 'cmm9edvor004m01sc0wyug8vz' },
    e: { label: 'Style E',         description: 'Custom style',                                     owner: 'stevebutton', id: 'cmmanazrf000f01qvaghi0jhv' },
    f: { label: 'Plouer',          description: 'Plouer cartographic — Oswald type',                owner: 'stevebutton', id: 'cmmd2lwzp001m01s24puoahpd' },
    g: { label: 'Sauri',           description: 'Sauri',                                            owner: 'stevebutton', id: 'cmmd3clf0001o01s2biib8ju2' },
    h: { label: 'SB4A',            description: 'SB4A',                                             owner: 'stevebutton', id: 'ck9i8wv640t4c1iqeiphu3soc' },
    i: { label: 'PASSMAR',         description: 'PASSMAR',                                          owner: 'stevebutton', id: 'cllw84jo600f401r7afyy7ef4' },
    j: { label: 'Cartogram',       description: 'Cartogram',                                        owner: 'stevebutton', id: 'cmmg2352g002q01s82q1d6zzo' },
    k: { label: 'PASSMAR REWORK',  description: 'PASSMAR Rework',                                   owner: 'stevebutton', id: 'cmmmcnbw5009z01sb3xf72ldy' },
    l: { label: 'World',           description: 'World overview style',                              owner: 'stevebutton', id: 'cmmuqyi1p00a501s955v9393b' },
};

const FieldLabel = ({ children }) => (
    <span className="inline-flex items-center px-8 py-[9px] rounded-full bg-slate-100 shadow-sm text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block w-fit">
        {children}
    </span>
);

export default function SeriesEditor() {
    const [allSeries,           setAllSeries]           = useState([]);
    const [selected,            setSelected]            = useState(null);
    const [episodes,            setEpisodes]            = useState([]);
    const [originalEpisodeIds,  setOriginalEpisodeIds]  = useState([]);
    const [availableStories,    setAvailableStories]    = useState([]);
    const [showAddStories,      setShowAddStories]      = useState(false);
    const [isSaving,            setIsSaving]            = useState(false);
    const [isLoading,           setIsLoading]           = useState(true);
    const [isUploadingCover,    setIsUploadingCover]    = useState(false);
    const [activeTab,           setActiveTab]           = useState('content');
    const coverFileRef = useRef(null);

    useEffect(() => { loadAllSeries(); }, []);

    // ── Data loaders ─────────────────────────────────────────────────────────

    const loadAllSeries = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('series').select('*').order('created_at');
            if (error) throw error;
            setAllSeries(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const selectSeries = async (series) => {
        setSelected({ ...series, isNew: false });
        setShowAddStories(false);
        const { data } = await supabase
            .from('stories')
            .select('id, title, subtitle, episode_number, thumbnail, hero_image, hero_type, is_published')
            .eq('series_id', series.id)
            .order('episode_number');
        const sorted = [...(data || [])].sort((a, b) => (a.episode_number ?? 999) - (b.episode_number ?? 999));
        setEpisodes(sorted);
        setOriginalEpisodeIds(sorted.map(e => e.id));
    };

    const loadAvailableStories = async () => {
        const { data } = await supabase
            .from('stories')
            .select('id, title, subtitle, thumbnail, hero_image, hero_type, series_id')
            .order('title');
        const currentIds = new Set(episodes.map(e => e.id));
        setAvailableStories((data || []).filter(s => !currentIds.has(s.id)));
        setShowAddStories(true);
    };

    // ── Episode management ────────────────────────────────────────────────────

    const addEpisode = (story) => {
        setEpisodes(prev => [...prev, { ...story, episode_number: prev.length + 1 }]);
        setAvailableStories(prev => prev.filter(s => s.id !== story.id));
    };

    const removeEpisode = (id) => {
        setEpisodes(prev => prev.filter(e => e.id !== id));
        setShowAddStories(false);
    };

    const moveEpisode = (index, direction) => {
        const next = [...episodes];
        const target = index + direction;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        setEpisodes(next);
    };

    // ── Cover image upload ────────────────────────────────────────────────────

    const uploadCover = async (file) => {
        setIsUploadingCover(true);
        try {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            // Use root-level path (no subfolder) to match the bucket's upload policy
            const filePath = `${Date.now()}-series-${safeName}`;
            const { data, error } = await supabase.storage
                .from('media')
                .upload(filePath, file, { contentType: file.type, upsert: false });
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(data.path);

            // Update local state so the preview renders immediately
            setSelected(prev => ({ ...prev, cover_image: publicUrl }));

            // Also persist to the DB immediately if this is an existing series
            // (new series: the cover_image will be included when the user clicks Save)
            if (selected?.id && !selected?.isNew) {
                const { error: dbErr } = await supabase
                    .from('series')
                    .update({ cover_image: publicUrl })
                    .eq('id', selected.id);
                if (dbErr) throw dbErr;
                toast.success('Cover image saved');
            }
        } catch (err) {
            console.error('Cover upload error:', err);
            toast.error(`Upload failed: ${err.message || err}`);
        } finally {
            setIsUploadingCover(false);
        }
    };

    // ── Save ─────────────────────────────────────────────────────────────────

    const save = async () => {
        if (!selected?.title?.trim()) { toast.error('Series title is required'); return; }
        setIsSaving(true);
        try {
            const { isNew, ...rest } = selected;
            let seriesId = rest.id;

            const payload = {
                title:        rest.title,
                subtitle:     rest.subtitle     || '',
                description:  rest.description  || '',
                cover_image:  rest.cover_image  || null,
                category:     rest.category     || null,
                is_published: rest.is_published || false,
                map_style:    rest.map_style  || 'a',
                map_lat:      rest.map_lat    ?? 20,
                map_lng:      rest.map_lng    ?? 20,
                map_zoom:     rest.map_zoom   ?? 2,
                updated_at:   new Date().toISOString(),
            };

            if (isNew) {
                const { data, error } = await supabase.from('series').insert(payload).select().single();
                if (error) throw error;
                seriesId = data.id;
                setSelected(prev => ({ ...prev, id: seriesId, isNew: false }));
            } else {
                const { error } = await supabase.from('series').update(payload).eq('id', seriesId);
                if (error) throw error;
            }

            // Assign / reorder episodes
            for (let i = 0; i < episodes.length; i++) {
                await supabase.from('stories')
                    .update({ series_id: seriesId, episode_number: i + 1 })
                    .eq('id', episodes[i].id);
            }

            // Unassign removed episodes
            const currentIds = new Set(episodes.map(e => e.id));
            const removed = originalEpisodeIds.filter(id => !currentIds.has(id));
            if (removed.length > 0) {
                await supabase.from('stories')
                    .update({ series_id: null, episode_number: null })
                    .in('id', removed);
            }

            setOriginalEpisodeIds(episodes.map(e => e.id));
            await loadAllSeries();
            toast.success('Series saved');
        } catch (err) {
            console.error('Series save error:', err);
            toast.error(`Save failed: ${err.message || JSON.stringify(err)}`);
        } finally {
            setIsSaving(false);
        }
    };

    const deleteSeries = async (id) => {
        if (!confirm('Delete this series? Stories will be unassigned but not deleted.')) return;
        await supabase.from('stories').update({ series_id: null, episode_number: null }).eq('series_id', id);
        await supabase.from('series').delete().eq('id', id);
        setSelected(null);
        setEpisodes([]);
        setOriginalEpisodeIds([]);
        await loadAllSeries();
        toast.success('Series deleted');
    };

    const createNew = () => {
        setSelected({ id: null, title: '', subtitle: '', description: '', cover_image: null, category: '', is_published: false, isNew: true });
        setEpisodes([]);
        setOriginalEpisodeIds([]);
        setShowAddStories(false);
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">

            {/* Header */}
            <div className="bg-white border-b flex-shrink-0">
                <div className="bg-slate-100 px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to={createPageUrl('HomePageView')}>
                                <img
                                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/af03c100d_storyline-logo.png"
                                    alt="Storylines"
                                    width="200"
                                    height="80"
                                    className="hover:opacity-80 transition-opacity cursor-pointer"
                                />
                            </Link>
                            <div>
                                <h1 className="text-slate-800 text-4xl font-bold">Series Manager</h1>
                                <p className="text-slate-500 mt-1">Create and organise your story series</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link
                                to={createPageUrl('Stories')}
                                className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors flex items-center gap-1"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Story Library
                            </Link>
                            {selected?.id && !selected.isNew && (
                                <Link
                                    to={`${createPageUrl('SeriesView')}?id=${selected.id}`}
                                    target="_blank"
                                    className="text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors flex items-center gap-1"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    View Series Page
                                </Link>
                            )}
                            {selected && (
                                <Button
                                    onClick={save}
                                    disabled={isSaving}
                                    className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
                                >
                                    {isSaving
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <Save className="w-4 h-4" />}
                                    Save Series
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 132px)' }}>

                {/* ── Left sidebar ── */}
                <div className="w-72 border-r bg-white flex flex-col flex-shrink-0">
                    <div className="p-4 border-b flex items-center justify-between">
                        <span className="font-medium text-slate-700">Series</span>
                        <Button
                            size="sm"
                            onClick={createNew}
                            className="bg-amber-600 hover:bg-amber-700 text-white h-7 gap-1"
                        >
                            <Plus className="w-3.5 h-3.5" /> New
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                            </div>
                        ) : allSeries.length === 0 ? (
                            <p className="text-center text-slate-400 text-sm py-12 px-4">
                                No series yet.<br />Click New to create one.
                            </p>
                        ) : (
                            allSeries.map(s => (
                                <div
                                    key={s.id}
                                    className={`w-full border-b border-slate-100 transition-colors ${
                                        selected?.id === s.id ? 'bg-amber-50 border-l-4 border-l-amber-500' : 'hover:bg-slate-50'
                                    }`}
                                >
                                    {/* Clickable area — selects series */}
                                    <div
                                        onClick={() => selectSeries(s)}
                                        className="cursor-pointer"
                                    >
                                        {s.cover_image ? (
                                            <div className="w-full h-40 overflow-hidden">
                                                <img src={s.cover_image} alt="" className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="w-full h-40 bg-slate-200" />
                                        )}
                                        <div className="flex items-center gap-2 px-4 py-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-slate-800 text-sm truncate">
                                                    {s.title || 'Untitled'}
                                                </div>
                                                {s.subtitle && (
                                                    <div className="text-xs text-slate-400 truncate">{s.subtitle}</div>
                                                )}
                                            </div>
                                            {s.is_published && (
                                                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Published" />
                                            )}
                                        </div>
                                    </div>
                                    {/* Edit / View button row */}
                                    <div className="flex items-stretch gap-0 border-t border-slate-100 overflow-hidden">
                                        <button
                                            onClick={() => selectSeries(s)}
                                            className="flex-1 h-[42px] bg-blue-50 hover:bg-blue-100 transition-colors flex flex-col items-center justify-center"
                                        >
                                            <Edit2 className="w-3.5 h-3.5 text-blue-600 mb-0.5" />
                                            <span className="text-xs text-blue-700 font-semibold">Edit</span>
                                        </button>
                                        <a
                                            href={createPageUrl('SeriesView') + '?id=' + s.id}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex-1 h-[42px] bg-green-50 hover:bg-green-100 transition-colors flex flex-col items-center justify-center border-l border-white"
                                        >
                                            <Eye className="w-3.5 h-3.5 text-green-600 mb-0.5" />
                                            <span className="text-xs text-green-700 font-semibold">View</span>
                                        </a>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ── Right panel ── */}
                <div className="flex-1 overflow-y-auto">
                    {!selected ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                            <Layers className="w-12 h-12 mb-4 opacity-30" />
                            <p className="text-lg font-medium">Select a series or create a new one</p>
                        </div>
                    ) : (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">

                            {/* Tab pills + delete */}
                            <div className="bg-slate-50 border-b px-8 py-4 flex items-center justify-between flex-shrink-0">
                                <div className="flex flex-wrap gap-[30px]">
                                    {[
                                        { value: 'content', label: 'Content' },
                                        { value: 'map',     label: 'Map' },
                                        { value: 'stories', label: `Stories (${episodes.length})` },
                                    ].map(({ value, label }) => (
                                        <button
                                            key={value}
                                            onClick={() => setActiveTab(value)}
                                            className={`inline-flex items-center px-5 py-2 rounded-full shadow-md text-xl font-bold tracking-tight transition-all ${
                                                activeTab === value ? 'bg-amber-600 text-white' : 'bg-white text-slate-800 hover:brightness-95'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                {!selected.isNew && (
                                    <button
                                        onClick={() => deleteSeries(selected.id)}
                                        className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete Series
                                    </button>
                                )}
                            </div>

                            {/* ── Content tab ── */}
                            <TabsContent value="content" className="flex-1 overflow-y-auto mt-0">
                                <div className="p-8">
                                    <Card>
                                        <CardContent className="pt-6 space-y-5">
                                            <div>
                                                <FieldLabel>Title *</FieldLabel>
                                                <Input
                                                    value={selected.title}
                                                    onChange={e => setSelected(p => ({ ...p, title: e.target.value }))}
                                                    placeholder="Series title"
                                                />
                                            </div>
                                            <div>
                                                <FieldLabel>Subtitle</FieldLabel>
                                                <Input
                                                    value={selected.subtitle || ''}
                                                    onChange={e => setSelected(p => ({ ...p, subtitle: e.target.value }))}
                                                    placeholder="Brief series tagline"
                                                />
                                            </div>
                                            <div>
                                                <FieldLabel>Description</FieldLabel>
                                                <Textarea
                                                    value={selected.description || ''}
                                                    onChange={e => setSelected(p => ({ ...p, description: e.target.value }))}
                                                    placeholder="What is this series about?"
                                                    rows={4}
                                                    className="resize-none"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <FieldLabel>Category</FieldLabel>
                                                    <Input
                                                        value={selected.category || ''}
                                                        onChange={e => setSelected(p => ({ ...p, category: e.target.value }))}
                                                        placeholder="e.g. climate, education"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-3 pt-8">
                                                    <Switch
                                                        checked={selected.is_published || false}
                                                        onCheckedChange={v => setSelected(p => ({ ...p, is_published: v }))}
                                                    />
                                                    <Label className="text-sm cursor-pointer">Published</Label>
                                                </div>
                                            </div>
                                            <div>
                                                <FieldLabel>Cover Image</FieldLabel>
                                                {selected.cover_image && (
                                                    <div className="mb-3 rounded-xl overflow-hidden border border-slate-200" style={{ height: 220 }}>
                                                        <img src={selected.cover_image} alt="Cover" className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        ref={coverFileRef}
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={e => e.target.files[0] && uploadCover(e.target.files[0])}
                                                    />
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => coverFileRef.current?.click()}
                                                        disabled={isUploadingCover}
                                                        className="gap-2"
                                                    >
                                                        {isUploadingCover
                                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                                            : <Upload className="w-4 h-4" />}
                                                        {selected.cover_image ? 'Replace Cover Image' : 'Upload Cover Image'}
                                                    </Button>
                                                    {selected.cover_image && (
                                                        <button
                                                            onClick={() => setSelected(p => ({ ...p, cover_image: null }))}
                                                            className="text-slate-400 hover:text-slate-600 transition-colors"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            {/* ── Map tab ── */}
                            <TabsContent value="map" className="flex-1 overflow-y-auto mt-0">
                                <div className="p-8 space-y-6">
                                    <Card>
                                        <CardContent className="pt-6 space-y-4">
                                            <FieldLabel>Map Position</FieldLabel>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <Label className="text-xs text-slate-400 mb-1 block">Latitude</Label>
                                                    <Input
                                                        type="number"
                                                        value={selected.map_lat ?? 20}
                                                        onChange={e => setSelected(p => ({ ...p, map_lat: parseFloat(e.target.value) || 0 }))}
                                                        step="0.1"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-slate-400 mb-1 block">Longitude</Label>
                                                    <Input
                                                        type="number"
                                                        value={selected.map_lng ?? 20}
                                                        onChange={e => setSelected(p => ({ ...p, map_lng: parseFloat(e.target.value) || 0 }))}
                                                        step="0.1"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-slate-400 mb-1 block">Zoom</Label>
                                                    <Input
                                                        type="number"
                                                        value={selected.map_zoom ?? 2}
                                                        onChange={e => setSelected(p => ({ ...p, map_zoom: parseFloat(e.target.value) || 2 }))}
                                                        min="0" max="20" step="0.5"
                                                    />
                                                </div>
                                            </div>
                                            {/* Live preview */}
                                            {(() => {
                                                const style = MAP_STYLES_CONFIG[selected.map_style || 'a'];
                                                const lat   = selected.map_lat  ?? 20;
                                                const lng   = selected.map_lng  ?? 20;
                                                const zoom  = selected.map_zoom ?? 2;
                                                const url   = `https://api.mapbox.com/styles/v1/${style.owner}/${style.id}/static/${lng},${lat},${zoom}/800x300@2x?access_token=${MAPBOX_TOKEN}`;
                                                return (
                                                    <img
                                                        key={url}
                                                        src={url}
                                                        alt="Map preview"
                                                        className="w-full rounded-lg border border-slate-200"
                                                        style={{ height: 200, objectFit: 'cover' }}
                                                    />
                                                );
                                            })()}
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="pt-6 space-y-4">
                                            <FieldLabel>Map Style</FieldLabel>
                                            <div className="flex flex-col gap-3">
                                                {Object.entries(MAP_STYLES_CONFIG).map(([key, style]) => {
                                                    const lat  = selected.map_lat  ?? 20;
                                                    const lng  = selected.map_lng  ?? 20;
                                                    const zoom = selected.map_zoom ?? 2;
                                                    const thumbUrl = `https://api.mapbox.com/styles/v1/${style.owner}/${style.id}/static/${lng},${lat},${zoom}/600x220@2x?access_token=${MAPBOX_TOKEN}`;
                                                    const isActive = (selected.map_style || 'a') === key;
                                                    return (
                                                        <div
                                                            key={key}
                                                            onClick={() => setSelected(p => ({ ...p, map_style: key }))}
                                                            className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all flex ${
                                                                isActive
                                                                    ? 'border-amber-500 shadow-lg shadow-amber-500/20'
                                                                    : 'border-slate-200 hover:border-slate-400'
                                                            }`}
                                                        >
                                                            <div className="relative flex-shrink-0 w-[200px]">
                                                                <img src={thumbUrl} alt={style.label} className="w-full h-[100px] object-cover" />
                                                                {isActive && (
                                                                    <div className="absolute top-2 right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-md">
                                                                        <Check className="w-3.5 h-3.5 text-white" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className={`flex-1 px-4 py-3 flex flex-col justify-center ${isActive ? 'bg-amber-50' : 'bg-white'}`}>
                                                                <span className={`text-sm font-semibold block mb-1 ${isActive ? 'text-amber-600' : 'text-slate-800'}`}>
                                                                    {style.label}
                                                                </span>
                                                                <span className="text-xs text-slate-500">{style.description}</span>
                                                                {isActive && (
                                                                    <span className="mt-2 text-xs font-medium text-amber-600 bg-amber-500/20 px-2 py-0.5 rounded-full w-fit">Active</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            {/* ── Stories tab ── */}
                            <TabsContent value="stories" className="flex-1 overflow-y-auto mt-0">
                                <div className="p-8">
                                    <Card>
                                        <CardContent className="pt-6 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <FieldLabel>Episodes ({episodes.length})</FieldLabel>
                                                <Button
                                                    variant="outline"
                                                    onClick={showAddStories ? () => setShowAddStories(false) : loadAvailableStories}
                                                    className="gap-1.5"
                                                >
                                                    <Plus className="w-4 h-4" /> Add Stories
                                                </Button>
                                            </div>

                                            {episodes.length === 0 ? (
                                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400">
                                                    No episodes assigned yet.<br />Click "Add Stories" to begin.
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {episodes.map((ep, i) => (
                                                        <div
                                                            key={ep.id}
                                                            className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3"
                                                        >
                                                            <span className="text-sm font-mono text-amber-600 w-6 text-center flex-shrink-0">
                                                                {i + 1}
                                                            </span>
                                                            {(ep.thumbnail || ep.hero_image) && (
                                                                <a
                                                                    href={createPageUrl('StoryMapView') + '?id=' + ep.id}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="group/epthumb relative w-40 h-24 rounded-lg overflow-hidden flex-shrink-0 block"
                                                                    title="View story"
                                                                >
                                                                    <img
                                                                        src={ep.thumbnail || ep.hero_image}
                                                                        alt=""
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/epthumb:opacity-100 transition-opacity rounded-lg">
                                                                        <Eye className="w-5 h-5 text-white" />
                                                                    </div>
                                                                </a>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-sm font-medium text-slate-800 truncate">
                                                                    {ep.title || 'Untitled'}
                                                                </div>
                                                                {ep.subtitle && (
                                                                    <div className="text-xs text-slate-400 truncate">{ep.subtitle}</div>
                                                                )}
                                                            </div>
                                                            <span
                                                                className={`w-2 h-2 rounded-full flex-shrink-0 ${ep.is_published ? 'bg-green-500' : 'bg-amber-400'}`}
                                                                title={ep.is_published ? 'Published' : 'Draft'}
                                                            />
                                                            <div className="flex items-center gap-0.5 flex-shrink-0">
                                                                <button
                                                                    onClick={() => moveEpisode(i, -1)}
                                                                    disabled={i === 0}
                                                                    className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-25 transition-colors"
                                                                    aria-label="Move up"
                                                                >
                                                                    <ChevronUp className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => moveEpisode(i, 1)}
                                                                    disabled={i === episodes.length - 1}
                                                                    className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-25 transition-colors"
                                                                    aria-label="Move down"
                                                                >
                                                                    <ChevronDown className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => removeEpisode(ep.id)}
                                                                    className="p-1.5 text-slate-400 hover:text-red-500 ml-1 transition-colors"
                                                                    aria-label="Remove from series"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Add stories panel */}
                                            {showAddStories && (
                                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                                    <div className="px-4 py-3 bg-slate-50 border-b flex items-center justify-between">
                                                        <span className="text-sm font-medium text-slate-600">Available Stories</span>
                                                        <button
                                                            onClick={() => setShowAddStories(false)}
                                                            className="text-slate-400 hover:text-slate-600 transition-colors"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    {availableStories.length === 0 ? (
                                                        <p className="p-6 text-center text-sm text-slate-400">
                                                            All stories are already in this series.
                                                        </p>
                                                    ) : (
                                                        <div className="p-4 grid grid-cols-3 gap-4">
                                                            {availableStories.map(story => (
                                                                <button
                                                                    key={story.id}
                                                                    onClick={() => addEpisode(story)}
                                                                    className="group relative rounded-xl overflow-hidden border border-slate-200 hover:border-amber-400 transition-colors text-left"
                                                                >
                                                                    <div className="w-full h-28 bg-slate-200 overflow-hidden">
                                                                        {(story.thumbnail || story.hero_image) ? (
                                                                            <img
                                                                                src={story.thumbnail || story.hero_image}
                                                                                alt=""
                                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                                            />
                                                                        ) : (
                                                                            <div className="w-full h-full bg-slate-200" />
                                                                        )}
                                                                    </div>
                                                                    <div className="p-2">
                                                                        <div className="text-xs font-medium text-slate-800 truncate leading-snug">
                                                                            {story.title || 'Untitled'}
                                                                        </div>
                                                                        {story.series_id && story.series_id !== selected.id && (
                                                                            <div className="text-xs text-amber-500">In another series</div>
                                                                        )}
                                                                    </div>
                                                                    <div className="absolute top-2 right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">
                                                                        <Plus className="w-3.5 h-3.5 text-white" />
                                                                    </div>
                                                                    <a
                                                                        href={createPageUrl('StoryMapView') + '?id=' + story.id}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        onClick={e => e.stopPropagation()}
                                                                        className="absolute top-2 left-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                                                                        title="View story"
                                                                    >
                                                                        <Eye className="w-3.5 h-3.5 text-white" />
                                                                    </a>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            </div>
        </div>
    );
}
