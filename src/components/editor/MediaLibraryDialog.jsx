import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Images, Upload, Trash2, Play, Search, Loader2, X } from 'lucide-react';

const generateId = () => crypto.randomUUID().replace(/-/g, '').substring(0, 24);

export default function MediaLibraryDialog({ storyId, isOpen, onClose, mode = 'manager', accept = 'all', onSelect }) {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [selected, setSelected] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const loadItems = async () => {
        if (!storyId) return;
        setIsLoading(true);
        try {
            const { data } = await supabase
                .from('media')
                .select('*')
                .eq('story_id', storyId)
                .order('created_date', { ascending: false });
            setItems(data || []);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setSelected(null);
            setSearch('');
            setFilter('all');
            loadItems();
        }
    }, [isOpen, storyId]);

    const handleFiles = async (files) => {
        const arr = Array.from(files).filter(f => /^(image|video)\//.test(f.type));
        if (!arr.length) return;

        // If accept filter is set, filter to only matching types
        const filtered = accept === 'image'
            ? arr.filter(f => f.type.startsWith('image'))
            : accept === 'video'
            ? arr.filter(f => f.type.startsWith('video'))
            : arr;
        if (!filtered.length) return;

        setIsUploading(true);
        for (let i = 0; i < filtered.length; i++) {
            const file = filtered[i];
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const filePath = `${generateId()}-${safeName}`;
            try {
                const { error } = await supabase.storage
                    .from('media')
                    .upload(filePath, file, { contentType: file.type, upsert: false });
                if (!error) {
                    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
                    await supabase.from('media').insert({
                        id: generateId(),
                        story_id: storyId,
                        url: publicUrl,
                        filename: file.name,
                        type: file.type.startsWith('image') ? 'image' : 'video',
                        file_size: file.size,
                        created_date: new Date().toISOString(),
                    });
                }
            } catch (err) {
                console.error('Upload failed for', file.name, err);
            }
            setUploadProgress(Math.round(((i + 1) / filtered.length) * 100));
        }
        setIsUploading(false);
        setUploadProgress(0);
        loadItems();
    };

    const handleDelete = async (item) => {
        // Extract file path from URL
        const urlParts = item.url.split('/');
        const filePath = urlParts[urlParts.length - 1];
        await supabase.storage.from('media').remove([filePath]);
        await supabase.from('media').delete().eq('id', item.id);
        setItems(prev => prev.filter(i => i.id !== item.id));
        if (selected === item.url) setSelected(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    };

    // Apply filter and search
    const visibleItems = items.filter(item => {
        const typeMatch = filter === 'all' || item.type === filter;
        const searchMatch = !search || (item.filename || '').toLowerCase().includes(search.toLowerCase());
        return typeMatch && searchMatch;
    });

    const filterLabel = accept === 'image' ? 'Images' : accept === 'video' ? 'Videos' : null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent
                className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Images className="w-5 h-5 text-amber-600" />
                        Media Library
                        {filterLabel && <span className="text-sm font-normal text-slate-500">— {filterLabel} only</span>}
                    </DialogTitle>
                </DialogHeader>

                {/* Toolbar */}
                <div className="flex items-center gap-3 px-6 py-3 border-b shrink-0 flex-wrap">
                    {/* Type filter tabs */}
                    <div className="flex rounded-md border overflow-hidden text-sm">
                        {['all', 'image', 'video'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 capitalize transition-colors ${
                                    filter === f
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                {f === 'all' ? 'All' : f === 'image' ? 'Images' : 'Videos'}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative flex-1 min-w-[140px]">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by filename..."
                            className="h-8 pl-7 text-sm"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Upload button */}
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={isUploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="shrink-0"
                    >
                        {isUploading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {uploadProgress}%</>
                        ) : (
                            <><Upload className="w-4 h-4 mr-2" /> Upload</>
                        )}
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={accept === 'image' ? 'image/*' : accept === 'video' ? 'video/*' : 'image/*,video/*'}
                        className="hidden"
                        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
                    />
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {/* Drop zone hint */}
                    {isDragging && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-amber-500/10 border-2 border-dashed border-amber-500 rounded-lg pointer-events-none">
                            <p className="text-amber-700 font-semibold text-lg">Drop files to upload</p>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                        </div>
                    ) : visibleItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
                            <Images className="w-10 h-10 opacity-30" />
                            <p className="text-sm">
                                {items.length === 0 ? 'No media yet — drag files here or click Upload' : 'No items match your search'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {visibleItems.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => mode === 'picker' && setSelected(item.url)}
                                    className={`group relative rounded-lg overflow-hidden border-2 transition-all bg-slate-100 ${
                                        mode === 'picker' ? 'cursor-pointer' : ''
                                    } ${
                                        mode === 'picker' && selected === item.url
                                            ? 'border-amber-500 shadow-md shadow-amber-200'
                                            : 'border-transparent hover:border-slate-300'
                                    }`}
                                >
                                    {/* Thumbnail */}
                                    <div className="aspect-square">
                                        {item.type === 'image' ? (
                                            <img
                                                src={item.url}
                                                alt={item.filename}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="relative w-full h-full bg-slate-800 flex items-center justify-center">
                                                <video
                                                    src={item.url}
                                                    className="w-full h-full object-cover opacity-70"
                                                    muted
                                                    preload="metadata"
                                                />
                                                <Play className="absolute w-8 h-8 text-white/80 pointer-events-none" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Filename */}
                                    <div className="px-1.5 py-1 bg-white border-t">
                                        <p className="text-xs text-slate-600 truncate" title={item.filename}>
                                            {item.filename || 'Unnamed'}
                                        </p>
                                    </div>

                                    {/* Delete button — manager mode */}
                                    {mode === 'manager' && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}

                                    {/* Selected checkmark — picker mode */}
                                    {mode === 'picker' && selected === item.url && (
                                        <div className="absolute top-1 right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center shadow">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-3 border-t shrink-0 bg-slate-50">
                    <p className="text-xs text-slate-500">
                        {visibleItems.length} {visibleItems.length === 1 ? 'item' : 'items'}
                        {items.length !== visibleItems.length && ` (${items.length} total)`}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={onClose}>
                            {mode === 'picker' ? 'Cancel' : 'Close'}
                        </Button>
                        {mode === 'picker' && (
                            <Button
                                size="sm"
                                disabled={!selected}
                                onClick={() => { onSelect(selected); onClose(); }}
                                className="bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
                            >
                                Use Selected
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
