import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Download, Trash2, Edit, Search, Folder, Link2, Code2 } from 'lucide-react';
import PdfViewer from '@/components/pdf/PdfViewer';
import PdfThumbnail from '@/components/pdf/PdfThumbnail';

const THEME_FONTS = { c: 'Righteous, cursive', f: 'Oswald, sans-serif', k: 'Oswald, sans-serif' };

// Pill style tokens — inlined to avoid cross-module dependency
const PILL_SHELL = {
    display: 'flex', alignItems: 'center',
    width: '100%', height: 44,
    background: 'rgba(0,0,0,0.30)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.20)',
    borderRadius: 12,
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1),0 8px 10px -6px rgba(0,0,0,0.1)',
    overflow: 'hidden',
};
const PILL_BTN = {
    flex: 1, height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'rgba(255,255,255,0.70)',
    background: 'transparent', border: 'none',
    cursor: 'pointer', transition: 'all 0.2s',
    fontSize: 12, fontWeight: 500, gap: 6,
    whiteSpace: 'nowrap',
};
const PILL_DIV = { width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.20)', flexShrink: 0 };

const generateId = () => crypto.randomUUID().replace(/-/g, '').substring(0, 24);

export default function DocumentManagerContent({ storyId = null, dark = false, triggerUploadKey = 0, mapStyle = 'a' }) {
    const themeFont = THEME_FONTS[mapStyle] || 'Raleway, sans-serif';
    const queryClient = useQueryClient();
    const [user, setUser] = useState(null);
    const [selectedDocs, setSelectedDocs] = useState([]);
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showPdfDialog, setShowPdfDialog] = useState(false);
    const [currentDoc, setCurrentDoc] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [folderFilter, setFolderFilter] = useState('all');
    const [uploadData, setUploadData] = useState({
        title: '',
        description: '',
        category: 'other',
        folder: '',
        tags: ''
    });
    const [isUploading, setIsUploading] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });

    // Auth pending Supabase Auth integration — user stays null (read-only mode)
    useEffect(() => { setUser(null); }, []);

    // External trigger — e.g. from LibraryPill "Upload Document" button
    useEffect(() => {
        if (triggerUploadKey > 0) setShowUploadDialog(true);
    }, [triggerUploadKey]);

    const { data: documents = [] } = useQuery({
        queryKey: ['documents', storyId],
        queryFn: async () => {
            let query = supabase.from('documents').select('*').order('created_date', { ascending: false });
            if (storyId) query = query.eq('story_id', storyId);
            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        }
    });

    const createDocMutation = useMutation({
        mutationFn: async (data) => {
            const { error } = await supabase.from('documents').insert({ id: generateId(), ...data });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['documents']);
            setShowUploadDialog(false);
            resetUploadForm();
        }
    });

    const updateDocMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const { id: _id, ...updateData } = data;
            const { error } = await supabase.from('documents').update(updateData).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['documents']);
            setShowEditDialog(false);
        }
    });

    const deleteDocMutation = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase.from('documents').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['documents']);
        }
    });

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf');
        if (!files.length) { alert('Please select PDF file(s)'); return; }

        const sharedMeta = {
            category: uploadData.category,
            folder:   uploadData.folder,
            tags:     uploadData.tags ? uploadData.tags.split(',').map(t => t.trim()) : [],
            ...(storyId && { story_id: storyId }),
        };

        if (files.length === 1) {
            // Single file — use full metadata form
            const file = files[0];
            const filePath = `${generateId()}-${file.name}`;
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file, { contentType: 'application/pdf', upsert: false });
            if (uploadError) { alert('Upload failed: ' + uploadError.message); return; }

            const { data: { publicUrl: file_url } } = supabase.storage
                .from('documents').getPublicUrl(filePath);

            createDocMutation.mutate({
                ...uploadData,
                ...sharedMeta,
                file_url,
                title:     uploadData.title || file.name.replace(/\.pdf$/i, ''),
                file_size: file.size,
            });
        } else {
            // Bulk upload — titles from filenames, shared category/folder/tags
            setIsUploading(true);
            setBulkProgress({ done: 0, total: files.length });

            for (const file of files) {
                const filePath = `${generateId()}-${file.name}`;
                const { error: uploadError } = await supabase.storage
                    .from('documents')
                    .upload(filePath, file, { contentType: 'application/pdf', upsert: false });

                if (!uploadError) {
                    const { data: { publicUrl: file_url } } = supabase.storage
                        .from('documents').getPublicUrl(filePath);
                    await supabase.from('documents').insert({
                        id:        generateId(),
                        file_url,
                        title:     file.name.replace(/\.pdf$/i, ''),
                        file_size: file.size,
                        ...sharedMeta,
                    });
                } else {
                    console.error('[library] Failed to upload', file.name, uploadError.message);
                }
                setBulkProgress(prev => ({ ...prev, done: prev.done + 1 }));
            }

            queryClient.invalidateQueries(['documents']);
            setIsUploading(false);
            setShowUploadDialog(false);
            resetUploadForm();
        }
    };

    const handleBulkDownload = async () => {
        for (const docId of selectedDocs) {
            const doc = documents.find(d => d.id === docId);
            if (doc) {
                const link = document.createElement('a');
                link.href = doc.file_url;
                link.download = doc.title + '.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    };

    const handleBulkDelete = () => {
        if (confirm(`Delete ${selectedDocs.length} document(s)?`)) {
            selectedDocs.forEach(id => deleteDocMutation.mutate(id));
            setSelectedDocs([]);
        }
    };

    const resetUploadForm = () => {
        setUploadData({
            title: '',
            description: '',
            category: 'other',
            folder: '',
            tags: ''
        });
    };

    const filteredDocs = documents.filter(doc => {
        const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
        const matchesFolder = folderFilter === 'all' || doc.folder === folderFilter;
        return matchesSearch && matchesCategory && matchesFolder;
    });

    const uniqueFolders = [...new Set(documents.map(d => d.folder).filter(Boolean))];

    return (
        <div className="flex h-full overflow-hidden">

            {/* ── Left column — fixed intro text ── */}
            <div
                className="flex-shrink-0 border-r border-white/10 overflow-y-auto"
                style={{ width: 360, padding: '86px 90px 40px 40px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                <h2 className="text-white text-xl font-light leading-snug text-right mb-4" style={{ fontFamily: 'Raleway, sans-serif' }}>
                    Welcome to the<br />Project Library
                </h2>
                <p className="text-white/70 text-sm font-light leading-relaxed text-right">
                    This library serves as a working appendix to Storylines — a curated collection of documents, reports, and reference materials selected to support your projects in the field.<br /><br />Browse online or download and share resources with your team, partners, or stakeholders. Whether you're scoping a new engagement, deepening your analysis, or building an evidence base, everything here is designed to complement your work in Storylines and keep key knowledge within reach.
                </p>
            </div>

            {/* ── Right section — toolbar + scrollable grid ── */}
            <div className="flex-1 flex flex-col overflow-hidden" style={{ paddingLeft: 32 }}>

                {/* Toolbar */}
                <div className="flex-shrink-0 flex flex-wrap gap-3 items-center pb-5 pt-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <Input
                            placeholder="Search documents..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 text-white border-white/30 bg-transparent placeholder:text-white/40"
                        />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-40 text-white border-white/30 bg-transparent">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[300100]">
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="research">Research</SelectItem>
                            <SelectItem value="education">Education</SelectItem>
                            <SelectItem value="reports">Reports</SelectItem>
                            <SelectItem value="presentations">Presentations</SelectItem>
                            <SelectItem value="legal">Legal</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={folderFilter} onValueChange={setFolderFilter}>
                        <SelectTrigger className="w-40 text-white border-white/30 bg-transparent">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[300100]">
                            <SelectItem value="all">All Folders</SelectItem>
                            {uniqueFolders.map(folder => (
                                <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedDocs.length > 0 && (
                        <>
                            <Button variant="outline" onClick={handleBulkDownload}>
                                <Download className="w-4 h-4 mr-2" />
                                Download ({selectedDocs.length})
                            </Button>
                            <Button variant="destructive" onClick={handleBulkDelete}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete ({selectedDocs.length})
                            </Button>
                        </>
                    )}
                </div>

                {/* Documents Grid — scrollable */}
                <div className="flex-1 overflow-y-auto pr-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredDocs.map((doc, index) => (
                    <motion.div
                        key={doc.id}
                        className="group relative cursor-pointer rounded-xl overflow-hidden bg-white/10 border border-white/15 hover:bg-white/[0.15] transition-colors duration-200"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: 'easeOut', delay: Math.min(index * 0.04, 0.3) }}
                        onClick={() => {
                            setCurrentDoc(doc);
                            setShowPdfDialog(true);
                        }}
                    >
                        {/* Thumbnail — slightly inset, portrait ratio ~10% shorter than 3/4 */}
                        <div className="m-5 rounded-lg overflow-hidden">
                            <div className="aspect-[5/6]">
                                <PdfThumbnail url={doc.file_url} className="w-full h-full object-cover" />
                            </div>
                        </div>

                        {/* Title + category */}
                        <div className="px-5 pb-5">
                            <p className="text-white text-sm font-medium leading-snug line-clamp-2" style={{ fontFamily: themeFont }}>{doc.title}</p>
                            {doc.category && doc.category !== 'other' && (
                                <p className="text-white/55 text-xs mt-0.5 uppercase tracking-widest">{doc.category}</p>
                            )}
                        </div>

                        {/* Hover overlay — View button */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <span className="bg-white text-slate-900 px-5 py-2 rounded-full text-sm font-medium shadow-lg">
                                View
                            </span>
                        </div>

                        {/* Edit / delete */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Button variant="ghost" size="icon" className="w-7 h-7 bg-black/40 hover:bg-black/60 text-white"
                                onClick={(e) => { e.stopPropagation(); setCurrentDoc(doc); setShowEditDialog(true); }}>
                                <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="w-7 h-7 bg-black/40 hover:bg-black/60 text-white"
                                onClick={(e) => { e.stopPropagation(); if (confirm('Delete this document?')) deleteDocMutation.mutate(doc.id); }}>
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </motion.div>
                ))}
                </div>
                </div>

            </div>{/* end right section */}

            {/* Upload Dialog */}
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogContent className="max-w-md z-[100000]">
                    <DialogHeader>
                        <DialogTitle>Upload Document</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">PDF File(s)</label>
                            <Input type="file" accept=".pdf" multiple onChange={handleFileUpload} disabled={isUploading} />
                            <p className="text-xs text-slate-500 mt-1">Select multiple files to bulk upload. Titles will be taken from filenames.</p>
                        </div>

                        {/* Bulk progress indicator */}
                        {isUploading && (
                            <div className="space-y-2">
                                <p className="text-sm text-slate-600">
                                    Uploading {bulkProgress.done} of {bulkProgress.total}…
                                </p>
                                <div className="w-full bg-slate-200 rounded-full h-1.5">
                                    <div
                                        className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                                        style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-sm font-medium mb-2 block">Title <span className="text-slate-400 font-normal">(single upload only)</span></label>
                            <Input
                                value={uploadData.title}
                                onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                                placeholder="Document title"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Description</label>
                            <Textarea
                                value={uploadData.description}
                                onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                                placeholder="Document description"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Category</label>
                            <Select value={uploadData.category} onValueChange={(val) => setUploadData({ ...uploadData, category: val })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-[200000]" position="popper" side="right" align="start">
                                    <SelectItem value="research">Research</SelectItem>
                                    <SelectItem value="education">Education</SelectItem>
                                    <SelectItem value="reports">Reports</SelectItem>
                                    <SelectItem value="presentations">Presentations</SelectItem>
                                    <SelectItem value="legal">Legal</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Folder</label>
                            <Input
                                value={uploadData.folder}
                                onChange={(e) => setUploadData({ ...uploadData, folder: e.target.value })}
                                placeholder="Folder name"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Tags (comma-separated)</label>
                            <Input
                                value={uploadData.tags}
                                onChange={(e) => setUploadData({ ...uploadData, tags: e.target.value })}
                                placeholder="tag1, tag2, tag3"
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            {currentDoc && (
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent className="max-w-md z-[100000]">
                        <DialogHeader>
                            <DialogTitle>Edit Document</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">Title</label>
                                <Input
                                    defaultValue={currentDoc.title}
                                    onChange={(e) => setCurrentDoc({ ...currentDoc, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">Description</label>
                                <Textarea
                                    defaultValue={currentDoc.description}
                                    onChange={(e) => setCurrentDoc({ ...currentDoc, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">Category</label>
                                <Select value={currentDoc.category} onValueChange={(val) => setCurrentDoc({ ...currentDoc, category: val })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="z-[200000]" position="popper" side="right" align="start">
                                        <SelectItem value="research">Research</SelectItem>
                                        <SelectItem value="education">Education</SelectItem>
                                        <SelectItem value="reports">Reports</SelectItem>
                                        <SelectItem value="presentations">Presentations</SelectItem>
                                        <SelectItem value="legal">Legal</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">Folder</label>
                                <Input
                                    defaultValue={currentDoc.folder}
                                    onChange={(e) => setCurrentDoc({ ...currentDoc, folder: e.target.value })}
                                />
                            </div>
                            <Button
                                className="w-full"
                                onClick={() => updateDocMutation.mutate({
                                    id: currentDoc.id,
                                    data: currentDoc
                                })}
                            >
                                Save Changes
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* PDF Viewer Dialog */}
            {currentDoc && (
                <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
                    <DialogContent className="max-w-6xl h-[80vh] z-[300000]">
                        <DialogHeader>
                            <DialogTitle style={{ fontFamily: themeFont }}>{currentDoc.title}</DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 h-full overflow-hidden">
                            <PdfViewer url={currentDoc.file_url} />
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}