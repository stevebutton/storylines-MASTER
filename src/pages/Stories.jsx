import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

const generateId = () => crypto.randomUUID().replace(/-/g, '').substring(0, 24);
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit2, Trash2, Eye, Map, Loader2, Search, Filter, ArrowUpDown, CheckCircle, FileEdit, Globe, Lock, Star, StarOff, Tag, Home, Layers, Lightbulb, LogOut, Users, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StoryCreationOptionsPanel from '@/components/editor/StoryCreationOptionsPanel';

export default function Stories() {
  const { profile: currentUser, logout } = useAuth();
  const [stories, setStories] = useState([]);
  const [isLoadingStories, setIsLoadingStories] = useState(true);
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
  const [seriesCount, setSeriesCount] = useState(0);

  useEffect(() => {
    loadStories();
    loadCategories();
    loadSeriesCount();
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

  const loadSeriesCount = async () => {
    try {
      const { count } = await supabase.from('series').select('*', { count: 'exact', head: true });
      setSeriesCount(count || 0);
    } catch (e) { console.error(e); }
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
    if (statusFilter === 'ideas')     result = result.filter(s => s.is_idea);
    if (statusFilter === 'published') result = result.filter(s => s.is_published && !s.is_idea);
    if (statusFilter === 'draft')     result = result.filter(s => !s.is_published && !s.is_idea);

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

  const setAsIdea = async (story) => {
    const { error } = await supabase.from('stories')
      .update({ is_idea: true, is_published: false }).eq('id', story.id);
    if (!error) loadStories();
  };

  const moveToDraft = async (story) => {
    const { error } = await supabase.from('stories')
      .update({ is_idea: false, is_published: false }).eq('id', story.id);
    if (!error) loadStories();
  };

  const publishStory = async (story) => {
    if (story.is_idea) return;
    const { error } = await supabase.from('stories')
      .update({ is_published: true }).eq('id', story.id);
    if (!error) loadStories();
  };

  const unpublishStory = async (story) => {
    const { error } = await supabase.from('stories')
      .update({ is_published: false }).eq('id', story.id);
    if (!error) loadStories();
  };

  const toggleFeatured = async (story) => {
    const isFeatured = story.category === 'featured';
    try {
      const { error } = await supabase
        .from('stories')
        .update({ category: isFeatured ? null : 'featured' })
        .eq('id', story.id);
      if (error) throw error;
      loadStories();
    } catch (error) {
      console.error('Failed to update featured status:', error);
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
                <div className="bg-white mx-auto px-4 py-6 max-w-6xl">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <Link to={createPageUrl('HomePageView')}>
                                <img
                                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/af03c100d_storyline-logo.png"
                                    alt="Storylines"
                                    width="250"
                                    height="100"
                                    className="hover:opacity-80 transition-opacity cursor-pointer"
                                />
                            </Link>
                            <div>
                                <h1 className="text-slate-800 text-[42px] font-bold">
                                    Project Collection: {currentUser?.full_name || currentUser?.email || 'User'}
                                </h1>
                                <p className="text-slate-500 mt-1">Connecting your world with stories that matter...</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {currentUser?.role === 'admin' && (
                                <>
                                    <Link
                                        to={createPageUrl('LoginEditor')}
                                        className="text-sm text-slate-600 hover:text-slate-800 font-medium transition-colors flex items-center gap-1"
                                    >
                                        <LogIn className="w-4 h-4" />
                                        Edit Login
                                    </Link>
                                    <Link
                                        to={createPageUrl('UserManagement')}
                                        className="text-sm text-slate-600 hover:text-slate-800 font-medium transition-colors flex items-center gap-1"
                                    >
                                        <Users className="w-4 h-4" />
                                        Manage Users
                                    </Link>
                                </>
                            )}
                            <Link
                                to={createPageUrl('HomePageView')}
                                className="text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors flex items-center gap-1"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Home className="w-4 h-4" />
                                View Home Page
                            </Link>
                            <Link
                                to={createPageUrl('StoriesDebug')}
                                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                Debug view
                            </Link>
                            <button
                                onClick={logout}
                                className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
                                title="Sign out"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                Sign out
                            </button>
                        </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex flex-wrap items-stretch gap-4 mb-6">
                        <button onClick={() => setStatusFilter('all')} className={`rounded-lg px-4 py-3 flex flex-col items-start justify-center transition-colors cursor-pointer ${statusFilter === 'all' ? 'bg-blue-200 ring-2 ring-blue-400' : 'bg-blue-50 hover:bg-blue-100'}`}>
                            <p className="text-sm text-blue-600">Total Stories</p>
                            <p className="text-2xl font-bold text-blue-700">{stories.length}</p>
                        </button>
                        <button onClick={() => setStatusFilter('published')} className={`rounded-lg px-4 py-3 flex flex-col items-start justify-center transition-colors cursor-pointer ${statusFilter === 'published' ? 'bg-green-200 ring-2 ring-green-400' : 'bg-green-50 hover:bg-green-100'}`}>
                            <p className="text-sm text-green-600">Published</p>
                            <p className="text-2xl font-bold text-green-700">
                                {stories.filter((s) => s.is_published).length}
                            </p>
                        </button>
                        <button onClick={() => setStatusFilter('draft')} className={`rounded-lg px-4 py-3 flex flex-col items-start justify-center transition-colors cursor-pointer ${statusFilter === 'draft' ? 'bg-amber-200 ring-2 ring-amber-400' : 'bg-amber-50 hover:bg-amber-100'}`}>
                            <p className="text-sm text-amber-600">Drafts</p>
                            <p className="text-2xl font-bold text-amber-700">
                                {stories.filter((s) => !s.is_published && !s.is_idea).length}
                            </p>
                        </button>
                        <button onClick={() => setStatusFilter('ideas')} className={`rounded-lg px-4 py-3 flex flex-col items-start justify-center transition-colors cursor-pointer ${statusFilter === 'ideas' ? 'bg-teal-200 ring-2 ring-teal-400' : 'bg-teal-50 hover:bg-teal-100'}`}>
                            <p className="text-sm text-teal-600">Ideas</p>
                            <p className="text-2xl font-bold text-teal-700">
                                {stories.filter((s) => s.is_idea).length}
                            </p>
                        </button>
                        <button onClick={() => setIsCategoryManagerOpen(true)} className="bg-purple-50 hover:bg-purple-100 rounded-lg px-4 py-3 flex flex-col items-start justify-center transition-colors cursor-pointer">
                            <p className="text-sm text-purple-600">Categories</p>
                            <p className="text-2xl font-bold text-purple-700">
                                {new Set(stories.map((s) => s.category).filter(Boolean)).size}
                            </p>
                        </button>
                        <Link to={createPageUrl('SeriesEditor')} className="bg-indigo-50 hover:bg-indigo-100 rounded-lg px-4 py-3 flex flex-col items-start justify-center transition-colors cursor-pointer">
                            <p className="text-sm text-indigo-600">Series</p>
                            <p className="text-2xl font-bold text-indigo-700">{seriesCount}</p>
                        </Link>
                        <button
                            className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg px-4 py-3 flex flex-col items-start justify-center transition-colors"
                            onClick={() => setIsCategoryManagerOpen(true)}
                        >
                            <Tag className="w-6 h-6 mb-1" />
                            <span className="text-sm font-semibold">Manage Categories</span>
                        </button>
                        <button
                            className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-4 py-3 flex flex-col items-start justify-center transition-colors"
                            onClick={() => setIsStoryCreationPanelOpen(true)}
                        >
                            <Plus className="w-6 h-6 mb-1" />
                            <span className="text-sm font-semibold">New Story</span>
                        </button>
                        <Link
                            to={createPageUrl('HomePageEditor')}
                            className="bg-slate-700 hover:bg-slate-800 text-white rounded-lg px-4 py-3 flex flex-col items-start justify-center transition-colors"
                        >
                            <Home className="w-6 h-6 mb-1" />
                            <span className="text-sm font-semibold">Edit Home Page</span>
                        </Link>
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
                                <SelectItem value="ideas">Ideas</SelectItem>
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

        <div>
                        {statusFilter !== 'all' && (
                          <h2 className="text-3xl font-bold text-slate-800 mb-6 pb-3 border-b border-slate-200">
                            {statusFilter === 'published' && 'Published Stories'}
                            {statusFilter === 'draft'     && 'Draft Stories'}
                            {statusFilter === 'ideas'     && 'Story Ideas'}
                          </h2>
                        )}
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
                                    <div className={`px-2 py-1.5 md:px-4 md:py-2 flex items-center justify-between ${
                                      story.is_idea        ? 'bg-teal-50'   :
                                      story.is_main_story  ? 'bg-purple-50' :
                                      story.is_published   ? 'bg-green-50'  : 'bg-amber-50'
                                    }`}>
                                        <div className="flex items-center gap-2">
                                            {story.is_idea && <>
                                                <Lightbulb className="w-3 h-3 md:w-3.5 md:h-3.5 text-teal-600" />
                                                <span className="text-[10px] md:text-xs font-medium text-teal-700">Idea</span>
                                            </>}
                                            {!story.is_idea && story.is_main_story && <>
                                                <Star className="w-3 h-3 md:w-3.5 md:h-3.5 text-purple-600 fill-purple-600" />
                                                <span className="text-[10px] md:text-xs font-medium text-purple-700">Main Story</span>
                                            </>}
                                            {!story.is_idea && !story.is_main_story && story.is_published && <>
                                                <Globe className="w-3 h-3 md:w-3.5 md:h-3.5 text-green-600" />
                                                <span className="text-[10px] md:text-xs font-medium text-green-700">Published</span>
                                            </>}
                                            {!story.is_idea && !story.is_main_story && !story.is_published && <>
                                                <FileEdit className="w-3 h-3 md:w-3.5 md:h-3.5 text-amber-600" />
                                                <span className="text-[10px] md:text-xs font-medium text-amber-700">Draft</span>
                                            </>}
                                            {story.category === 'featured' && <>
                                                <Star className="w-3 h-3 md:w-3.5 md:h-3.5 text-amber-500 fill-amber-500 ml-1" />
                                                <span className="text-[10px] md:text-xs font-medium text-amber-600">Featured</span>
                                            </>}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleFeatured(story)}
                                                className={`h-6 w-6 p-0 ${story.category === 'featured' ? 'text-amber-500' : 'text-slate-400'}`}
                                                title={story.category === 'featured' ? 'Remove from Featured' : 'Add to Featured'}
                                            >
                                                {story.category === 'featured'
                                                    ? <StarOff className="w-3.5 h-3.5" />
                                                    : <Star className="w-3.5 h-3.5" />
                                                }
                                            </Button>
                                            {!story.is_main_story &&
                                                <Button variant="ghost" size="sm" onClick={() => setAsMainStory(story)} className="h-6 w-6 p-0 text-slate-400" title="Set as Main Story">
                                                    <Home className="w-3.5 h-3.5" />
                                                </Button>
                                            }
                                            {/* Idea → Move to Draft only */}
                                            {story.is_idea && (
                                              <Button variant="ghost" size="sm" onClick={() => moveToDraft(story)} className="h-6 text-xs">
                                                <FileEdit className="w-3 h-3 mr-1" /> Move to Draft
                                              </Button>
                                            )}

                                            {/* Draft → Mark as Idea OR Publish */}
                                            {!story.is_idea && !story.is_published && (
                                              <>
                                                <Button variant="ghost" size="sm" onClick={() => setAsIdea(story)} className="h-6 text-xs">
                                                  <Lightbulb className="w-3 h-3 mr-1" /> Mark as Idea
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => publishStory(story)} className="h-6 text-xs">
                                                  <Globe className="w-3 h-3 mr-1" /> Publish
                                                </Button>
                                              </>
                                            )}

                                            {/* Published → Unpublish (returns to Draft, not Idea) */}
                                            {story.is_published && !story.is_idea && (
                                              <Button variant="ghost" size="sm" onClick={() => unpublishStory(story)} className="h-6 text-xs">
                                                <Lock className="w-3 h-3 mr-1" /> Unpublish
                                              </Button>
                                            )}
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