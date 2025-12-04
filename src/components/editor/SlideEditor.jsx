import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { GripVertical, Trash2, Upload, Image as ImageIcon, MapPin } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import LocationPicker from './LocationPicker';

export default function SlideEditor({ slide, onUpdate, onDelete, dragHandleProps }) {
    const [isUploading, setIsUploading] = useState(false);

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
                                <Label className="text-xs">Title</Label>
                                <Input 
                                    value={slide.title || ''} 
                                    onChange={(e) => onUpdate({ ...slide, title: e.target.value })}
                                    placeholder="Slide title"
                                    className="h-9"
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Location</Label>
                                <Input 
                                    value={slide.location || ''} 
                                    onChange={(e) => onUpdate({ ...slide, location: e.target.value })}
                                    placeholder="City, Country"
                                    className="h-9"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs">Description</Label>
                                <Textarea 
                                    value={slide.description || ''} 
                                    onChange={(e) => onUpdate({ ...slide, description: e.target.value })}
                                    placeholder="Describe this moment..."
                                    className="h-16 resize-none"
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Map Position (optional)</Label>
                                <LocationPicker
                                    coordinates={slide.coordinates}
                                    zoom={slide.zoom}
                                    onSelect={(coords, zoom) => onUpdate({ ...slide, coordinates: coords, zoom: zoom })}
                                />
                                {slide.coordinates && slide.coordinates.length >= 2 && (
                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {slide.coordinates[0]?.toFixed(4)}, {slide.coordinates[1]?.toFixed(4)}
                                    </p>
                                )}
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