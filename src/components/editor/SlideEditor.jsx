import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { GripVertical, Trash2, Upload, Image as ImageIcon, MapPin, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

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
    const [errors, setErrors] = useState({});

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

    return (
        <Card className="border-slate-200">
            <CardContent className="p-4">
                <div className="flex gap-4">
                    {/* Drag handle */}
                    <div {...dragHandleProps} className="cursor-grab pt-2">
                        <GripVertical className="w-5 h-5 text-slate-400" />
                    </div>

                    {/* Image upload */}
                    <div className="w-32 h-24 shrink-0 rounded-lg overflow-hidden bg-slate-100 relative group">
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
                                        // Only update if content actually changed
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