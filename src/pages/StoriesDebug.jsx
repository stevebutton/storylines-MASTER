import React, { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, CheckCircle2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import EmbeddedLocationPicker from '@/components/editor/EmbeddedLocationPicker';

export default function StoriesDebug() {
  const queryClient = useQueryClient();
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState(null);
  const [selectedStoryIds, setSelectedStoryIds] = useState([]);
  const [sortBy, setSortBy] = useState('-created_date');

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['stories', sortBy],
    queryFn: async () => {
        const ascending = !sortBy.startsWith('-');
        const field = sortBy.replace(/^-/, '');
        const { data, error } = await supabase.from('stories').select('*').order(field, { ascending });
        if (error) throw error;
        return data || [];
    }
  });

  const updateStoryMutation = useMutation({
    mutationFn: async ({ id, data }) => { const { error } = await supabase.from('stories').update(data).eq('id', id); if (error) throw error; },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories', sortBy] });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => { const { error } = await supabase.from('stories').delete().in('id', ids); if (error) throw error; },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories', sortBy] });
      setSelectedStoryIds([]);
    }
  });

  const handlePublishToggle = (story) => {
    updateStoryMutation.mutate({
      id: story.id,
      data: { is_published: !story.is_published }
    });
  };

  const handleCategoryChange = (story, category) => {
    updateStoryMutation.mutate({
      id: story.id,
      data: { category }
    });
  };

  const handleSelectStory = (storyId, isChecked) => {
    setSelectedStoryIds(prev =>
      isChecked ? [...prev, storyId] : prev.filter(id => id !== storyId)
    );
  };

  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      setSelectedStoryIds(stories.map(story => story.id));
    } else {
      setSelectedStoryIds([]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedStoryIds.length > 0 && confirm(`Delete ${selectedStoryIds.length} selected stories?`)) {
      bulkDeleteMutation.mutate(selectedStoryIds);
    }
  };

  const handleLocationSave = (location) => {
    if (selectedStory) {
      updateStoryMutation.mutate({
        id: selectedStory.id,
        data: {
          coordinates: [location.lat, location.lng],
          zoom: location.zoom || 2,
          bearing: location.bearing || 0,
          pitch: location.pitch || 0
        }
      });
    }
    setLocationDialogOpen(false);
    setSelectedStory(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Stories Debug View</span>
            <div className="flex items-center space-x-4">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-created_date">Newest First</SelectItem>
                  <SelectItem value="created_date">Oldest First</SelectItem>
                  <SelectItem value="title">Title (A-Z)</SelectItem>
                  <SelectItem value="-title">Title (Z-A)</SelectItem>
                </SelectContent>
              </Select>
              {selectedStoryIds.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={handleDeleteSelected}
                  disabled={bulkDeleteMutation.isPending}
                >
                  {bulkDeleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete Selected ({selectedStoryIds.length})
                </Button>
              )}
            </div>
          </CardTitle>
          <p className="text-sm text-slate-600">
            Testing view for all stories - check and fix missing data
          </p>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 border-b border-slate-200 flex items-center">
            <Checkbox
              checked={selectedStoryIds.length === stories.length && stories.length > 0}
              onCheckedChange={handleSelectAll}
              disabled={stories.length === 0}
            />
            <span className="ml-2 text-sm font-medium text-slate-700">Select All</span>
          </div>
          <div className="space-y-4">
            {stories.map((story) => (
              <div
                key={story.id}
                className="border border-slate-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Checkbox */}
                  <div className="col-span-1">
                    <Checkbox
                      checked={selectedStoryIds.includes(story.id)}
                      onCheckedChange={(isChecked) => handleSelectStory(story.id, isChecked)}
                    />
                  </div>
                  {/* Story Title */}
                  <div className="col-span-2">
                    <h3 className="font-semibold text-slate-900">{story.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">ID: {story.id}</p>
                  </div>

                  {/* Published Status */}
                  <div className="col-span-2 flex items-center gap-2">
                    <Checkbox
                      checked={story.is_published}
                      onCheckedChange={() => handlePublishToggle(story)}
                    />
                    <span className="text-sm">
                      {story.is_published ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          Published
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1">
                          <XCircle className="w-4 h-4" />
                          Draft
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Category */}
                  <div className="col-span-2">
                    {story.category ? (
                      <Select
                        value={story.category}
                        onValueChange={(value) => handleCategoryChange(story, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="travel">Travel</SelectItem>
                          <SelectItem value="history">History</SelectItem>
                          <SelectItem value="nature">Nature</SelectItem>
                          <SelectItem value="culture">Culture</SelectItem>
                          <SelectItem value="adventure">Adventure</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Select onValueChange={(value) => handleCategoryChange(story, value)}>
                        <SelectTrigger className="w-full border-red-300 bg-red-50">
                          <SelectValue placeholder="No category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="travel">Travel</SelectItem>
                          <SelectItem value="history">History</SelectItem>
                          <SelectItem value="nature">Nature</SelectItem>
                          <SelectItem value="culture">Culture</SelectItem>
                          <SelectItem value="adventure">Adventure</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Starting Location */}
                  <div className="col-span-2">
                    {story.coordinates && story.coordinates.length === 2 ? (
                      <div className="text-sm">
                        <div className="flex items-center gap-1 text-green-600 mb-1">
                          <MapPin className="w-4 h-4" />
                          <span className="font-medium">Location set</span>
                        </div>
                        <div className="text-xs text-slate-600">
                          Lat: {story.coordinates[0]?.toFixed(4)}, Lng: {story.coordinates[1]?.toFixed(4)}
                        </div>
                        <div className="text-xs text-slate-500">
                          Zoom: {story.zoom || 'N/A'}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-red-600 flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        No location
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedStory(story);
                        setLocationDialogOpen(true);
                      }}
                    >
                      {story.coordinates && story.coordinates.length === 2 ? 'Edit' : 'Set'} Location
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {stories.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No stories found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Picker Dialog */}
      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Set Location for: {selectedStory?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedStory && (
            <div className="flex-1 h-full">
              <EmbeddedLocationPicker
                location={
                  selectedStory.coordinates && selectedStory.coordinates.length === 2
                    ? {
                        lat: selectedStory.coordinates[0],
                        lng: selectedStory.coordinates[1],
                        zoom: selectedStory.zoom || 2,
                        bearing: selectedStory.bearing || 0,
                        pitch: selectedStory.pitch || 0
                      }
                    : { lat: 0, lng: 0, zoom: 2, bearing: 0, pitch: 0 }
                }
                onLocationChange={handleLocationSave}
              />
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setLocationDialogOpen(false);
                  setSelectedStory(null);
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}