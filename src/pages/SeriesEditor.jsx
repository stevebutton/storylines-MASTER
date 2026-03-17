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
import {
    ArrowLeft, Plus, Save, Trash2, ChevronUp, ChevronDown,
    Upload, Loader2, X, Layers,
} from 'lucide-react';

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
            console.error(err);
            toast.error('Save failed');
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
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                    <Link
                        to={createPageUrl('Stories')}
                        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Stories
                    </Link>
                    <div className="w-px h-4 bg-slate-200" />
                    <div className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-amber-600" />
                        <h1 className="text-lg font-semibold text-slate-800">Series Manager</h1>
                    </div>
                </div>
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

            {/* Body */}
            <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 65px)' }}>

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
                                <button
                                    key={s.id}
                                    onClick={() => selectSeries(s)}
                                    className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                                        selected?.id === s.id ? 'bg-amber-50 border-l-4 border-l-amber-500' : ''
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-slate-800 text-sm truncate">
                                                {s.title || 'Untitled'}
                                            </div>
                                            {s.subtitle && (
                                                <div className="text-xs text-slate-400 truncate">{s.subtitle}</div>
                                            )}
                                        </div>
                                        {s.is_published && (
                                            <span className="mt-1 w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Published" />
                                        )}
                                    </div>
                                </button>
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
                        <div className="max-w-2xl mx-auto p-8 space-y-8">

                            {/* ── Series metadata ── */}
                            <div className="space-y-5">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Series Details
                                    </h2>
                                    {!selected.isNew && (
                                        <button
                                            onClick={() => deleteSeries(selected.id)}
                                            className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Delete Series
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-xs mb-1.5 block">Title *</Label>
                                        <Input
                                            value={selected.title}
                                            onChange={e => setSelected(p => ({ ...p, title: e.target.value }))}
                                            placeholder="Series title"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs mb-1.5 block">Subtitle</Label>
                                        <Input
                                            value={selected.subtitle || ''}
                                            onChange={e => setSelected(p => ({ ...p, subtitle: e.target.value }))}
                                            placeholder="Brief series tagline"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs mb-1.5 block">Description</Label>
                                        <Textarea
                                            value={selected.description || ''}
                                            onChange={e => setSelected(p => ({ ...p, description: e.target.value }))}
                                            placeholder="What is this series about?"
                                            rows={3}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-xs mb-1.5 block">Category</Label>
                                            <Input
                                                value={selected.category || ''}
                                                onChange={e => setSelected(p => ({ ...p, category: e.target.value }))}
                                                placeholder="e.g. climate, education"
                                            />
                                        </div>
                                        <div className="flex items-center gap-3 pt-5">
                                            <Switch
                                                checked={selected.is_published || false}
                                                onCheckedChange={v => setSelected(p => ({ ...p, is_published: v }))}
                                            />
                                            <Label className="text-sm cursor-pointer">Published</Label>
                                        </div>
                                    </div>

                                    {/* Cover image */}
                                    <div>
                                        <Label className="text-xs mb-1.5 block">Cover Image</Label>
                                        <div className="flex items-center gap-3">
                                            {selected.cover_image && (
                                                <div className="w-24 h-16 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                                                    <img src={selected.cover_image} alt="Cover" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            <input
                                                ref={coverFileRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={e => e.target.files[0] && uploadCover(e.target.files[0])}
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => coverFileRef.current?.click()}
                                                disabled={isUploadingCover}
                                                className="gap-2"
                                            >
                                                {isUploadingCover
                                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    : <Upload className="w-3.5 h-3.5" />}
                                                {selected.cover_image ? 'Replace' : 'Upload'}
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
                                </div>
                            </div>

                            {/* ── Episodes ── */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Episodes ({episodes.length})
                                    </h2>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={showAddStories ? () => setShowAddStories(false) : loadAvailableStories}
                                        className="gap-1.5 h-7"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Stories
                                    </Button>
                                </div>

                                {episodes.length === 0 ? (
                                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
                                        No episodes assigned yet.<br />Click "Add Stories" to begin.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {episodes.map((ep, i) => (
                                            <div
                                                key={ep.id}
                                                className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2.5"
                                            >
                                                <span className="text-xs font-mono text-amber-600 w-5 text-center flex-shrink-0">
                                                    {i + 1}
                                                </span>
                                                {(ep.thumbnail || ep.hero_image) && (
                                                    <div className="w-10 h-7 rounded overflow-hidden flex-shrink-0">
                                                        <img
                                                            src={ep.thumbnail || ep.hero_image}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
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
                                                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-25 transition-colors"
                                                        aria-label="Move up"
                                                    >
                                                        <ChevronUp className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => moveEpisode(i, 1)}
                                                        disabled={i === episodes.length - 1}
                                                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-25 transition-colors"
                                                        aria-label="Move down"
                                                    >
                                                        <ChevronDown className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => removeEpisode(ep.id)}
                                                        className="p-1 text-slate-400 hover:text-red-500 ml-1 transition-colors"
                                                        aria-label="Remove from series"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add stories panel */}
                                {showAddStories && (
                                    <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden">
                                        <div className="px-4 py-2.5 bg-slate-50 border-b flex items-center justify-between">
                                            <span className="text-xs font-medium text-slate-600">Available Stories</span>
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
                                            <div className="max-h-64 overflow-y-auto">
                                                {availableStories.map(story => (
                                                    <button
                                                        key={story.id}
                                                        onClick={() => addEpisode(story)}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 transition-colors border-b border-slate-100 last:border-0 text-left"
                                                    >
                                                        {(story.thumbnail || story.hero_image) && (
                                                            <div className="w-10 h-7 rounded overflow-hidden flex-shrink-0">
                                                                <img
                                                                    src={story.thumbnail || story.hero_image}
                                                                    alt=""
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-medium text-slate-800 truncate">
                                                                {story.title || 'Untitled'}
                                                            </div>
                                                            {story.series_id && story.series_id !== selected.id && (
                                                                <div className="text-xs text-amber-500">
                                                                    Currently in another series
                                                                </div>
                                                            )}
                                                        </div>
                                                        <Plus className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
