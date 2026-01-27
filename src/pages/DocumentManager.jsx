import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Download, Trash2, Edit, Search, Folder, Filter } from 'lucide-react';
import PdfViewer from '@/components/pdf/PdfViewer';
import PdfThumbnail from '@/components/pdf/PdfThumbnail';

export default function DocumentManager() {
    const queryClient = useQueryClient();
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

    const { data: documents = [] } = useQuery({
        queryKey: ['documents'],
        queryFn: () => base44.entities.Document.list('-created_date')
    });

    const createDocMutation = useMutation({
        mutationFn: (data) => base44.entities.Document.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['documents']);
            setShowUploadDialog(false);
            resetUploadForm();
        }
    });

    const updateDocMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Document.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['documents']);
            setShowEditDialog(false);
        }
    });

    const deleteDocMutation = useMutation({
        mutationFn: (id) => base44.entities.Document.delete(id),
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

        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        createDocMutation.mutate({
            ...uploadData,
            file_url,
            title: uploadData.title || file.name.replace(/\.pdf$/i, ''),
            tags: uploadData.tags ? uploadData.tags.split(',').map(t => t.trim()) : [],
            file_size: file.size
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
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Document Manager</h1>
                    <p className="text-slate-600">Organize and manage your PDF documents</p>
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
                                <Button onClick={() => setShowUploadDialog(true)}>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload Document
                                </Button>
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
                                    <Checkbox
                                        checked={selectedDocs.includes(doc.id)}
                                        onCheckedChange={(checked) => {
                                            setSelectedDocs(prev =>
                                                checked ? [...prev, doc.id] : prev.filter(id => id !== doc.id)
                                            );
                                        }}
                                    />
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