import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function StoryMap() {
  const [mainStoryId, setMainStoryId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMainStory();
  }, []);

  const loadMainStory = async () => {
    try {
      const stories = await base44.entities.Story.filter({ is_main_story: true });
      if (stories.length > 0) {
        setMainStoryId(stories[0].id);
        // Redirect to StoryViewer with the main story ID
        window.location.href = `${createPageUrl('StoryViewer')}?id=${stories[0].id}`;
      }
    } catch (error) {
      console.error('Failed to load main story:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!mainStoryId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 gap-4">
        <p className="text-slate-500">No main story set yet.</p>
        <Link 
          to={createPageUrl('Stories')}
          className="text-amber-600 hover:text-amber-700 underline"
        >
          Go to Stories to create one
        </Link>
      </div>
    );
  }

  return null;
}