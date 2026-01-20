import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, GripVertical, Trash2, Save, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function HomePageEditor() {
  const [sections, setSections] = useState([]);
  const [stories, setStories] = useState([]);
  const [media, setMedia] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingSection, setEditingSection] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sectionsData, storiesData, mediaData] = await Promise.all([
        base44.entities.HomePageSection.list('order'),
        base44.entities.Story.filter({ is_published: true }),
        base44.entities.Media.list('-created_date')
      ]);
      setSections(sectionsData);
      setStories(storiesData);
      setMedia(mediaData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSections(items);

    // Update order in database
    for (let i = 0; i < items.length; i++) {
      await base44.entities.HomePageSection.update(items[i].id, { order: i });
    }
  };

  const createSection = () => {
    setEditingSection({
      title: '',
      content: '',
      image_url: '',
      video_url: '',
      order: sections.length,
      layout_type: 'text_left_image_right',
      linked_story_id: ''
    });
  };

  const saveSection = async () => {
    if (!editingSection.title) return;

    setIsSaving(true);
    try {
      if (editingSection.id) {
        await base44.entities.HomePageSection.update(editingSection.id, editingSection);
      } else {
        await base44.entities.HomePageSection.create(editingSection);
      }
      await loadData();
      setEditingSection(null);
    } catch (error) {
      console.error('Failed to save section:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSection = async (id) => {
    if (!confirm('Delete this section?')) return;
    try {
      await base44.entities.HomePageSection.delete(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete section:', error);
    }
  };

  const uploadFile = async (file) => {
    try {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      return data.file_url;
    } catch (error) {
      console.error('Upload failed:', error);
      return null;
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
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Home Page Editor</h1>
            <p className="text-slate-500 mt-1">Manage your home page sections</p>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl('Home')}>
              <Button variant="outline">Preview</Button>
            </Link>
            <Button onClick={createSection} className="bg-amber-600 hover:bg-amber-700">
              <Plus className="w-4 h-4 mr-2" /> Add Section
            </Button>
          </div>
        </div>

        {editingSection && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{editingSection.id ? 'Edit Section' : 'New Section'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={editingSection.title}
                  onChange={(e) => setEditingSection({ ...editingSection, title: e.target.value })}
                  placeholder="Section title"
                />
              </div>

              <div>
                <Label>Content</Label>
                <Textarea
                  value={editingSection.content}
                  onChange={(e) => setEditingSection({ ...editingSection, content: e.target.value })}
                  placeholder="Section content text"
                  rows={4}
                />
              </div>

              <div>
                <Label>Layout Type</Label>
                <Select
                  value={editingSection.layout_type}
                  onValueChange={(value) => setEditingSection({ ...editingSection, layout_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text_left_image_right">Text Left, Image Right</SelectItem>
                    <SelectItem value="text_right_image_left">Text Right, Image Left</SelectItem>
                    <SelectItem value="full_width_video">Full Width Video</SelectItem>
                    <SelectItem value="centered_text">Centered Text</SelectItem>
                    <SelectItem value="hero_image_text_overlay">Hero Image with Text Overlay</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Image</Label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const url = await uploadFile(file);
                        if (url) setEditingSection({ ...editingSection, image_url: url });
                      }
                    }}
                  />
                  {editingSection.image_url && (
                    <img src={editingSection.image_url} alt="Preview" className="h-10 w-10 object-cover rounded" />
                  )}
                </div>
              </div>

              <div>
                <Label>Video URL</Label>
                <Input
                  value={editingSection.video_url}
                  onChange={(e) => setEditingSection({ ...editingSection, video_url: e.target.value })}
                  placeholder="Video URL"
                />
              </div>

              <div>
                <Label>Link to Story (optional)</Label>
                <Select
                  value={editingSection.linked_story_id}
                  onValueChange={(value) => setEditingSection({ ...editingSection, linked_story_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a story" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {stories.map((story) => (
                      <SelectItem key={story.id} value={story.id}>
                        {story.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={saveSection} disabled={isSaving}>
                  <Save className="w-4 h-4 mr-2" /> Save
                </Button>
                <Button variant="outline" onClick={() => setEditingSection(null)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="sections">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                {sections.map((section, index) => (
                  <Draggable key={section.id} draggableId={section.id} index={index}>
                    {(provided) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="hover:shadow-lg transition-shadow"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div {...provided.dragHandleProps} className="mt-2">
                              <GripVertical className="w-5 h-5 text-slate-400" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg text-slate-800">{section.title}</h3>
                              <p className="text-sm text-slate-500 mt-1">{section.layout_type}</p>
                              {section.content && (
                                <p className="text-sm text-slate-600 mt-2 line-clamp-2">{section.content}</p>
                              )}
                              <div className="flex gap-2 mt-2">
                                {section.image_url && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                    <ImageIcon className="w-3 h-3 inline mr-1" />Image
                                  </span>
                                )}
                                {section.video_url && (
                                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                    <Video className="w-3 h-3 inline mr-1" />Video
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingSection(section)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteSection(section.id)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {sections.length === 0 && (
          <Card className="border-2 border-dashed">
            <CardContent className="py-16 text-center">
              <h3 className="text-lg font-medium text-slate-700 mb-2">No sections yet</h3>
              <p className="text-slate-500 mb-6">Create your first home page section</p>
              <Button onClick={createSection} className="bg-amber-600 hover:bg-amber-700">
                <Plus className="w-4 h-4 mr-2" /> Add Section
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}