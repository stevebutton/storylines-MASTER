import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, GripVertical, Trash2, Plus, MapPin } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import SlideEditor from './SlideEditor';

export default function ChapterEditor({ 
    chapter, 
    slides, 
    index, 
    onUpdateChapter, 
    onDeleteChapter,
    onAddSlide,
    onUpdateSlide,
    onDeleteSlide,
    onReorderSlides,
    dragHandleProps 
}) {
    const [isOpen, setIsOpen] = useState(true);

    const handleCoordinateChange = (idx, value) => {
        const newCoords = [...(chapter.coordinates || [0, 0])];
        newCoords[idx] = parseFloat(value) || 0;
        onUpdateChapter({ ...chapter, coordinates: newCoords });
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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-lg">
                            <div>
                                <Label className="text-xs flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> Latitude
                                </Label>
                                <Input 
                                    type="number"
                                    step="0.0001"
                                    value={chapter.coordinates?.[0] || ''} 
                                    onChange={(e) => handleCoordinateChange(0, e.target.value)}
                                    placeholder="41.8902"
                                    className="h-9"
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Longitude</Label>
                                <Input 
                                    type="number"
                                    step="0.0001"
                                    value={chapter.coordinates?.[1] || ''} 
                                    onChange={(e) => handleCoordinateChange(1, e.target.value)}
                                    placeholder="12.4922"
                                    className="h-9"
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Zoom</Label>
                                <Input 
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={chapter.zoom || 12} 
                                    onChange={(e) => onUpdateChapter({ ...chapter, zoom: parseInt(e.target.value) || 12 })}
                                    className="h-9"
                                />
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