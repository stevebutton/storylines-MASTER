import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, GripVertical, Trash2, Plus, MapPin, AlertCircle, Eye } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import SlideEditor from './SlideEditor';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const validateCoordinate = (value, type) => {
    if (value === '' || value === undefined || value === null) return null;
    const num = parseFloat(value);
    if (isNaN(num)) return 'Must be a number';
    if (type === 'lat' && (num < -90 || num > 90)) return 'Latitude must be between -90 and 90';
    if (type === 'lng' && (num < -180 || num > 180)) return 'Longitude must be between -180 and 180';
    return null;
};

const validateZoom = (value) => {
    if (value === '' || value === undefined || value === null) return null;
    const num = parseInt(value);
    if (isNaN(num)) return 'Must be a number';
    if (num < 1 || num > 20) return 'Zoom must be 1-20';
    return null;
};

export default function ChapterEditor({ 
    chapter, 
    slides, 
    index,
    storyId,
    onUpdateChapter, 
    onDeleteChapter,
    onAddSlide,
    onUpdateSlide,
    onDeleteSlide,
    onReorderSlides,
    dragHandleProps 
}) {
    const [isOpen, setIsOpen] = useState(true);
    const [errors, setErrors] = useState({});

    const handleCoordinateChange = (idx, value) => {
        const type = idx === 0 ? 'lat' : 'lng';
        const error = validateCoordinate(value, type);
        setErrors(prev => ({ ...prev, [type]: error }));
        
        const newCoords = [...(chapter.coordinates || [0, 0])];
        newCoords[idx] = parseFloat(value) || 0;
        onUpdateChapter({ ...chapter, coordinates: newCoords });
    };

    const handleZoomChange = (value) => {
        const error = validateZoom(value);
        setErrors(prev => ({ ...prev, zoom: error }));
        onUpdateChapter({ ...chapter, zoom: parseInt(value) || 12 });
    };

    const handleLocationSelect = (coords, locationName) => {
        onUpdateChapter({ ...chapter, coordinates: coords });
        // If first slide exists and has no location, update it
        if (slides[0] && !slides[0].location && locationName) {
            onUpdateSlide({ ...slides[0], location: locationName.split(',')[0] });
        }
    };

    const handleDragEnd = (result) => {
        if (!result.destination) return;
        onReorderSlides(chapter.id, result.source.index, result.destination.index);
    };

    const firstSlideTitle = slides[0]?.title || `Chapter ${index + 1}`;

    return (
        <Card className="border-slate-200 overflow-hidden">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CardHeader className="p-0">
                    <div className="flex items-center gap-2 p-4 bg-slate-50 border-b">
                        <div {...dragHandleProps} className="cursor-grab">
                            <GripVertical className="w-5 h-5 text-slate-400" />
                        </div>
                        
                        <CollapsibleTrigger className="flex items-center gap-2 flex-1">
                            {isOpen ? (
                                <ChevronDown className="w-4 h-4 text-slate-500" />
                            ) : (
                                <ChevronRight className="w-4 h-4 text-slate-500" />
                            )}
                            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                                Chapter {index + 1}
                            </span>
                            <span className="text-sm font-medium text-slate-700 truncate">
                                {firstSlideTitle}
                            </span>
                            <span className="text-xs text-slate-400 ml-auto mr-2">
                                {slides.length} slide{slides.length !== 1 ? 's' : ''}
                            </span>
                        </CollapsibleTrigger>

                        <Link to={createPageUrl(`ChapterPreview?storyId=${storyId}&chapterId=${chapter.id}`)}>
                            <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-slate-400 hover:text-amber-600"
                                title="Preview Chapter"
                            >
                                <Eye className="w-4 h-4" />
                            </Button>
                        </Link>
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => onDeleteChapter(chapter.id)}
                            className="text-slate-400 hover:text-red-500"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>

                <CollapsibleContent>
                    <CardContent className="p-4 space-y-4">
                        {/* Map Settings */}
                        <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-amber-600" /> Location
                                </Label>
                                <Link to={createPageUrl(`LocationPickerPage?returnTo=StoryEditor&storyId=${storyId}&chapterId=${chapter.id}${chapter.coordinates ? `&lat=${chapter.coordinates[0]}&lng=${chapter.coordinates[1]}` : ''}`)}>
                                    <Button variant="outline" size="sm" className="h-9">
                                        <MapPin className="w-4 h-4 mr-1" /> Pick Location
                                    </Button>
                                </Link>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div>
                                    <Label className="text-xs">Latitude</Label>
                                    <Input 
                                        type="number"
                                        step="0.0001"
                                        value={chapter.coordinates?.[0] || ''} 
                                        onChange={(e) => handleCoordinateChange(0, e.target.value)}
                                        placeholder="41.8902"
                                        className={`h-9 ${errors.lat ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                    />
                                    {errors.lat && (
                                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> {errors.lat}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label className="text-xs">Longitude</Label>
                                    <Input 
                                        type="number"
                                        step="0.0001"
                                        value={chapter.coordinates?.[1] || ''} 
                                        onChange={(e) => handleCoordinateChange(1, e.target.value)}
                                        placeholder="12.4922"
                                        className={`h-9 ${errors.lng ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                    />
                                    {errors.lng && (
                                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> {errors.lng}
                                        </p>
                                    )}
                                </div>
                            <div>
                                <Label className="text-xs">Zoom</Label>
                                <Input 
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={chapter.zoom || 12} 
                                    onChange={(e) => handleZoomChange(e.target.value)}
                                    className={`h-9 ${errors.zoom ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                />
                                {errors.zoom && (
                                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> {errors.zoom}
                                    </p>
                                )}
                            </div>
                                <div>
                                    <Label className="text-xs">Map Style</Label>
                                    <Select 
                                        value={chapter.map_style || 'light'} 
                                        onValueChange={(value) => onUpdateChapter({ ...chapter, map_style: value })}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="light">Light</SelectItem>
                                            <SelectItem value="dark">Dark</SelectItem>
                                            <SelectItem value="satellite">Satellite</SelectItem>
                                            <SelectItem value="watercolor">Watercolor</SelectItem>
                                            <SelectItem value="terrain">Terrain</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Slides */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <Label className="text-sm font-medium">Slides</Label>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => onAddSlide(chapter.id)}
                                >
                                    <Plus className="w-4 h-4 mr-1" /> Add Slide
                                </Button>
                            </div>

                            <DragDropContext onDragEnd={handleDragEnd}>
                                <Droppable droppableId={`slides-${chapter.id}`}>
                                    {(provided) => (
                                        <div 
                                            ref={provided.innerRef} 
                                            {...provided.droppableProps}
                                            className="space-y-2"
                                        >
                                            {slides.map((slide, slideIndex) => (
                                                <Draggable 
                                                    key={slide.id} 
                                                    draggableId={slide.id} 
                                                    index={slideIndex}
                                                >
                                                    {(provided) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                        >
                                                            <SlideEditor
                                                                slide={slide}
                                                                storyId={storyId}
                                                                chapterId={chapter.id}
                                                                onUpdate={onUpdateSlide}
                                                                onDelete={() => onDeleteSlide(slide.id)}
                                                                dragHandleProps={provided.dragHandleProps}
                                                            />
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </DragDropContext>

                            {slides.length === 0 && (
                                <div className="text-center py-8 text-slate-400 border-2 border-dashed rounded-lg">
                                    No slides yet. Add your first slide.
                                </div>
                            )}
                            </div>
                            </CardContent>
                            </CollapsibleContent>
                            </Collapsible>
                            </Card>
                            );
                            }