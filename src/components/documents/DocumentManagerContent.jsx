import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const generateId = () => crypto.randomUUID().replace(/-/g, '').substring(0, 24);
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Download, Trash2, Edit, Search, Folder } from 'lucide-react';
import PdfViewer from '@/components/pdf/PdfViewer';
import PdfThumbnail from '@/components/pdf/PdfThumbnail';

export default function DocumentManagerContent({ storyId = null, dark = false }) {
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

    // Auth pending Supabase Auth integration — user stays null (read-only mode)
    useEffect(() => { setUser(null); }, []);

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
        const file = e.target.files?.[0];
        if (!file || file.type !== 'application/pdf') {
            alert('Please select a PDF file');
            return;
        }

        // Upload to Supabase Storage — requires a public 'documents' bucket
        const filePath = `${generateId()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file, { contentType: 'application/pdf', upsert: false });
        if (uploadError) { alert('Upload failed: ' + uploadError.message); return; }

        const { data: { publicUrl: file_url } } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath);

        createDocMutation.mutate({
            ...uploadData,
            file_url,
            title: uploadData.title || file.name.replace(/\.pdf$/i, ''),
            tags: uploadData.tags ? uploadData.tags.split(',').map(t => t.trim()) : [],
            file_size: file.size,
            ...(storyId && { story_id: storyId })
        });
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
        <div className="flex flex-col h-full space-y-6 overflow-y-auto">
            {/* Toolbar */}
            <Card className={dark ? 'bg-transparent border-white/20' : ''}>
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
                                <SelectContent className="z-[100]">
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
                                <SelectContent className="z-[100]">
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

            {/* Documents Grid - 5 columns */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {filteredDocs.map((doc) => (
                    <div
                        key={doc.id}
                        className="group relative cursor-pointer rounded-xl overflow-hidden bg-white/10 border border-white/15 hover:bg-white/[0.15] transition-colors duration-200"
                        onClick={() => {
                            setCurrentDoc(doc);
                            setShowPdfDialog(true);
                        }}
                    >
                        {/* Thumbnail — slightly inset, portrait ratio ~10% shorter than 3/4 */}
                        <div className="m-2 rounded-lg overflow-hidden">
                            <div className="aspect-[5/6]">
                                <PdfThumbnail url={doc.file_url} className="w-full h-full object-cover" />
                            </div>
                        </div>

                        {/* Title + category */}
                        <div className="px-3 pb-3">
                            <p className="text-white text-sm font-medium leading-snug line-clamp-2">{doc.title}</p>
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

                        {/* Edit / delete — only for authenticated users */}
                        {user && (
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <Button variant="ghost" size="icon" className="w-7 h-7 bg-black/40 hover:bg-black/60 text-white"
                                    onClick={(e) => { e.stopPropagation(); setCurrentDoc(doc); setShowEditDialog(true); }}>
                                    <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="w-7 h-7 bg-black/40 hover:bg-black/60 text-white"
                                    onClick={(e) => { e.stopPropagation(); deleteDocMutation.mutate(doc.id); }}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Upload Dialog */}
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogContent className="max-w-md z-[100000]">
                    <DialogHeader>
                        <DialogTitle>Upload Document</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">PDF File</label>
                            <Input type="file" accept=".pdf" onChange={handleFileUpload} />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Title</label>
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
                            <DialogTitle>{currentDoc.title}</DialogTitle>
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