import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Eye, Map, Loader2, Search, Filter, ArrowUpDown, CheckCircle, FileEdit, Globe, Lock, Star, StarOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Stories() {
    const [stories, setStories] = useState([]);
    const [storyThumbnails, setStoryThumbnails] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');

    useEffect(() => {
        loadStories();
    }, []);

    const loadStories = async () => {
        setIsLoading(true);
        try {
            const data = await base44.entities.Story.list('-created_date');
            setStories(data);
            
            // Load thumbnails for each story
            const thumbnails = {};
            for (const story of data) {
                const chapters = await base44.entities.Chapter.filter({ story_id: story.id }, 'order', 1);
                if (chapters.length > 0) {
                    const slides = await base44.entities.Slide.filter({ chapter_id: chapters[0].id }, 'order', 1);
                    if (slides.length > 0 && slides[0].image) {
                        thumbnails[story.id] = slides[0].image;
                    }
                }
            }
            setStoryThumbnails(thumbnails);
        } catch (error) {
            console.error('Failed to load stories:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredAndSortedStories = useMemo(() => {
        let result = [...stories];

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(story => 
                story.title?.toLowerCase().includes(query) ||
                story.author?.toLowerCase().includes(query) ||
                story.subtitle?.toLowerCase().includes(query)
            );
        }

        // Category filter
        if (categoryFilter !== 'all') {
            result = result.filter(story => story.category === categoryFilter);
        }

        // Status filter
        if (statusFilter !== 'all') {
            result = result.filter(story => 
                statusFilter === 'published' ? story.is_published : !story.is_published
            );
        }

        // Sorting
        result.sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.created_date) - new Date(a.created_date);
                case 'oldest':
                    return new Date(a.created_date) - new Date(b.created_date);
                case 'title':
                    return (a.title || '').localeCompare(b.title || '');
                case 'author':
                    return (a.author || '').localeCompare(b.author || '');
                default:
                    return 0;
            }
        });

        return result;
    }, [stories, searchQuery, categoryFilter, statusFilter, sortBy]);

    const togglePublishStatus = async (story) => {
        try {
            await base44.entities.Story.update(story.id, { is_published: !story.is_published });
            loadStories();
        } catch (error) {
            console.error('Failed to update story:', error);
        }
    };

    const setAsMainStory = async (story) => {
        try {
            // Unset any current main story
            const currentMainStories = stories.filter(s => s.is_main_story);
            for (const mainStory of currentMainStories) {
                await base44.entities.Story.update(mainStory.id, { is_main_story: false });
            }
            // Set new main story
            await base44.entities.Story.update(story.id, { is_main_story: true });
            loadStories();
        } catch (error) {
            console.error('Failed to set main story:', error);
        }
    };

    const categoryColors = {
        travel: 'bg-blue-100 text-blue-800',
        history: 'bg-amber-100 text-amber-800',
        nature: 'bg-green-100 text-green-800',
        culture: 'bg-purple-100 text-purple-800',
        adventure: 'bg-red-100 text-red-800',
        other: 'bg-slate-100 text-slate-800'
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
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Story Dashboard</h1>
                            <p className="text-slate-500 mt-1">Create and manage your interactive story maps</p>
                        </div>
                        <Link to={createPageUrl('StoryEditor')}>
                            <Button className="bg-amber-600 hover:bg-amber-700">
                                <Plus className="w-4 h-4 mr-2" /> New Story
                            </Button>
                        </Link>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-slate-50 rounded-lg p-4">
                            <p className="text-sm text-slate-500">Total Stories</p>
                            <p className="text-2xl font-bold text-slate-800">{stories.length}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                            <p className="text-sm text-green-600">Published</p>
                            <p className="text-2xl font-bold text-green-700">
                                {stories.filter(s => s.is_published).length}
                            </p>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-4">
                            <p className="text-sm text-amber-600">Drafts</p>
                            <p className="text-2xl font-bold text-amber-700">
                                {stories.filter(s => !s.is_published).length}
                            </p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4">
                            <p className="text-sm text-blue-600">Categories</p>
                            <p className="text-2xl font-bold text-blue-700">
                                {new Set(stories.map(s => s.category).filter(Boolean)).size}
                            </p>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input 
                                placeholder="Search stories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-[140px]">
                                <Filter className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                <SelectItem value="travel">Travel</SelectItem>
                                <SelectItem value="history">History</SelectItem>
                                <SelectItem value="nature">Nature</SelectItem>
                                <SelectItem value="culture">Culture</SelectItem>
                                <SelectItem value="adventure">Adventure</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[130px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="published">Published</SelectItem>
                                <SelectItem value="draft">Drafts</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-[130px]">
                                <ArrowUpDown className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="Sort" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">Newest</SelectItem>
                                <SelectItem value="oldest">Oldest</SelectItem>
                                <SelectItem value="title">Title A-Z</SelectItem>
                                <SelectItem value="author">Author A-Z</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-8">
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
                ) : filteredAndSortedStories.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Search className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-700 mb-2">No matching stories</h3>
                            <p className="text-slate-500">Try adjusting your filters</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredAndSortedStories.map((story) => (
                            <Card key={story.id} className="group hover:shadow-lg transition-shadow overflow-hidden">
                                <CardContent className="p-0">
                                    {/* Thumbnail */}
                                    {storyThumbnails[story.id] ? (
                                        <div className="h-32 w-full overflow-hidden">
                                            <img 
                                                src={storyThumbnails[story.id]} 
                                                alt={story.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-32 w-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                                            <Map className="w-8 h-8 text-slate-300" />
                                        </div>
                                    )}

                                    {/* Status bar */}
                                    <div className={`px-4 py-2 flex items-center justify-between ${story.is_main_story ? 'bg-purple-50' : story.is_published ? 'bg-green-50' : 'bg-amber-50'}`}>
                                                                                            <div className="flex items-center gap-2">
                                                                                                {story.is_main_story && (
                                                                                                    <>
                                                                                                        <Star className="w-3.5 h-3.5 text-purple-600 fill-purple-600" />
                                                                                                        <span className="text-xs font-medium text-purple-700">Main Story</span>
                                                                                                    </>
                                                                                                )}
                                                                                                {!story.is_main_story && story.is_published && (
                                                                                                    <>
                                                                                                        <Globe className="w-3.5 h-3.5 text-green-600" />
                                                                                                        <span className="text-xs font-medium text-green-700">Published</span>
                                                                                                    </>
                                                                                                )}
                                                                                                {!story.is_main_story && !story.is_published && (
                                                                                                    <>
                                                                                                        <FileEdit className="w-3.5 h-3.5 text-amber-600" />
                                                                                                        <span className="text-xs font-medium text-amber-700">Draft</span>
                                                                                                    </>
                                                                                                )}
                                                                                            </div>
                                                                                            <div className="flex items-center gap-1">
                                                                                                {!story.is_main_story && (
                                                                                                    <Button
                                                                                                        variant="ghost"
                                                                                                        size="sm"
                                                                                                        onClick={() => setAsMainStory(story)}
                                                                                                        className="h-6 text-xs"
                                                                                                        title="Set as Main Story"
                                                                                                    >
                                                                                                        <Star className="w-3 h-3 mr-1" /> Set Main
                                                                                                    </Button>
                                                                                                )}
                                                                                                <Button
                                                                                                    variant="ghost"
                                                                                                    size="sm"
                                                                                                    onClick={() => togglePublishStatus(story)}
                                                                                                    className="h-6 text-xs"
                                                                                                >
                                                                                                    {story.is_published ? (
                                                                                                        <><Lock className="w-3 h-3 mr-1" /> Unpublish</>
                                                                                                    ) : (
                                                                                                        <><Globe className="w-3 h-3 mr-1" /> Publish</>
                                                                                                    )}
                                                                                                </Button>
                                                                                            </div>
                                                                                        </div>

                                    <div className="p-5">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-slate-800 truncate">
                                                    {story.title || 'Untitled Story'}
                                                </h3>
                                                {story.author && (
                                                    <p className="text-sm text-slate-500">by {story.author}</p>
                                                )}
                                            </div>
                                        </div>

                                        {story.category && (
                                            <Badge className={`${categoryColors[story.category]} mb-3`}>
                                                {story.category}
                                            </Badge>
                                        )}
                                        
                                        {story.subtitle && (
                                            <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                                                {story.subtitle}
                                            </p>
                                        )}

                                        <p className="text-xs text-slate-400 mb-4">
                                            Created {new Date(story.created_date).toLocaleDateString()}
                                        </p>

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