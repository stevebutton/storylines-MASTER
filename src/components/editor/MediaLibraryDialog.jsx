import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Images, Upload, Trash2, Search, X } from 'lucide-react';

const generateId = () => crypto.randomUUID().replace(/-/g, '').substring(0, 24);

const CIRCLE_R = 45;
const CIRCLE_CIRC = 2 * Math.PI * CIRCLE_R;

export default function MediaLibraryDialog({ storyId, isOpen, onClose, mode = 'manager', accept = 'all', onSelect }) {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadCurrentFile, setUploadCurrentFile] = useState('');
    const [uploadIndex, setUploadIndex] = useState(0);
    const [uploadTotal, setUploadTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [selected, setSelected] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const loadItems = async () => {
        if (!storyId) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('media')
                .select('*')
                .eq('story_id', storyId)
                .order('created_date', { ascending: false });
            if (error) console.error('[MediaLibrary] loadItems error:', error);
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

        const filtered = accept === 'image'
            ? arr.filter(f => f.type.startsWith('image'))
            : accept === 'video'
            ? arr.filter(f => f.type.startsWith('video'))
            : arr;
        if (!filtered.length) return;

        setIsUploading(true);
        setUploadTotal(filtered.length);
        setUploadProgress(0);

        for (let i = 0; i < filtered.length; i++) {
            const file = filtered[i];
            setUploadIndex(i + 1);
            setUploadCurrentFile(file.name);
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const filePath = `${generateId()}-${safeName}`;
            try {
                const { error } = await supabase.storage
                    .from('media')
                    .upload(filePath, file, { contentType: file.type, upsert: false });
                if (!error) {
                    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
                    const { error: insertErr } = await supabase.from('media').insert({
                        id: generateId(),
                        story_id: storyId,
                        url: publicUrl,
                        filename: file.name,
                        title: file.name.split('.')[0],
                        category: 'other',
                        tags: [],
                        type: file.type.startsWith('image') ? 'image' : 'video',
                        file_size: file.size,
                        created_date: new Date().toISOString(),
                    });
                    if (insertErr) console.error('[MediaLibrary] insert error:', insertErr);
                }
            } catch (err) {
                console.error('Upload failed for', file.name, err);
            }
            setUploadProgress(Math.round(((i + 1) / filtered.length) * 100));
        }

        setIsUploading(false);
        setUploadProgress(0);
        setUploadCurrentFile('');
        setUploadIndex(0);
        setUploadTotal(0);
        loadItems();
    };

    const handleDelete = async (item) => {
        const urlParts = item.url.split('/');
        const filePath = urlParts[urlParts.length - 1];
        await supabase.storage.from('media').remove([filePath]);
        await supabase.from('media').delete().eq('id', item.id);
        setItems(prev => prev.filter(i => i.id !== item.id));
        if (selected === item.url) setSelected(null);
    };

    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); };

    const visibleItems = items.filter(item => {
        const typeMatch = filter === 'all' || item.type === filter;
        const searchMatch = !search || (item.filename || '').toLowerCase().includes(search.toLowerCase());
        return typeMatch && searchMatch;
    });

    const filterLabel = accept === 'image' ? 'Images' : accept === 'video' ? 'Videos' : null;
    const strokeOffset = CIRCLE_CIRC * (1 - uploadProgress / 100);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent
                className="w-[80vw] max-w-[80vw] max-h-[85vh] flex flex-col p-0 gap-0"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                    <DialogTitle className="flex items-center gap-3">
                        <img
                            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/91ab42d74_logoadjustedpng.png"
                            alt="Storylines"
                            width="250"
                            height="100"
                            style={{ width: '250px', height: '100px', objectFit: 'contain' }}
                        />
                        <span className="text-2xl">Media Library</span>
                        {filterLabel && <span className="text-sm font-normal text-slate-500">— {filterLabel} only</span>}
                    </DialogTitle>
                </DialogHeader>

                {/* Toolbar */}
                <div className="flex items-center gap-3 px-6 py-3 border-b shrink-0 flex-wrap">
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

                    <Button
                        variant="outline"
                        size="sm"
                        disabled={isUploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="shrink-0"
                    >
                        <Upload className="w-4 h-4 mr-2" /> Upload
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
                <div className="flex-1 overflow-y-auto px-6 py-4 relative">

                    {/* Drop zone overlay */}
                    {isDragging && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-amber-500/10 border-2 border-dashed border-amber-500 rounded-lg pointer-events-none">
                            <p className="text-amber-700 font-semibold text-lg">Drop files to upload</p>
                        </div>
                    )}

                    {/* Upload progress overlay */}
                    {isUploading && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 rounded-lg gap-8">
                            {/* Circular progress */}
                            <div className="relative w-52 h-52">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r={CIRCLE_R} fill="none" stroke="#e2e8f0" strokeWidth="7" />
                                    <circle
                                        cx="50" cy="50" r={CIRCLE_R}
                                        fill="none"
                                        stroke="#d97706"
                                        strokeWidth="7"
                                        strokeLinecap="round"
                                        strokeDasharray={CIRCLE_CIRC}
                                        strokeDashoffset={strokeOffset}
                                        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-5xl font-bold text-amber-600">{uploadProgress}%</span>
                                    <span className="text-sm text-slate-500 mt-1">{uploadIndex} of {uploadTotal}</span>
                                </div>
                            </div>
                            <div className="text-center max-w-xs">
                                <p className="text-xl font-semibold text-slate-700">Uploading…</p>
                                <p className="text-sm text-slate-400 mt-2 truncate">{uploadCurrentFile}</p>
                            </div>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
                        </div>
                    ) : visibleItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
                            <Images className="w-10 h-10 opacity-30" />
                            <p className="text-sm">
                                {items.length === 0 ? 'No media yet — drag files here or click Upload' : 'No items match your search'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
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
                                            <div className="relative w-full h-full bg-slate-800">
                                                <video
                                                    src={item.url}
                                                    className="w-full h-full object-cover"
                                                    muted
                                                    loop
                                                    preload="metadata"
                                                    onMouseEnter={e => e.currentTarget.play()}
                                                    onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity">
                                                    <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
                                                        <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M8 5v14l11-7z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Filename */}
                                    <div className="px-1.5 py-1 bg-white border-t">
                                        <p className="text-xs text-slate-600 break-all" title={item.filename}>
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
