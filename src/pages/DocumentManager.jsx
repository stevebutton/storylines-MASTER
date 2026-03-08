import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const generateId = () => crypto.randomUUID().replace(/-/g, '').substring(0, 24);
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Download, Trash2, Edit, Search, Folder, Filter, ArrowLeft } from 'lucide-react';
import PdfViewer from '@/components/pdf/PdfViewer';
import PdfThumbnail from '@/components/pdf/PdfThumbnail';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function DocumentManager() {
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

    useEffect(() => { setUser(null); }, []);

    const { data: documents = [] } = useQuery({
        queryKey: ['documents'],
        queryFn: async () => { const { data, error } = await supabase.from('documents').select('*').order('created_date', { ascending: false }); if (error) throw error; return data || []; }
    });

    const createDocMutation = useMutation({
        mutationFn: async (data) => { const { error } = await supabase.from('documents').insert({ id: generateId(), ...data }); if (error) throw error; },
        onSuccess: () => {
            queryClient.invalidateQueries(['documents']);
            setShowUploadDialog(false);
            resetUploadForm();
        }
    });

    const updateDocMutation = useMutation({
        mutationFn: async ({ id, data }) => { const { id: _id, ...updateData } = data; const { error } = await supabase.from('documents').update(updateData).eq('id', id); if (error) throw error; },
        onSuccess: () => {
            queryClient.invalidateQueries(['documents']);
            setShowEditDialog(false);
        }
    });

    const deleteDocMutation = useMutation({
        mutationFn: async (id) => { const { error } = await supabase.from('documents').delete().eq('id', id); if (error) throw error; },
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
        };

        if (files.length === 1) {
            const file = files[0];
            const filePath = `${generateId()}-${file.name}`;
            const { error: upErr } = await supabase.storage.from('documents').upload(filePath, file, { contentType: 'application/pdf', upsert: false });
            if (upErr) { alert('Upload failed: ' + upErr.message); return; }
            const { data: { publicUrl: file_url } } = supabase.storage.from('documents').getPublicUrl(filePath);
            createDocMutation.mutate({
                ...uploadData,
                ...sharedMeta,
                file_url,
                title:     uploadData.title || file.name.replace(/\.pdf$/i, ''),
                file_size: file.size,
            });
        } else {
            setIsUploading(true);
            setBulkProgress({ done: 0, total: files.length });

            for (const file of files) {
                const filePath = `${generateId()}-${file.name}`;
                const { error: upErr } = await supabase.storage.from('documents').upload(filePath, file, { contentType: 'application/pdf', upsert: false });
                if (!upErr) {
                    const { data: { publicUrl: file_url } } = supabase.storage.from('documents').getPublicUrl(filePath);
                    await supabase.from('documents').insert({
                        id: generateId(), file_url,
                        title:     file.name.replace(/\.pdf$/i, ''),
                        file_size: file.size,
                        ...sharedMeta,
                    });
                } else {
                    console.error('[library] Failed to upload', file.name, upErr.message);
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
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <Link to={createPageUrl('ProjectInterface')}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">Document Manager</h1>
                            <p className="text-slate-600">Organize and manage your PDF documents</p>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <Card className="mb-6">
                    <CardContent className="p-4">
                        <div className="flex flex-wrap gap-4 items-center justify-between">
                            <div className="flex gap-2 flex-1">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Search documents..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="w-40">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
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
                                    <SelectTrigger className="w-40">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Folders</SelectItem>
                                        {uniqueFolders.map(folder => (
                                            <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="flex gap-2">
                                {user && selectedDocs.length > 0 && (
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
                                {user && (
                                    <Button onClick={() => setShowUploadDialog(true)}>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Upload Document
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Documents Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDocs.map((doc) => (
                        <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between mb-3">
                                    {user && (
                                        <Checkbox
                                            checked={selectedDocs.includes(doc.id)}
                                            onCheckedChange={(checked) => {
                                                setSelectedDocs(prev =>
                                                    checked ? [...prev, doc.id] : prev.filter(id => id !== doc.id)
                                                );
                                            }}
                                        />
                                    )}
                                    {user && (
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setCurrentDoc(doc);
                                                    setShowEditDialog(true);
                                                }}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => deleteDocMutation.mutate(doc.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* PDF Thumbnail */}
                                <div 
                                    className="rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:border-amber-600 transition-colors"
                                    onClick={() => {
                                        setCurrentDoc(doc);
                                        setShowPdfDialog(true);
                                    }}
                                >
                                    <PdfThumbnail url={doc.file_url} className="w-full h-48" />
                                </div>

                                <CardTitle className="text-lg mt-3">
                                    {doc.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                                    {doc.description || 'No description'}
                                </p>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <Badge variant="secondary">{doc.category}</Badge>
                                    {doc.folder && (
                                        <Badge variant="outline">
                                            <Folder className="w-3 h-3 mr-1" />
                                            {doc.folder}
                                        </Badge>
                                    )}
                                </div>
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={() => {
                                        setCurrentDoc(doc);
                                        setShowPdfDialog(true);
                                    }}
                                >
                                    View Document
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Upload Dialog */}
                <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Upload Document</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">PDF File(s)</label>
                                <Input type="file" accept=".pdf" multiple onChange={handleFileUpload} disabled={isUploading} />
                                <p className="text-xs text-slate-500 mt-1">Select multiple files to bulk upload. Titles will be taken from filenames.</p>
                            </div>

                            {isUploading && (
                                <div className="space-y-2">
                                    <p className="text-sm text-slate-600">Uploading {bulkProgress.done} of {bulkProgress.total}…</p>
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
                                    <SelectContent>
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
                        <DialogContent className="max-w-md">
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
                                        <SelectContent>
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
                        <DialogContent className="max-w-6xl h-[90vh] z-[9999]">
                            <DialogHeader>
                                <DialogTitle>{currentDoc.title}</DialogTitle>
                            </DialogHeader>
                            <div className="flex-1 h-full overflow-hidden">
                                <PdfViewer url={currentDoc.file_url} />
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </div>
    );
}