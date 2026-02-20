import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GripVertical, Trash2, Upload, Image as ImageIcon, MapPin, AlertCircle, X, Loader2, FileText, Video } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import DocumentPicker from './DocumentPicker';

const validateField = (field, value) => {
    switch (field) {
        case 'title':
            if (!value || value.trim().length === 0) return 'Title is required';
            if (value.length > 100) return 'Title must be under 100 characters';
            return null;
        case 'description':
            if (value && value.length > 1000) return 'Description must be under 1000 characters';
            return null;
        case 'location':
            if (value && value.length > 100) return 'Location must be under 100 characters';
            return null;
        default:
            return null;
    }
};

export default function SlideEditor({ slide, storyId, chapterId, onUpdate, onDelete, dragHandleProps }) {
    const [isUploading, setIsUploading] = useState(false);
    const [isUploadingBackground, setIsUploadingBackground] = useState(false);
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const [isUploadingVideoThumbnail, setIsUploadingVideoThumbnail] = useState(false);
    const [pdfFileName, setPdfFileName] = useState('');
    const [errors, setErrors] = useState({});
    const [showDocumentPicker, setShowDocumentPicker] = useState(false);

    React.useEffect(() => {
        if (slide.pdf_url) {
            try {
                const url = new URL(slide.pdf_url);
                const filename = url.pathname.split('/').pop();
                setPdfFileName(decodeURIComponent(filename));
            } catch (e) {
                setPdfFileName('Attached PDF');
            }
        } else {
            setPdfFileName('');
        }
    }, [slide.pdf_url]);

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            onUpdate({ ...slide, image: file_url });
        } catch (error) {
            console.error('Failed to upload image:', error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleBackgroundImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingBackground(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            onUpdate({ ...slide, background_image: file_url });
        } catch (error) {
            console.error('Failed to upload background image:', error);
        } finally {
            setIsUploadingBackground(false);
        }
    };

    return (
        <Card className="border-slate-200">
            <CardContent className="p-4">
                <div className="flex gap-4">
                    {/* Drag handle */}
                    <div {...dragHandleProps} className="cursor-grab pt-2">
                        <GripVertical className="w-5 h-5 text-slate-400" />
                    </div>

                    {/* Normal Image upload */}
                    <div className="shrink-0">
                        <Label className="text-xs mb-1 block">Normal Image</Label>
                        <div className="w-32 h-24 rounded-lg overflow-hidden bg-slate-100 relative group">
                            {slide.image ? (
                                <img src={slide.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-8 h-8 text-slate-300" />
                                </div>
                            )}
                            <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                {isUploading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Upload className="w-5 h-5 text-white" />
                                )}
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={handleImageUpload}
                                    disabled={isUploading}
                                />
                            </label>
                        </div>
                    </div>

                    {/* Background Image upload (for full_background card style) */}
                    {slide.card_style === 'full_background' && (
                        <div className="shrink-0">
                            <Label className="text-xs mb-1 block">Background Image</Label>
                            <div className="w-32 h-24 rounded-lg overflow-hidden bg-amber-50 relative group border border-amber-200">
                                {slide.background_image ? (
                                    <img src={slide.background_image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className="w-8 h-8 text-amber-300" />
                                    </div>
                                )}
                                <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    {isUploadingBackground ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Upload className="w-5 h-5 text-white" />
                                    )}
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={handleBackgroundImageUpload}
                                        disabled={isUploadingBackground}
                                    />
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Fields */}
                    <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs">Title <span className="text-red-500">*</span></Label>
                                <Input 
                                    value={slide.title || ''} 
                                    onChange={(e) => {
                                        const error = validateField('title', e.target.value);
                                        setErrors(prev => ({ ...prev, title: error }));
                                        onUpdate({ ...slide, title: e.target.value });
                                    }}
                                    placeholder="Slide title"
                                    className={`h-9 ${errors.title ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                />
                                {errors.title && (
                                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> {errors.title}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label className="text-xs">Location</Label>
                                <Input 
                                    value={slide.location || ''} 
                                    onChange={(e) => {
                                        const error = validateField('location', e.target.value);
                                        setErrors(prev => ({ ...prev, location: error }));
                                        onUpdate({ ...slide, location: e.target.value });
                                    }}
                                    placeholder="City, Country"
                                    className={`h-9 ${errors.location ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                />
                                {errors.location && (
                                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> {errors.location}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs">Description</Label>
                                <ReactQuill
                                    value={slide.description || ''}
                                    onChange={(content) => {
                                        if (content !== slide.description) {
                                            const error = validateField('description', content);
                                            setErrors(prev => ({ ...prev, description: error }));
                                            onUpdate({ ...slide, description: content });
                                        }
                                    }}
                                    placeholder="Describe this moment..."
                                    className={`bg-white rounded-md ${errors.description ? 'border border-red-500' : 'border'}`}
                                    style={{ height: '80px' }}
                                    modules={{
                                        toolbar: [
                                            ['bold', 'italic', 'underline'],
                                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                            ['link']
                                        ]
                                    }}
                                />
                                {errors.description && (
                                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> {errors.description}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <div>
                                    <Label className="text-xs">Card Style</Label>
                                    <Select 
                                        value={slide.card_style || 'default'} 
                                        onValueChange={(value) => onUpdate({ ...slide, card_style: value })}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="default">Default Card</SelectItem>
                                            <SelectItem value="full_background">Full Background</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs">Map Position (optional)</Label>
                                    <Link to={createPageUrl(`LocationPickerPage?returnTo=StoryEditor&storyId=${storyId}&chapterId=${chapterId}&slideId=${slide.id}${slide.coordinates ? `&lat=${slide.coordinates[0]}&lng=${slide.coordinates[1]}` : ''}`)}>
                                        <Button variant="outline" size="sm" className="h-9 w-full">
                                            <MapPin className="w-4 h-4 mr-1" /> Pick Location
                                        </Button>
                                    </Link>
                                    {slide.coordinates && slide.coordinates.length >= 2 && (
                                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {slide.coordinates[0]?.toFixed(4)}, {slide.coordinates[1]?.toFixed(4)}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label className="text-xs">Fly Duration (seconds)</Label>
                                    <Input 
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={slide.fly_duration !== undefined ? slide.fly_duration : ''} 
                                        onChange={(e) => onUpdate({ ...slide, fly_duration: e.target.value ? parseFloat(e.target.value) : undefined })}
                                        placeholder="Use chapter default"
                                        className="h-9"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Video Section */}
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <Label className="text-xs font-medium">Video (optional)</Label>
                            <p className="text-xs text-slate-500 mb-2">Enter a YouTube/Vimeo URL or upload a video file</p>
                            
                            {/* Video URL Input */}
                            <div className="mb-2">
                                <Label className="text-xs">Video URL</Label>
                                <Input 
                                    value={slide.video_url || ''} 
                                    onChange={(e) => onUpdate({ ...slide, video_url: e.target.value })}
                                    placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                                    className="h-9 text-xs"
                                />
                            </div>

                            {/* Video Upload */}
                            <div className="mb-2">
                                <Label className="text-xs">Or Upload Video File</Label>
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        setIsUploadingVideo(true);
                                        try {
                                            const { file_url } = await base44.integrations.Core.UploadFile({ file });
                                            onUpdate({ ...slide, video_url: file_url });
                                        } catch (error) {
                                            console.error('Failed to upload video:', error);
                                        } finally {
                                            setIsUploadingVideo(false);
                                            e.target.value = '';
                                        }
                                    }}
                                    className="hidden"
                                    id={`slide-video-upload-${slide.id}`}
                                    disabled={isUploadingVideo}
                                />
                                <label htmlFor={`slide-video-upload-${slide.id}`}>
                                    <Button 
                                        type="button" 
                                        variant="outline"
                                        size="sm"
                                        disabled={isUploadingVideo}
                                        onClick={() => document.getElementById(`slide-video-upload-${slide.id}`).click()}
                                        className="w-full h-8 mt-1"
                                    >
                                        {isUploadingVideo ? (
                                            <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Uploading Video...</>
                                        ) : (
                                            <><Video className="w-3 h-3 mr-2" /> Upload Video File</>
                                        )}
                                    </Button>
                                </label>
                            </div>

                            {/* Video Thumbnail */}
                            {slide.video_url && (
                                <div>
                                    <Label className="text-xs font-medium">Video Thumbnail</Label>
                                    <p className="text-xs text-slate-500 mb-2">Upload a preview image for the video</p>
                                    {slide.video_thumbnail_url ? (
                                        <div className="relative">
                                            <img 
                                                src={slide.video_thumbnail_url} 
                                                alt="Video thumbnail" 
                                                className="w-full h-24 object-cover rounded-lg"
                                            />
                                            <button
                                                onClick={() => onUpdate({ ...slide, video_thumbnail_url: '' })}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    setIsUploadingVideoThumbnail(true);
                                                    try {
                                                        const { file_url } = await base44.integrations.Core.UploadFile({ file });
                                                        onUpdate({ ...slide, video_thumbnail_url: file_url });
                                                    } catch (error) {
                                                        console.error('Failed to upload thumbnail:', error);
                                                    } finally {
                                                        setIsUploadingVideoThumbnail(false);
                                                        e.target.value = '';
                                                    }
                                                }}
                                                className="hidden"
                                                id={`slide-video-thumb-${slide.id}`}
                                                disabled={isUploadingVideoThumbnail}
                                            />
                                            <label htmlFor={`slide-video-thumb-${slide.id}`}>
                                                <Button 
                                                    type="button" 
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={isUploadingVideoThumbnail}
                                                    onClick={() => document.getElementById(`slide-video-thumb-${slide.id}`).click()}
                                                    className="w-full h-8"
                                                >
                                                    {isUploadingVideoThumbnail ? (
                                                        <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Uploading...</>
                                                    ) : (
                                                        <><Upload className="w-3 h-3 mr-2" /> Upload Thumbnail</>
                                                    )}
                                                </Button>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Clear Video */}
                            {slide.video_url && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onUpdate({ ...slide, video_url: '', video_thumbnail_url: '' })}
                                    className="w-full h-8 mt-2 text-red-500 hover:text-red-600"
                                >
                                    <X className="w-3 h-3 mr-2" /> Clear Video
                                </Button>
                            )}
                        </div>

                        {/* PDF Attachment */}
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <Label className="text-xs font-medium">PDF Attachment (optional)</Label>
                            <p className="text-xs text-slate-500 mb-2">Select from document library or upload new</p>
                            {slide.pdf_url ? (
                                <div className="flex items-center gap-2 p-2 bg-white rounded border border-blue-300">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                    <div className="flex-1">
                                        <p className="text-xs font-medium text-slate-700">PDF attached</p>
                                        {pdfFileName && (
                                            <p className="text-xs text-slate-500">{pdfFileName}</p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onUpdate({ ...slide, pdf_url: null });
                                            setPdfFileName('');
                                        }}
                                        className="text-red-500 hover:text-red-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowDocumentPicker(true)}
                                    className="w-full h-8"
                                >
                                    <FileText className="w-3 h-3 mr-2" /> Browse Documents
                                </Button>
                            )}
                        </div>

                        {/* Document Picker Dialog */}
                        <DocumentPicker
                            isOpen={showDocumentPicker}
                            onClose={() => setShowDocumentPicker(false)}
                            storyId={storyId}
                            onSelect={(doc) => {
                                onUpdate({ ...slide, pdf_url: doc.file_url });
                                setPdfFileName(doc.title + '.pdf');
                            }}
                        />
                    </div>

                    {/* Delete button */}
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={onDelete}
                        className="text-slate-400 hover:text-red-500 shrink-0"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}