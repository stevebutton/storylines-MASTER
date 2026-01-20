import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [sections, setSections] = useState([]);
  const [stories, setStories] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHomePage();
  }, []);

  const loadHomePage = async () => {
    try {
      const [sectionsData, storiesData] = await Promise.all([
        base44.entities.HomePageSection.list('order'),
        base44.entities.Story.list()
      ]);

      setSections(sectionsData);
      
      const storiesMap = {};
      storiesData.forEach(story => {
        storiesMap[story.id] = story;
      });
      setStories(storiesMap);
    } catch (err) {
      console.error("Failed to load home page:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderSection = (section) => {
    const linkedStory = section.linked_story_id ? stories[section.linked_story_id] : null;

    switch (section.layout_type) {
      case 'hero_image_text_overlay':
        return (
          <div className="relative h-screen flex items-center justify-center">
            {section.image_url && (
              <img src={section.image_url} alt={section.title} className="absolute inset-0 w-full h-full object-cover" />
            )}
            {section.show_gradient !== false && (
              <div className="absolute inset-0" style={{
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.05) 100%)'
              }} />
            )}
            <div className="relative z-10 text-center text-white px-6 max-w-4xl">
              <h1 className="text-5xl md:text-7xl font-bold mb-6">{section.title}</h1>
              {section.content && <p className="text-xl md:text-2xl mb-8">{section.content}</p>}
              {linkedStory && (
                <Link to={createPageUrl(`StoryMapView?id=${linkedStory.id}`)}>
                  <Button size="lg" className="bg-amber-600 hover:bg-amber-700">
                    Explore {linkedStory.title} <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        );

      case 'full_width_video':
        return (
          <div className="relative min-h-screen flex items-center justify-center bg-slate-900">
            {section.video_url && (
              <video src={section.video_url} autoPlay muted loop className="absolute inset-0 w-full h-full object-cover opacity-60" />
            )}
            {section.show_gradient !== false && (
              <div className="absolute inset-0" style={{
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.05) 100%)'
              }} />
            )}
            <div className="relative z-10 text-center text-white px-6 max-w-4xl">
              <h2 className="text-4xl md:text-6xl font-bold mb-6">{section.title}</h2>
              {section.content && <p className="text-lg md:text-xl mb-8">{section.content}</p>}
              {linkedStory && (
                <Link to={createPageUrl(`StoryMapView?id=${linkedStory.id}`)}>
                  <Button size="lg" className="bg-amber-600 hover:bg-amber-700">
                    Discover More <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        );

      case 'centered_text':
        return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
            <div className="text-center max-w-3xl">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">{section.title}</h2>
              {section.content && <p className="text-lg text-slate-600 mb-8">{section.content}</p>}
              {linkedStory && (
                <Link to={createPageUrl(`StoryMapView?id=${linkedStory.id}`)}>
                  <Button className="bg-amber-600 hover:bg-amber-700">
                    View Story <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        );

      case 'text_right_image_left':
        return (
          <div className="min-h-screen flex items-center bg-white">
            <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
              {section.image_url && (
                <img src={section.image_url} alt={section.title} className="w-full h-96 object-cover rounded-lg shadow-lg" />
              )}
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">{section.title}</h2>
                {section.content && <p className="text-slate-600 mb-6 text-lg">{section.content}</p>}
                {linkedStory && (
                  <Link to={createPageUrl(`StoryMapView?id=${linkedStory.id}`)}>
                    <Button className="bg-amber-600 hover:bg-amber-700">
                      Read More <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        );

      case 'text_left_image_right':
      default:
        return (
          <div className="min-h-screen flex items-center bg-slate-50">
            <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">{section.title}</h2>
                {section.content && <p className="text-slate-600 mb-6 text-lg">{section.content}</p>}
                {linkedStory && (
                  <Link to={createPageUrl(`StoryMapView?id=${linkedStory.id}`)}>
                    <Button className="bg-amber-600 hover:bg-amber-700">
                      Explore Story <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                )}
              </div>
              {section.image_url && (
                <img src={section.image_url} alt={section.title} className="w-full h-96 object-cover rounded-lg shadow-lg" />
              )}
            </div>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4 text-center">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">Welcome to StoryMap</h1>
        <p className="text-slate-600 mb-6">No home page sections configured yet.</p>
        <Link to={createPageUrl('HomePageEditor')}>
          <Button className="bg-amber-600 hover:bg-amber-700">
            Configure Home Page
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {sections.map((section) => (
        <div key={section.id}>
          {renderSection(section)}
        </div>
      ))}
    </div>
  );
}