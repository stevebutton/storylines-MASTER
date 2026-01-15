// Static story data storage
export const storiesData = {
  stories: [
    {
      id: 'story-1',
      title: 'Journey Through the Alps',
      subtitle: 'A Visual Exploration of Mountain Landscapes',
      author: 'Explorer Name',
      hero_image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
      hero_type: 'image',
      category: 'travel',
      is_published: true,
      is_main_story: true,
      created_date: '2026-01-01T00:00:00Z',
      updated_date: '2026-01-15T00:00:00Z'
    }
  ],
  chapters: [
    {
      id: 'chapter-1',
      story_id: 'story-1',
      order: 1,
      coordinates: [46.8182, 8.2275],
      zoom: 10,
      bearing: 0,
      pitch: 0,
      fly_duration: 12,
      map_style: 'light',
      alignment: 'left'
    }
  ],
  slides: [
    {
      id: 'slide-1',
      chapter_id: 'chapter-1',
      order: 1,
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
      title: 'The Swiss Alps',
      description: '<p>Where our journey starts in the heart of the mountains.</p>',
      location: 'Swiss Alps',
      coordinates: [46.8182, 8.2275],
      zoom: 10,
      bearing: 0,
      pitch: 0,
      fly_duration: 12,
      card_style: 'default'
    }
  ],
  media: []
};

// Helper functions to simulate backend operations
export const storyDataAPI = {
  // Stories
  getStories: () => [...storiesData.stories],
  getStory: (id) => storiesData.stories.find(s => s.id === id),
  createStory: (data) => {
    const newStory = { ...data, id: `story-${Date.now()}`, created_date: new Date().toISOString(), updated_date: new Date().toISOString() };
    storiesData.stories.push(newStory);
    return newStory;
  },
  updateStory: (id, data) => {
    const index = storiesData.stories.findIndex(s => s.id === id);
    if (index !== -1) {
      storiesData.stories[index] = { ...storiesData.stories[index], ...data, updated_date: new Date().toISOString() };
      return storiesData.stories[index];
    }
  },
  deleteStory: (id) => {
    storiesData.stories = storiesData.stories.filter(s => s.id !== id);
  },

  // Chapters
  getChapters: (storyId) => storiesData.chapters.filter(c => c.story_id === storyId).sort((a, b) => a.order - b.order),
  getChapter: (id) => storiesData.chapters.find(c => c.id === id),
  createChapter: (data) => {
    const newChapter = { ...data, id: `chapter-${Date.now()}` };
    storiesData.chapters.push(newChapter);
    return newChapter;
  },
  updateChapter: (id, data) => {
    const index = storiesData.chapters.findIndex(c => c.id === id);
    if (index !== -1) {
      storiesData.chapters[index] = { ...storiesData.chapters[index], ...data };
      return storiesData.chapters[index];
    }
  },
  deleteChapter: (id) => {
    storiesData.chapters = storiesData.chapters.filter(c => c.id !== id);
  },

  // Slides
  getSlides: (chapterId) => storiesData.slides.filter(s => s.chapter_id === chapterId).sort((a, b) => a.order - b.order),
  getAllSlides: () => [...storiesData.slides],
  getSlide: (id) => storiesData.slides.find(s => s.id === id),
  createSlide: (data) => {
    const newSlide = { ...data, id: `slide-${Date.now()}` };
    storiesData.slides.push(newSlide);
    return newSlide;
  },
  updateSlide: (id, data) => {
    const index = storiesData.slides.findIndex(s => s.id === id);
    if (index !== -1) {
      storiesData.slides[index] = { ...storiesData.slides[index], ...data };
      return storiesData.slides[index];
    }
  },
  deleteSlide: (id) => {
    storiesData.slides = storiesData.slides.filter(s => s.id !== id);
  },

  // Media
  getMedia: () => [...storiesData.media],
  createMedia: (data) => {
    const newMedia = { ...data, id: `media-${Date.now()}`, created_date: new Date().toISOString() };
    storiesData.media.push(newMedia);
    return newMedia;
  },
  deleteMedia: (id) => {
    storiesData.media = storiesData.media.filter(m => m.id !== id);
  }
};