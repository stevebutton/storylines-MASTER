import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';

const generateId = () => crypto.randomUUID().replace(/-/g, '').substring(0, 24);
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit2, Trash2, Eye, Map, Loader2, Search, Filter, ArrowUpDown, CheckCircle, FileEdit, Globe, Lock, Star, StarOff, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StoryCreationOptionsPanel from '@/components/editor/StoryCreationOptionsPanel';

export default function Stories() {
  const [stories, setStories] = useState([]);
  const [isLoadingStories, setIsLoadingStories] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [userFilter, setUserFilter] = useState('all');
  const [allUsers, setAllUsers] = useState([]);
  const [editingStory, setEditingStory] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('bg-slate-100 text-slate-800');
  const [isStoryCreationPanelOpen, setIsStoryCreationPanelOpen] = useState(false);

  useEffect(() => {
    loadStories();
    loadCategories();
  }, []);

  const loadStories = async () => {
    setIsLoadingStories(true);
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*');
      if (error) throw error;
      setStories(data || []);
    } catch (error) {
      console.error('Failed to load stories:', error);
    } finally {
      setIsLoadingStories(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const filteredAndSortedStories = useMemo(() => {
    let result = [...stories];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((story) =>
      story.title?.toLowerCase().includes(query) ||
      story.author?.toLowerCase().includes(query) ||
      story.subtitle?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((story) => story.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((story) =>
      statusFilter === 'published' ? story.is_published : !story.is_published
      );
    }

    // User filter (admin only)
    if (userFilter !== 'all') {
      result = result.filter((story) => story.created_by === userFilter);
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest': {
          const da = a.created_date ? new Date(a.created_date) : new Date();
          const db = b.created_date ? new Date(b.created_date) : new Date();
          return db - da;
        }
        case 'oldest': {
          const da = a.created_date ? new Date(a.created_date) : new Date();
          const db = b.created_date ? new Date(b.created_date) : new Date();
          return da - db;
        }
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'author':
          return (a.author || '').localeCompare(b.author || '');
        default:
          return 0;
      }
    });

    return result;
  }, [stories, searchQuery, categoryFilter, statusFilter, sortBy, userFilter]);

  const togglePublishStatus = async (story) => {
    try {
      const { error } = await supabase
        .from('stories')
        .update({ is_published: !story.is_published })
        .eq('id', story.id);
      if (error) throw error;
      loadStories();
    } catch (error) {
      console.error('Failed to update story:', error);
    }
  };

  const setAsMainStory = async (story) => {
    try {
      // Unset any current main story
      const currentMainStories = stories.filter((s) => s.is_main_story);
      for (const mainStory of currentMainStories) {
        const { error } = await supabase
          .from('stories')
          .update({ is_main_story: false })
          .eq('id', mainStory.id);
        if (error) throw error;
      }
      // Set new main story
      const { error } = await supabase
        .from('stories')
        .update({ is_main_story: true })
        .eq('id', story.id);
      if (error) throw error;
      loadStories();
    } catch (error) {
      console.error('Failed to set main story:', error);
    }
  };

  const getCategoryColor = (categoryName) => {
    const category = categories.find(c => c.name === categoryName);
    return category?.color || 'bg-slate-100 text-slate-800';
  };

  const deleteStory = async (storyId) => {
    if (!confirm('Are you sure you want to delete this story?')) return;

    try {
      // ON DELETE CASCADE handles chapters and slides automatically
      const { error } = await supabase.from('stories').delete().eq('id', storyId);
      if (error) throw error;
      loadStories();
    } catch (error) {
      console.error('Failed to delete story:', error);
    }
  };

  const updateStoryCategory = async () => {
    if (!editingStory || !newCategory.trim()) return;

    try {
      const { error } = await supabase
        .from('stories')
        .update({ category: newCategory.toLowerCase() })
        .eq('id', editingStory.id);
      if (error) throw error;
      setEditingStory(null);
      setNewCategory('');
      loadStories();
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const saveCategory = async () => {
    if (!categoryName.trim()) return;

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update({ name: categoryName.toLowerCase(), color: categoryColor })
          .eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('categories')
          .insert({ id: generateId(), name: categoryName.toLowerCase(), color: categoryColor });
        if (error) throw error;
      }
      setCategoryName('');
      setCategoryColor('bg-slate-100 text-slate-800');
      setEditingCategory(null);
      loadCategories();
    } catch (error) {
      console.error('Failed to save category:', error);
    }
  };

  const deleteCategory = async (categoryId) => {
    if (!confirm('Delete this category? Stories with this category will keep it.')) return;

    try {
      const { error } = await supabase.from('categories').delete().eq('id', categoryId);
      if (error) throw error;
      loadCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  if (isLoadingStories) {
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
                <div className="bg-slate-100 mx-auto px-4 py-6 max-w-6xl">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <Link to={createPageUrl('ProjectInterface')}>
                                <img 
                                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/af03c100d_storyline-logo.png" 
                                    alt="Storylines" 
                                    width="250"
                                    height="100"
                                    className="hover:opacity-80 transition-opacity cursor-pointer"
                                />
                            </Link>
                            <div>
                                <h1 className="text-slate-800 text-4xl font-bold">
                                    Project Collection: {currentUser?.full_name || currentUser?.email || 'User'}
                                </h1>
                                <p className="text-slate-500 mt-1">Connecting your world with stories that matter...</p>
                            </div>
                        </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                        <div className="bg-blue-50 rounded-lg p-4 flex flex-col items-start justify-center">
                            <p className="text-sm text-blue-600">Total Stories</p>
                            <p className="text-2xl font-bold text-blue-700">{stories.length}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 flex flex-col items-start justify-center">
                            <p className="text-sm text-green-600">Published</p>
                            <p className="text-2xl font-bold text-green-700">
                                {stories.filter((s) => s.is_published).length}
                            </p>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-4 flex flex-col items-start justify-center">
                            <p className="text-sm text-amber-600">Drafts</p>
                            <p className="text-2xl font-bold text-amber-700">
                                {stories.filter((s) => !s.is_published).length}
                            </p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 flex flex-col items-start justify-center">
                            <p className="text-sm text-purple-600">Categories</p>
                            <p className="text-2xl font-bold text-purple-700">
                                {new Set(stories.map((s) => s.category).filter(Boolean)).size}
                            </p>
                        </div>
                        <button 
                            className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg p-4 flex flex-col items-start justify-center h-full w-full transition-colors"
                            onClick={() => setIsCategoryManagerOpen(true)}
                        >
                            <Tag className="w-6 h-6 mb-1" /> 
                            <span className="text-sm font-semibold">Manage Categories</span>
                        </button>
                        <button 
                            className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg p-4 flex flex-col items-start justify-center h-full w-full transition-colors"
                            onClick={() => setIsStoryCreationPanelOpen(true)}
                        >
                            <Plus className="w-6 h-6 mb-1" /> 
                            <span className="text-sm font-semibold">New Story</span>
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                placeholder="Search stories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10" />

                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-[140px]">
                                <Filter className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                ))}
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
                        {currentUser?.role === 'admin' && allUsers.length > 0 && (
                            <Select value={userFilter} onValueChange={setUserFilter}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="User" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Users</SelectItem>
                                    {allUsers.map(user => (
                                        <SelectItem key={user.id} value={user.email}>
                                            {user.full_name || user.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                {stories.length === 0 ?
        <Card className="border-2 border-dashed">
                        <CardContent className="py-16 text-center">
                            <h3 className="text-lg font-medium text-slate-700 mb-2">No stories yet</h3>
                            <p className="text-slate-500 mb-6">Create your first interactive story map</p>
                            <Button 
                                className="bg-amber-600 hover:bg-amber-700"
                                onClick={() => setIsStoryCreationPanelOpen(true)}
                            >
                                <Plus className="w-4 h-4 mr-2" /> Create Story
                            </Button>
                        </CardContent>
                    </Card> :
        filteredAndSortedStories.length === 0 ?
        <Card>
                        <CardContent className="py-12 text-center">
                            <Search className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-700 mb-2">No matching stories</h3>
                            <p className="text-slate-500">Try adjusting your filters</p>
                        </CardContent>
                    </Card> :

        <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredAndSortedStories.map((story) =>
          <Card key={story.id} className="group hover:shadow-lg transition-shadow overflow-hidden">
                                <CardContent className="p-0">
                                    {/* Thumbnail — uses dedicated thumbnail field, falls back to hero image */}
                                    {(story.thumbnail || story.hero_image) ? (
                                        <div className="h-20 md:h-32 w-full overflow-hidden">
                                            <img
                                                src={story.thumbnail || story.hero_image}
                                                alt={story.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-20 md:h-32 w-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                                            <Map className="w-5 h-5 md:w-8 md:h-8 text-slate-300" />
                                        </div>
                                    )}

                                    {/* Status bar */}
                                    <div className={`px-2 py-1.5 md:px-4 md:py-2 flex items-center justify-between ${story.is_main_story ? 'bg-purple-50' : story.is_published ? 'bg-green-50' : 'bg-amber-50'}`}>
                                                                                            <div className="flex items-center gap-2">
                                                                                                {story.is_main_story &&
                  <>
                                                                                                        <Star className="w-3 h-3 md:w-3.5 md:h-3.5 text-purple-600 fill-purple-600" />
                                                                                                        <span className="text-[10px] md:text-xs font-medium text-purple-700">Main Story</span>
                                                                                                    </>
                  }
                                                                                                {!story.is_main_story && story.is_published &&
                  <>
                                                                                                        <Globe className="w-3 h-3 md:w-3.5 md:h-3.5 text-green-600" />
                                                                                                        <span className="text-[10px] md:text-xs font-medium text-green-700">Published</span>
                                                                                                    </>
                  }
                                                                                                {!story.is_main_story && !story.is_published &&
                  <>
                                                                                                        <FileEdit className="w-3 h-3 md:w-3.5 md:h-3.5 text-amber-600" />
                                                                                                        <span className="text-[10px] md:text-xs font-medium text-amber-700">Draft</span>
                                                                                                    </>
                  }
                                                                                            </div>
                                                                                            <div className="flex items-center gap-1">
                                                                                                {!story.is_main_story &&
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAsMainStory(story)}
                    className="h-6 text-xs"
                    title="Set as Main Story">

                                                                                                        <Star className="w-3 h-3 mr-1" /> Set Main
                                                                                                    </Button>
                  }
                                                                                                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePublishStatus(story)}
                    className="h-6 text-xs">

                                                                                                    {story.is_published ?
                    <><Lock className="w-3 h-3 mr-1" /> Unpublish</> :

                    <><Globe className="w-3 h-3 mr-1" /> Publish</>
                    }
                                                                                                </Button>
                                                                                            </div>
                                                                                        </div>

                                    <div className="p-2.5 md:p-5">
                                        <div className="flex items-start justify-between mb-1.5 md:mb-2">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-slate-800 text-base md:text-xl font-semibold truncate">
                                                    {story.title || 'Untitled Story'}
                                                </h3>
                                                {story.author &&
                    <p className="text-xs md:text-sm text-slate-500">by {story.author}</p>
                    }
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                                            {story.category &&
                <Badge className={getCategoryColor(story.category)}>
                                                    {story.category}
                                                </Badge>
                }
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setEditingStory(story);
                                                            setNewCategory(story.category || '');
                                                        }}
                                                        className="h-6 px-2"
                                                    >
                                                        <Tag className="w-3 h-3" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Edit Category</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="space-y-4 pt-4">
                                                        <div>
                                                            <Label htmlFor="category">Select Category</Label>
                                                            <Select value={newCategory} onValueChange={setNewCategory}>
                                                                <SelectTrigger id="category">
                                                                    <SelectValue placeholder="Choose a category" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {categories.map(cat => (
                                                                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div>
                                                            <Label htmlFor="custom-category">Or Enter Custom Category</Label>
                                                            <Input
                                                                id="custom-category"
                                                                placeholder="e.g., food, art, sports"
                                                                value={newCategory}
                                                                onChange={(e) => setNewCategory(e.target.value)}
                                                            />
                                                        </div>
                                                        <Button onClick={updateStoryCategory} className="w-full bg-amber-600 hover:bg-amber-700">
                                                            Update Category
                                                        </Button>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                        
                                        {story.subtitle &&
                <p className="text-[11px] md:text-sm text-slate-600 line-clamp-2 mb-2 md:mb-4">
                                                {story.subtitle}
                                            </p>
                }

                                        <p className="text-[10px] md:text-xs text-slate-400 mb-2 md:mb-4">
                                            Created {new Date(story.created_date).toLocaleDateString()}
                                        </p>

                                        <div className="flex items-stretch gap-0 pt-2 md:pt-3 border-t overflow-hidden rounded-lg">
                                            <Link to={`${createPageUrl('StoryEditor')}?id=${story.id}`} className="flex-1">
                                                <button className="w-full h-[50px] bg-blue-50 hover:bg-blue-100 transition-colors flex flex-col items-center justify-center">
                                                    <Edit2 className="w-4 h-4 text-blue-600 mb-0.5" />
                                                    <span className="text-xs text-blue-700 font-semibold">Edit</span>
                                                </button>
                                            </Link>
                                            <Link to={`${createPageUrl('StoryMapView')}?id=${story.id}`} className="flex-1">
                                                <button className="w-full h-[50px] bg-green-50 hover:bg-green-100 transition-colors flex flex-col items-center justify-center border-l border-r border-white">
                                                    <Eye className="w-4 h-4 text-green-600 mb-0.5" />
                                                    <span className="text-xs text-green-700 font-semibold">View</span>
                                                </button>
                                            </Link>
                                            <button
                                                onClick={() => deleteStory(story.id)}
                                                className="flex-1 h-[50px] bg-red-50 hover:bg-red-100 transition-colors flex flex-col items-center justify-center"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-600 mb-0.5" />
                                                <span className="text-xs text-red-700 font-semibold">Trash</span>
                                            </button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
          )}
                    </div>
        }
            </div>

            {/* Story Creation Options Panel */}
            <StoryCreationOptionsPanel
                isOpen={isStoryCreationPanelOpen}
                onClose={() => setIsStoryCreationPanelOpen(false)}
            />

            {/* Category Manager Dialog */}
            <Dialog open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Manage Categories</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 pt-4">
                        {/* Add/Edit Form */}
                        <div className="border rounded-lg p-4 space-y-4">
                            <h3 className="font-semibold">{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
                            <div>
                                <Label htmlFor="cat-name">Category Name</Label>
                                <Input
                                    id="cat-name"
                                    placeholder="e.g., food, art, sports"
                                    value={categoryName}
                                    onChange={(e) => setCategoryName(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Badge Color</Label>
                                <div className="grid grid-cols-4 gap-2 mt-2">
                                    {[
                                        { label: 'Blue', value: 'bg-blue-100 text-blue-800' },
                                        { label: 'Amber', value: 'bg-amber-100 text-amber-800' },
                                        { label: 'Green', value: 'bg-green-100 text-green-800' },
                                        { label: 'Purple', value: 'bg-purple-100 text-purple-800' },
                                        { label: 'Red', value: 'bg-red-100 text-red-800' },
                                        { label: 'Pink', value: 'bg-pink-100 text-pink-800' },
                                        { label: 'Indigo', value: 'bg-indigo-100 text-indigo-800' },
                                        { label: 'Gray', value: 'bg-slate-100 text-slate-800' }
                                    ].map((color) => (
                                        <button
                                            key={color.value}
                                            onClick={() => setCategoryColor(color.value)}
                                            className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${color.value} ${
                                                categoryColor === color.value ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                                            }`}
                                        >
                                            {color.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={saveCategory} className="flex-1 bg-amber-600 hover:bg-amber-700">
                                    {editingCategory ? 'Update' : 'Add'} Category
                                </Button>
                                {editingCategory && (
                                    <Button 
                                        variant="outline" 
                                        onClick={() => {
                                            setEditingCategory(null);
                                            setCategoryName('');
                                            setCategoryColor('bg-slate-100 text-slate-800');
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Categories List */}
                        <div>
                            <h3 className="font-semibold mb-3">Existing Categories</h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {categories.map((cat) => (
                                    <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <Badge className={cat.color}>{cat.name}</Badge>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setEditingCategory(cat);
                                                    setCategoryName(cat.name);
                                                    setCategoryColor(cat.color);
                                                }}
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => deleteCategory(cat.id)}
                                                className="text-red-500 hover:text-red-600"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {categories.length === 0 && (
                                    <p className="text-center text-slate-500 py-8">No categories yet</p>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>);

}