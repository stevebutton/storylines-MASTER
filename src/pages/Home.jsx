import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMainStory = async () => {
      try {
        const stories = await base44.entities.Story.filter({ is_main_story: true, is_published: true });
        if (stories.length > 0) {
          navigate(createPageUrl(`StoryMapView?id=${stories[0].id}`));
        } else {
          setError("No main story set yet.");
        }
      } catch (err) {
        console.error("Failed to fetch main story:", err);
        setError("Failed to load stories.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMainStory();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4 text-center">
        <p className="text-slate-600">{error}</p>
        <a href={createPageUrl('Stories')} className="text-amber-600 hover:underline mt-2">
          Go to Stories to create one
        </a>
      </div>
    );
  }

  return null;
}