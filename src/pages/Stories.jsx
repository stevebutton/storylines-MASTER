import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Edit2, Trash2, Eye, Map, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Stories() {
    const [stories, setStories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStories();
    }, []);

    const loadStories = async () => {
        setIsLoading(true);
        try {
            const data = await base44.entities.Story.list('-created_date');
            setStories(data);
        } catch (error) {
            console.error('Failed to load stories:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const deleteStory = async (storyId) => {
        if (!confirm('Are you sure you want to delete this story?')) return;
        
        try {
            // Delete all chapters and slides
            const chapters = await base44.entities.Chapter.filter({ story_id: storyId });
            for (const chapter of chapters) {
                const slides = await base44.entities.Slide.filter({ chapter_id: chapter.id });
                for (const slide of slides) {
                    await base44.entities.Slide.delete(slide.id);
                }
                await base44.entities.Chapter.delete(chapter.id);
            }
            await base44.entities.Story.delete(storyId);
            loadStories();
        } catch (error) {
            console.error('Failed to delete story:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="max-w-5xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">My Stories</h1>
                            <p className="text-slate-500 mt-1">Create and manage your interactive story maps</p>
                        </div>
                        <Link to={createPageUrl('StoryEditor')}>
                            <Button className="bg-amber-600 hover:bg-amber-700">
                                <Plus className="w-4 h-4 mr-2" /> New Story
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-4 py-8">
                {stories.length === 0 ? (
                    <Card className="border-2 border-dashed">
                        <CardContent className="py-16 text-center">
                            <Map className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-700 mb-2">No stories yet</h3>
                            <p className="text-slate-500 mb-6">Create your first interactive story map</p>
                            <Link to={createPageUrl('StoryEditor')}>
                                <Button className="bg-amber-600 hover:bg-amber-700">
                                    <Plus className="w-4 h-4 mr-2" /> Create Story
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {stories.map((story) => (
                            <Card key={story.id} className="group hover:shadow-lg transition-shadow">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-slate-800 truncate">
                                                {story.title || 'Untitled Story'}
                                            </h3>
                                            {story.author && (
                                                <p className="text-sm text-slate-500">by {story.author}</p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {story.subtitle && (
                                        <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                                            {story.subtitle}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-2 pt-3 border-t">
                                        <Link to={`${createPageUrl('StoryEditor')}?id=${story.id}`} className="flex-1">
                                            <Button variant="outline" size="sm" className="w-full">
                                                <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
                                            </Button>
                                        </Link>
                                        <Link to={`${createPageUrl('StoryMapView')}?id=${story.id}`}>
                                            <Button variant="outline" size="sm">
                                                <Eye className="w-3.5 h-3.5" />
                                            </Button>
                                        </Link>
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => deleteStory(story.id)}
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}