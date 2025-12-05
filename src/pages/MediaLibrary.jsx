import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
    Upload, Search, Filter, Grid, List, Loader2, Image as ImageIcon, 
    Trash2, Edit2, Copy, Check, X, Plus, ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function MediaLibrary() {
    const [media, setMedia] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [viewMode, setViewMode] = useState('grid');
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [copiedId, setCopiedId] = useState(null);
    const [tagInput, setTagInput] = useState('');

    useEffect(() => {
        loadMedia();
    }, []);

    const loadMedia = async () => {
        setIsLoading(true);
        try {
            const data = await base44.entities.Media.list('-created_date');
            setMedia(data);
        } catch (error) {
            console.error('Failed to load media:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpload = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        try {
            for (const file of files) {
                const { file_url } = await base44.integrations.Core.UploadFile({ file });
                await base44.entities.Media.create({
                    url: file_url,
                    filename: file.name,
                    title: file.name.split('.')[0],
                    file_size: file.size,
                    category: 'other',
                    tags: []
                });
            }
            loadMedia();
        } catch (error) {
            console.error('Failed to upload:', error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this image?')) return;
        await base44.entities.Media.delete(id);
        loadMedia();
        setIsPreviewOpen(false);
    };

    const handleEdit = (item) => {
        setEditForm({ ...item });
        setTagInput('');
        setIsEditDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        await base44.entities.Media.update(editForm.id, editForm);
        loadMedia();
        setIsEditDialogOpen(false);
    };

    const handleCopyUrl = (url, id) => {
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const addTag = () => {
        if (tagInput.trim() && !editForm.tags?.includes(tagInput.trim())) {
            setEditForm(prev => ({
                ...prev,
                tags: [...(prev.tags || []), tagInput.trim()]
            }));
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove) => {
        setEditForm(prev => ({
            ...prev,
            tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
        }));
    };

    const filteredMedia = useMemo(() => {
        let result = [...media];

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(item =>
                item.title?.toLowerCase().includes(query) ||
                item.filename?.toLowerCase().includes(query) ||
                item.description?.toLowerCase().includes(query) ||
                item.tags?.some(tag => tag.toLowerCase().includes(query))
            );
        }

        if (categoryFilter !== 'all') {
            result = result.filter(item => item.category === categoryFilter);
        }

        return result;
    }, [media, searchQuery, categoryFilter]);

    const allTags = useMemo(() => {
        const tags = new Set();
        media.forEach(item => item.tags?.forEach(tag => tags.add(tag)));
        return Array.from(tags);
    }, [media]);

    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <Link to={createPageUrl('Stories')}>
                                <Button variant="ghost" size="icon">
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">Media Library</h1>
                                <p className="text-sm text-slate-500">{media.length} images</p>
                            </div>
                        </div>
                        <div>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleUpload}
                                className="hidden"
                                id="upload-input"
                            />
                            <label htmlFor="upload-input">
                                <Button asChild className="bg-amber-600 hover:bg-amber-700 cursor-pointer">
                                    <span>
                                        {isUploading ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Upload className="w-4 h-4 mr-2" />
                                        )}
                                        Upload Images
                                    </span>
                                </Button>
                            </label>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-3">
                        <div className="relative flex-1 min-w-[200px] max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search by name, description, or tags..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-[150px]">
                                <Filter className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                <SelectItem value="landscape">Landscape</SelectItem>
                                <SelectItem value="portrait">Portrait</SelectItem>
                                <SelectItem value="architecture">Architecture</SelectItem>
                                <SelectItem value="nature">Nature</SelectItem>
                                <SelectItem value="people">People</SelectItem>
                                <SelectItem value="food">Food</SelectItem>
                                <SelectItem value="travel">Travel</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex border rounded-lg overflow-hidden">
                            <Button
                                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                size="icon"
                                onClick={() => setViewMode('grid')}
                                className="rounded-none"
                            >
                                <Grid className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'default' : 'ghost'}
                                size="icon"
                                onClick={() => setViewMode('list')}
                                className="rounded-none"
                            >
                                <List className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Tags cloud */}
                    {allTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {allTags.slice(0, 10).map(tag => (
                                <Badge
                                    key={tag}
                                    variant="outline"
                                    className="cursor-pointer hover:bg-amber-50"
                                    onClick={() => setSearchQuery(tag)}
                                >
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                {filteredMedia.length === 0 ? (
                    <Card className="border-2 border-dashed">
                        <CardContent className="py-16 text-center">
                            <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-700 mb-2">
                                {media.length === 0 ? 'No images yet' : 'No matching images'}
                            </h3>
                            <p className="text-slate-500 mb-4">
                                {media.length === 0 ? 'Upload your first image to get started' : 'Try adjusting your search or filters'}
                            </p>
                        </CardContent>
                    </Card>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredMedia.map(item => (
                            <Card 
                                key={item.id} 
                                className="group overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                                onClick={() => { setSelectedMedia(item); setIsPreviewOpen(true); }}
                            >
                                <div className="aspect-square relative overflow-hidden bg-slate-100">
                                    <img
                                        src={item.url}
                                        alt={item.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <div className="flex gap-2">
                                            <Button
                                                size="icon"
                                                variant="secondary"
                                                className="h-8 w-8"
                                                onClick={(e) => { e.stopPropagation(); handleCopyUrl(item.url, item.id); }}
                                            >
                                                {copiedId === item.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="secondary"
                                                className="h-8 w-8"
                                                onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <CardContent className="p-3">
                                    <p className="text-sm font-medium text-slate-700 truncate">{item.title || item.filename}</p>
                                    {item.category && item.category !== 'other' && (
                                        <Badge variant="outline" className="mt-1 text-xs">{item.category}</Badge>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredMedia.map(item => (
                            <Card 
                                key={item.id} 
                                className="hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => { setSelectedMedia(item); setIsPreviewOpen(true); }}
                            >
                                <CardContent className="p-3 flex items-center gap-4">
                                    <div className="w-16 h-16 rounded overflow-hidden bg-slate-100 shrink-0">
                                        <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-800 truncate">{item.title || item.filename}</p>
                                        <p className="text-sm text-slate-500">{formatFileSize(item.file_size)}</p>
                                        {item.tags?.length > 0 && (
                                            <div className="flex gap-1 mt-1">
                                                {item.tags.slice(0, 3).map(tag => (
                                                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={(e) => { e.stopPropagation(); handleCopyUrl(item.url, item.id); }}
                                        >
                                            {copiedId === item.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Preview Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden">
                    {selectedMedia && (
                        <div className="flex flex-col md:flex-row">
                            <div className="flex-1 bg-slate-900 flex items-center justify-center min-h-[300px] md:min-h-[500px]">
                                <img
                                    src={selectedMedia.url}
                                    alt={selectedMedia.title}
                                    className="max-w-full max-h-[500px] object-contain"
                                />
                            </div>
                            <div className="w-full md:w-[300px] p-5 bg-white">
                                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                                    {selectedMedia.title || selectedMedia.filename}
                                </h3>
                                {selectedMedia.description && (
                                    <p className="text-sm text-slate-600 mb-4">{selectedMedia.description}</p>
                                )}
                                <div className="space-y-3 text-sm">
                                    {selectedMedia.category && (
                                        <div>
                                            <span className="text-slate-500">Category:</span>
                                            <Badge className="ml-2">{selectedMedia.category}</Badge>
                                        </div>
                                    )}
                                    {selectedMedia.file_size && (
                                        <div>
                                            <span className="text-slate-500">Size:</span>
                                            <span className="ml-2">{formatFileSize(selectedMedia.file_size)}</span>
                                        </div>
                                    )}
                                    {selectedMedia.tags?.length > 0 && (
                                        <div>
                                            <span className="text-slate-500 block mb-1">Tags:</span>
                                            <div className="flex flex-wrap gap-1">
                                                {selectedMedia.tags.map(tag => (
                                                    <Badge key={tag} variant="outline">{tag}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2 mt-6">
                                    <Button
                                        className="flex-1"
                                        onClick={() => handleCopyUrl(selectedMedia.url, selectedMedia.id)}
                                    >
                                        {copiedId === selectedMedia.id ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                        Copy URL
                                    </Button>
                                    <Button variant="outline" onClick={() => handleEdit(selectedMedia)}>
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button variant="outline" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(selectedMedia.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Image Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div>
                            <Label>Title</Label>
                            <Input
                                value={editForm.title || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                            />
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Textarea
                                value={editForm.description || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                className="h-20"
                            />
                        </div>
                        <div>
                            <Label>Category</Label>
                            <Select
                                value={editForm.category || 'other'}
                                onValueChange={(value) => setEditForm(prev => ({ ...prev, category: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="landscape">Landscape</SelectItem>
                                    <SelectItem value="portrait">Portrait</SelectItem>
                                    <SelectItem value="architecture">Architecture</SelectItem>
                                    <SelectItem value="nature">Nature</SelectItem>
                                    <SelectItem value="people">People</SelectItem>
                                    <SelectItem value="food">Food</SelectItem>
                                    <SelectItem value="travel">Travel</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Tags</Label>
                            <div className="flex gap-2 mb-2">
                                <Input
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    placeholder="Add a tag"
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                />
                                <Button variant="outline" onClick={addTag}>
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                            {editForm.tags?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {editForm.tags.map(tag => (
                                        <Badge key={tag} variant="secondary" className="pr-1">
                                            {tag}
                                            <button onClick={() => removeTag(tag)} className="ml-1 hover:text-red-500">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleSaveEdit} className="bg-amber-600 hover:bg-amber-700">Save Changes</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}