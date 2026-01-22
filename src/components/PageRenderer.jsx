import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function PageRenderer({ pageName }) {
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSections();
  }, [pageName]);

  const loadSections = async () => {
    setIsLoading(true);
    try {
      const sectionsData = await base44.entities.HomePageSection.filter(
        { pageName },
        'order'
      );
      setSections(sectionsData);
    } catch (error) {
      console.error('Failed to load sections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderSection = (section) => {
    const { layout_type, title, content, image_url, video_url, show_gradient, component_type } = section;

    switch (layout_type) {
      case 'single_column':
        return (
          <div className="max-w-4xl mx-auto px-6 py-12">
            <h2 className="text-4xl font-bold text-slate-800 mb-6">{title}</h2>
            <div 
              className="prose prose-lg max-w-none text-slate-600"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        );

      case 'two_column':
        return (
          <div className="max-w-6xl mx-auto px-6 py-12">
            <h2 className="text-4xl font-bold text-slate-800 mb-8">{title}</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div 
                className="prose prose-lg text-slate-600"
                dangerouslySetInnerHTML={{ __html: content }}
              />
              {image_url && (
                <div className="rounded-lg overflow-hidden">
                  <img src={image_url} alt={title} className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>
        );

      case 'text_left_image_right':
        return (
          <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold text-slate-800 mb-6">{title}</h2>
                <div 
                  className="prose prose-lg text-slate-600"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              </div>
              {image_url && (
                <div className="rounded-xl overflow-hidden shadow-lg">
                  <img src={image_url} alt={title} className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>
        );

      case 'text_right_image_left':
        return (
          <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {image_url && (
                <div className="rounded-xl overflow-hidden shadow-lg">
                  <img src={image_url} alt={title} className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <h2 className="text-4xl font-bold text-slate-800 mb-6">{title}</h2>
                <div 
                  className="prose prose-lg text-slate-600"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              </div>
            </div>
          </div>
        );

      case 'centered_text':
        return (
          <div className="max-w-3xl mx-auto px-6 py-16 text-center">
            <h2 className="text-5xl font-bold text-slate-800 mb-8">{title}</h2>
            <div 
              className="prose prose-xl mx-auto text-slate-600"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        );

      case 'full_width_image':
        return (
          <div className="relative h-screen w-full">
            {image_url && (
              <img src={image_url} alt={title} className="absolute inset-0 w-full h-full object-cover" />
            )}
            {show_gradient && (
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/30" />
            )}
            <div className="relative z-10 h-full flex items-center justify-center px-6">
              <div className="max-w-4xl text-center text-white">
                <h2 className="text-5xl md:text-6xl font-bold mb-6">{title}</h2>
                {content && (
                  <div 
                    className="prose prose-xl prose-invert mx-auto"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                )}
              </div>
            </div>
          </div>
        );

      case 'full_width_video':
        return (
          <div className="relative h-screen w-full">
            {video_url && (
              <video 
                src={video_url} 
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
            )}
            {show_gradient && (
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/30" />
            )}
            <div className="relative z-10 h-full flex items-center justify-center px-6">
              <div className="max-w-4xl text-center text-white">
                <h2 className="text-5xl md:text-6xl font-bold mb-6">{title}</h2>
                {content && (
                  <div 
                    className="prose prose-xl prose-invert mx-auto"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                )}
              </div>
            </div>
          </div>
        );

      case 'hero_image_text_overlay':
        return (
          <div className="relative min-h-[70vh] w-full">
            {image_url && (
              <img src={image_url} alt={title} className="absolute inset-0 w-full h-full object-cover" />
            )}
            {show_gradient && (
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/20" />
            )}
            <div className="relative z-10 h-full min-h-[70vh] flex items-center px-6">
              <div className="max-w-3xl text-white">
                <h2 className="text-5xl md:text-7xl font-bold mb-6">{title}</h2>
                {content && (
                  <div 
                    className="prose prose-xl prose-invert"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                )}
              </div>
            </div>
          </div>
        );

      case 'component':
        if (component_type === 'rotating_globe') {
          return (
            <div className="py-16 px-6">
              <h2 className="text-4xl font-bold text-slate-800 mb-8 text-center">{title}</h2>
              <div className="max-w-4xl mx-auto bg-slate-100 rounded-xl p-12 text-center">
                <p className="text-slate-600">
                  Rotating Globe Component - To be implemented
                </p>
              </div>
            </div>
          );
        }
        return (
          <div className="py-16 px-6">
            <h2 className="text-4xl font-bold text-slate-800 mb-8 text-center">{title}</h2>
            <div 
              className="max-w-4xl mx-auto prose prose-lg"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        );

      default:
        return (
          <div className="max-w-4xl mx-auto px-6 py-12">
            <h2 className="text-4xl font-bold text-slate-800 mb-6">{title}</h2>
            <div 
              className="prose prose-lg max-w-none text-slate-600"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">No content yet</h2>
          <p className="text-slate-600">Add sections to this page using the Page Editor</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {sections.map((section) => (
        <section key={section.id}>
          {renderSection(section)}
        </section>
      ))}
    </div>
  );
}