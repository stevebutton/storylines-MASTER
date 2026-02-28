import React, { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

const generateId = () => crypto.randomUUID().replace(/-/g, '').substring(0, 24);
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Search, Upload, Loader2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DocumentPicker({ isOpen, onClose, onSelect, storyId }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedDoc, setUploadedDoc] = useState(null);
    const [docTitle, setDocTitle] = useState('');

    const { data: documents = [], isLoading } = useQuery({
        queryKey: ['documents', storyId],
        queryFn: async () => {
            if (!storyId) return [];
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('story_id', storyId)
                .order('created_date', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: isOpen && !!storyId
    });

    const filteredDocuments = documents.filter(doc =>
        doc.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !storyId) return;

        setIsUploading(true);
        try {
            // Upload to Supabase Storage — requires a public 'documents' bucket
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const filePath = `${generateId()}-${safeName}`;
            const { error: uploadError } = await supabase.storage
                .from('media')
                .upload(filePath, file, { contentType: file.type, upsert: false });
            if (uploadError) throw uploadError;

            const { data: { publicUrl: file_url } } = supabase.storage
                .from('media')
                .getPublicUrl(filePath);

            const docId = generateId();
            const { data: newDoc, error: insertError } = await supabase
                .from('documents')
                .insert({
                    id: docId,
                    title: file.name.replace(/\.pdf$/i, ''),
                    file_url,
                    story_id: storyId,
                    category: 'other',
                    file_size: file.size,
                    description: 'Uploaded from slide editor'
                })
                .select()
                .single();
            if (insertError) throw insertError;
            setUploadedDoc(newDoc);
            setDocTitle(newDoc.title || '');
        } catch (error) {
            console.error('Failed to upload document:', error);
            toast.error(`Failed to upload document: ${error.message}`);
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Select or Upload Document</DialogTitle>
                </DialogHeader>

                {/* Success screen */}
                {uploadedDoc && (
                    <div className="flex flex-col items-center justify-center py-8 gap-5 text-center">
                        <CheckCircle className="w-14 h-14 text-green-500" />
                        <div>
                            <h3 className="text-xl font-semibold text-slate-800">Document Uploaded Successfully</h3>
                            <p className="text-xs text-slate-400 mt-1">Give it a short display title before attaching</p>
                        </div>
                        <div className="w-full max-w-sm text-left">
                            <Label htmlFor="doc-title">Display Title</Label>
                            <Input
                                id="doc-title"
                                value={docTitle}
                                onChange={(e) => setDocTitle(e.target.value)}
                                maxLength={60}
                                placeholder="e.g. Site Survey Report"
                                className="mt-1"
                            />
                            <p className="text-xs text-slate-400 mt-1">{docTitle.length}/60</p>
                        </div>
                        <Button
                            className="bg-amber-600 hover:bg-amber-700"
                            disabled={!docTitle.trim()}
                            onClick={async () => {
                                if (docTitle.trim() !== uploadedDoc.title) {
                                    await supabase.from('documents').update({ title: docTitle.trim() }).eq('id', uploadedDoc.id);
                                }
                                onSelect({ ...uploadedDoc, title: docTitle.trim() });
                                onClose();
                                setUploadedDoc(null);
                                setDocTitle('');
                            }}
                        >
                            Attach to Slide
                        </Button>
                    </div>
                )}

                {!uploadedDoc && <div className="space-y-4">
                    {/* Upload Section */}
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 bg-slate-50">
                        <input
                            type="file"
                            accept="application/pdf"
                            onChange={handleUpload}
                            className="hidden"
                            id="doc-picker-upload"
                            disabled={isUploading || !storyId}
                        />
                        <label htmlFor="doc-picker-upload">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isUploading || !storyId}
                                onClick={() => document.getElementById('doc-picker-upload').click()}
                                className="w-full"
                            >
                                {isUploading ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                                ) : (
                                    <><Upload className="w-4 h-4 mr-2" /> Upload New PDF</>
                                )}
                            </Button>
                        </label>
                        {!storyId && (
                            <p className="text-xs text-red-500 mt-2 text-center">
                                Please save the story first before uploading documents
                            </p>
                        )}
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search documents..."
                            className="pl-10"
                        />
                    </div>

                    {/* Document List */}
                    <ScrollArea className="h-[400px] border rounded-lg">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-40">
                                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                            </div>
                        ) : filteredDocuments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                <FileText className="w-12 h-12 mb-2" />
                                <p className="text-sm">
                                    {documents.length === 0 ? 'No documents in library' : 'No matching documents'}
                                </p>
                            </div>
                        ) : (
                            <div className="p-2 space-y-2">
                                <AnimatePresence>
                                    {filteredDocuments.map((doc) => (
                                        <motion.div
                                            key={doc.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                        >
                                            <button
                                                onClick={() => {
                                                    onSelect(doc);
                                                    onClose();
                                                }}
                                                className="w-full p-3 border rounded-lg hover:bg-slate-50 transition-colors text-left group"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <FileText className="w-5 h-5 text-blue-600 mt-1 shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                                                            {doc.title}
                                                        </p>
                                                        {doc.description && (
                                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                                {doc.description}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-slate-400 mt-1">
                                                            {doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(2)} MB` : 'Size unknown'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </ScrollArea>
                </div>}
            </DialogContent>
        </Dialog>
    );
}