import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Mic, Camera, MapPin, ChevronRight, ChevronLeft,
  Check, FileText, Image as ImageIcon, MapPinned, Sparkles, Upload, Loader2, X } from
'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import VoiceNarrationRecorder from '@/components/mobile/VoiceNarrationRecorder';
import { resizeImage } from '@/components/mobile/ImageResizer';

export default function Storyboarder() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [storyTitle, setStoryTitle] = useState('');
  const [coverPhoto, setCoverPhoto] = useState(null);
  const [startingLocation, setStartingLocation] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [storyId, setStoryId] = useState(null);
  const [chapterId, setChapterId] = useState(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [currentSlideId, setCurrentSlideId] = useState(null);
  const [slideTitle, setSlideTitle] = useState('');
  const [slideDescription, setSlideDescription] = useState('');
  const [slideImage, setSlideImage] = useState(null);
  const [slideLocation, setSlideLocation] = useState(null);
  const [slides, setSlides] = useState([]);
  const [isLoadingSlides, setIsLoadingSlides] = useState(false);
  const fileInputRef = useRef(null);
  const slideImageInputRef = useRef(null);

  const handleTakePhoto = async () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCoverPhoto({
        id: Date.now(),
        name: file.name,
        url: file_url
      });
    } catch (error) {
      console.error('Error uploading cover photo:', error);
      alert('Failed to upload cover photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCaptureLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });

      const newLocation = {
        id: Date.now(),
        name: 'Starting Location',
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        coords: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
        accuracy: position.coords.accuracy
      };

      setStartingLocation(newLocation);
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Unable to get your location. Please check permissions.');
    }
  };

  const handleCreateStory = async () => {
    setIsSaving(true);
    try {
      const user = await base44.auth.me();

      const storyData = {
        title: storyTitle || `Field Story ${new Date().toLocaleDateString()}`,
        subtitle: 'Draft from mobile capture',
        author: user.full_name || user.email,
        is_published: false,
        hero_image: coverPhoto?.url || undefined,
        coordinates: startingLocation ? [startingLocation.lat, startingLocation.lng] : undefined,
        zoom: startingLocation ? 12 : 2
      };

      const story = await base44.entities.Story.create(storyData);
      setStoryId(story.id);
      setCurrentStep(3);
    } catch (error) {
      console.error('Error creating story:', error);
      alert('Failed to create story. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const loadSlides = async () => {
    if (!chapterId) return;
    setIsLoadingSlides(true);
    try {
      const chapterSlides = await base44.entities.Slide.filter({ chapter_id: chapterId });
      chapterSlides.sort((a, b) => a.order - b.order);
      setSlides(chapterSlides);
    } catch (error) {
      console.error('Error loading slides:', error);
    } finally {
      setIsLoadingSlides(false);
    }
  };

  const handleSlideImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Resize image before upload
      const resizedFile = await resizeImage(file, 800);

      const { file_url } = await base44.integrations.Core.UploadFile({ file: resizedFile });

      // Capture location when image is uploaded
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000
            });
          });
          setSlideLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            coords: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
          });
        } catch (error) {
          console.error('Error getting location:', error);
        }
      }

      setSlideImage({
        id: Date.now(),
        name: file.name,
        url: file_url
      });
    } catch (error) {
      console.error('Error uploading slide image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const saveSlide = async () => {
    if (!slideTitle) {
      alert('Please add a title for the slide.');
      return;
    }

    setIsSaving(true);
    try {
      const slideData = {
        chapter_id: chapterId,
        title: slideTitle,
        description: slideDescription || undefined,
        image: slideImage?.url || undefined,
        order: slides.length
      };

      if (slideLocation) {
        slideData.coordinates = [slideLocation.lat, slideLocation.lng];
        slideData.zoom = 15;
      }

      if (currentSlideId) {
        await base44.entities.Slide.update(currentSlideId, slideData);
      } else {
        await base44.entities.Slide.create(slideData);
      }

      // Clear form
      setSlideTitle('');
      setSlideDescription('');
      setSlideImage(null);
      setSlideLocation(null);
      setCurrentSlideId(null);

      // Reload slides
      await loadSlides();
    } catch (error) {
      console.error('Error saving slide:', error);
      alert('Failed to save slide. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const loadSlideForEdit = (slide) => {
    setCurrentSlideId(slide.id);
    setSlideTitle(slide.title || '');
    setSlideDescription(slide.description || '');
    if (slide.image) {
      setSlideImage({ url: slide.image });
    }
    if (slide.coordinates) {
      setSlideLocation({
        lat: slide.coordinates[0],
        lng: slide.coordinates[1],
        coords: `${slide.coordinates[0].toFixed(6)}, ${slide.coordinates[1].toFixed(6)}`
      });
    }
    setCurrentStep(4);
  };

  const handleSaveCurrentSlide = async () => {
    if (!slideTitle) {
      return false;
    }
    await saveSlide();
    return true;
  };

  const handleSaveAndAddAnotherSlide = async () => {
    await handleSaveCurrentSlide();
  };

  const handleSaveAndReviewSlides = async () => {
    await handleSaveCurrentSlide();
    setCurrentStep(5);
  };

  const handleSaveAndAddNewChapter = async () => {
    const saved = await handleSaveCurrentSlide();
    if (saved) {
      setChapterId(null);
      setChapterTitle('');
      setSlides([]);
      setSlideTitle('');
      setSlideDescription('');
      setSlideImage(null);
      setSlideLocation(null);
      setCurrentSlideId(null);
      setCurrentStep(3);
    }
  };

  const handleExitStory = async () => {
    await handleSaveCurrentSlide();
    navigate(`${createPageUrl('ExitStory')}?id=${storyId}`);
  };

  useEffect(() => {
    if (currentStep === 4 && chapterId) {
      loadSlides();
    }
  }, [currentStep, chapterId]);

  const handleMakeSlides = async () => {
    if (!chapterTitle) {
      alert('Please record a chapter title first.');
      return;
    }

    setIsSaving(true);
    try {
      // Capture current location
      let currentLocation = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000
            });
          });
          currentLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
        } catch (error) {
          console.error('Error getting location:', error);
        }
      }

      // Get current chapter count
      const existingChapters = await base44.entities.Chapter.filter({ story_id: storyId });
      const chapterOrder = existingChapters.length;

      // Create chapter
      const chapterData = {
        story_id: storyId,
        order: chapterOrder,
        alignment: 'left'
      };

      const chapter = await base44.entities.Chapter.create(chapterData);
      setChapterId(chapter.id);

      // Move to slide creation screen
      setCurrentStep(4);
    } catch (error) {
      console.error('Error creating chapter:', error);
      alert('Failed to create chapter. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-zinc-200 min-h-screen from-slate-50 to-slate-100">
            {/* Persistent Header Banner */}
            <header className="bg-slate-600 text-white px-6 py-4 shadow-md sticky top-0 z-50">
                <button
          onClick={() => setCurrentStep(0)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity">

                    <Sparkles className="w-6 h-6" />
                    <h1 className="text-2xl font-bold">Storyboarder</h1>
                </button>
            </header>

            {/* Main Content Area */}
            <div className="max-w-2xl mx-auto p-6">
                <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                    <AnimatePresence mode="wait">
                        {/* Home/Welcome Screen */}
                        {currentStep === 0 &&
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-8 space-y-8 text-center">

                                <div className="py-6">
                                    <h2 className="text-4xl font-bold text-slate-800 mb-6">
                                        Storyboarder
                                    </h2>
                                    <p className="text-slate-700 mb-2 text-xl leading-relaxed">is your companion for

                </p>
                                    <p className="text-lg text-slate-700 leading-relaxed">
                                        building stories on location.
                                    </p>
                                </div>

                                <p className="text-slate-600 leading-relaxed max-w-lg mx-auto">Use ivoice, image, and location capture tools to build your story on the go, ready for editing in the Storylines desktop editor.


              </p>

                                <Button
                onClick={() => setCurrentStep(1)}
                className="w-full max-w-md mx-auto bg-amber-600 hover:bg-amber-700 h-16 text-xl font-bold shadow-xl">

                                    Start a new story
                                    <ChevronRight className="w-7 h-7 ml-2" />
                                </Button>
                            </motion.div>
            }

                        {/* Story Setup Actions Screen */}
                        {currentStep === 1 &&
            <motion.div
              key="setup"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }} className="bg-slate-100 p-6 space-y-6">


                                <div className="mb-6">
                                    <h2 className="text-slate-800 mb-2 text-2xl font-bold text-center lowercase">Story Details

                </h2>
                                    <p className="text-sm text-slate-600">
                                        Provide the essential details for your story.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {/* Story Title Button */}
                                    <Button
                  onClick={() => setCurrentStep(10)} className="bg-slate-600 text-primary-foreground px-4 py-2 text-sm font-medium rounded-md inline-flex items-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 w-full h-20 justify-between border-0 shadow-lg hover:bg-purple-600">






                                        <Mic className="w-24 h-24 text-white flex-shrink-0" strokeWidth={2.5} />
                                        <p className="text-white text-xl font-black text-center flex-1">STORY TITLE</p>
                                        {storyTitle && <Check className="w-16 h-16 text-white flex-shrink-0" strokeWidth={4} />}
                                    </Button>

                                    {/* Cover Photo Button */}
                                    <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden" />

                                    <Button
                  onClick={handleTakePhoto} className="bg-slate-400 text-primary-foreground px-4 py-2 text-sm font-medium rounded-md inline-flex items-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 w-full h-20 justify-between border-0 shadow-lg hover:bg-blue-600"





                  disabled={isUploading}>

                                        {isUploading ?
                  <Loader2 className="w-24 h-24 text-white flex-shrink-0 animate-spin" strokeWidth={2.5} /> :

                  <Camera className="w-24 h-24 text-white flex-shrink-0" strokeWidth={2.5} />
                  }
                                        <p className="text-white text-xl font-black text-center flex-1">COVER PHOTO</p>
                                        {coverPhoto && <Check className="w-16 h-16 text-white flex-shrink-0" strokeWidth={4} />}
                                    </Button>

                                    {/* Capture Location Button */}
                                    <Button
                  onClick={handleCaptureLocation} className="bg-slate-300 text-primary-foreground px-4 py-2 text-sm font-medium rounded-md inline-flex items-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 w-full h-20 justify-between border-0 shadow-lg hover:bg-orange-600">






                                        <MapPin className="w-24 h-24 text-white flex-shrink-0" strokeWidth={2.5} />
                                        <p className="text-white text-xl font-black text-center flex-1">LOCATION</p>
                                        {startingLocation && <Check className="w-16 h-16 text-white flex-shrink-0" strokeWidth={4} />}
                                    </Button>

                                    {/* Review Button */}
                                    <Button
                  onClick={() => setCurrentStep(2)} className="inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 text-primary-foreground px-4 py-2 w-full h-20 justify-between bg-slate-700 hover:bg-slate-800 border-0 mt-6 shadow-lg">


                                        <FileText className="w-24 h-24 text-white flex-shrink-0" strokeWidth={2.5} />
                                        <p className="text-white text-xl font-black text-center flex-1">REVIEW STORY</p>
                                        <ChevronRight className="w-16 h-16 text-white flex-shrink-0" strokeWidth={3} />
                                    </Button>
                                </div>
                            </motion.div>
            }

                        {/* Story Title Recording Screen */}
                        {currentStep === 10 &&
            <motion.div
              key="title-recording"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="p-6 space-y-6">

                                <div>
                                    <Badge className="bg-amber-100 text-amber-700 mb-2">Story Title</Badge>
                                    <h2 className="text-slate-800 mb-2 text-2xl font-bold text-center">Dictate Story Title

                </h2>
                                    <p className="text-slate-600 text-sm text-center">Press the microphone to record your story's main title.

                </p>
                                </div>

                                <VoiceNarrationRecorder
                onTranscriptChange={setStoryTitle}
                initialTranscript={storyTitle} />


                                <div className="flex gap-2">
                                    <Button
                  onClick={() => setCurrentStep(1)}
                  variant="outline"
                  className="flex-1">

                                        <ChevronLeft className="w-4 h-4 mr-2" />
                                        Back
                                    </Button>
                                    {storyTitle &&
                <Button
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 bg-amber-600 hover:bg-amber-700">

                                            Done
                                            <Check className="w-4 h-4 ml-2" />
                                        </Button>
                }
                                </div>
                            </motion.div>
            }

                        {/* Review Story Setup Screen */}
                        {currentStep === 2 &&
            <motion.div
              key="review-setup"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="p-6 space-y-6">

                                <div>
                                    <h2 className="text-slate-800 mb-2 text-2xl font-bold text-center">Review Story

                </h2>
                                    <p className="text-sm text-slate-600">
                                        Confirm the initial details for your story.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    {/* Story Title Review */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <FileText className="w-5 h-5 text-slate-600" />
                                            <h3 className="font-semibold text-slate-800">Story Title</h3>
                                        </div>
                                        <p className="text-sm text-slate-600">
                                            {storyTitle || <span className="italic">No title recorded yet.</span>}
                                        </p>
                                    </div>

                                    {/* Cover Photo Review */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <ImageIcon className="w-5 h-5 text-slate-600" />
                                            <h3 className="font-semibold text-slate-800">Cover Photo</h3>
                                        </div>
                                        {coverPhoto ?
                  <img
                    src={coverPhoto.url}
                    alt="Cover"
                    className="w-full h-40 object-cover rounded-lg mt-2" /> :


                  <p className="text-sm text-slate-600 italic">No cover photo selected.</p>
                  }
                                    </div>

                                    {/* Starting Location Review */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MapPin className="w-5 h-5 text-slate-600" />
                                            <h3 className="font-semibold text-slate-800">Starting Location</h3>
                                        </div>
                                        <p className="text-sm text-slate-600">
                                            {startingLocation ?
                    startingLocation.coords :

                    <span className="italic">No starting location captured.</span>
                    }
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col gap-3 mt-6">
                                    <Button
                  onClick={() => setCurrentStep(1)}
                  variant="outline"
                  className="w-full h-14 text-base font-semibold border-2">

                                        <ChevronLeft className="w-6 h-6 mr-2" />
                                        Make Changes
                                    </Button>
                                    <Button
                  onClick={handleCreateStory}
                  className="w-full bg-green-600 hover:bg-green-700 h-16 text-lg font-bold shadow-lg"
                  disabled={isSaving}>

                                        {isSaving ?
                  <>
                                                <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                                                Creating...
                                            </> :

                  <>
                                                All Good? Let's Create a Chapter
                                                <ChevronRight className="w-6 h-6 ml-2" />
                                            </>
                  }
                                    </Button>
                                </div>
                            </motion.div>
            }

                        {/* Chapter Title Recording Screen */}
                        {currentStep === 3 &&
            <motion.div
              key="create-chapter"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="p-6 space-y-6">

                                <div>
                                    <Badge className="bg-green-100 text-green-700 mb-2">Chapter Title</Badge>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                                        Record Chapter Title
                                    </h2>
                                    <p className="text-sm text-slate-600">
                                        Dictate the title for this chapter. The first slide will provide location and visual content.
                                    </p>
                                </div>

                                <VoiceNarrationRecorder
                onTranscriptChange={setChapterTitle}
                initialTranscript={chapterTitle} />


                                <div className="flex gap-3">
                                    <Button
                  onClick={() => setCurrentStep(4)}
                  variant="outline"
                  className="flex-1 h-16 text-base font-semibold border-2">

                                        <ChevronLeft className="w-6 h-6 mr-2" />
                                        Cancel
                                    </Button>
                                    <Button
                  onClick={handleMakeSlides}
                  className="flex-1 bg-green-600 hover:bg-green-700 h-16 text-xl font-bold shadow-lg"
                  disabled={isSaving || !chapterTitle}>

                                        {isSaving ?
                  <>
                                                <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                                                Creating...
                                            </> :

                  <>
                                                Make Slides
                                                <ChevronRight className="w-6 h-6 ml-2" />
                                            </>
                  }
                                    </Button>
                                </div>
                            </motion.div>
            }

                        {/* Slide Creation Screen */}
                        {currentStep === 4 &&
            <motion.div
              key="create-slide"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="p-6 space-y-6">

                                {/* Upload Overlay */}
                                {isUploading &&
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
                                        <div className="bg-white rounded-lg p-8 max-w-sm mx-4 text-center">
                                            <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-blue-600" />
                                            <h3 className="text-xl font-bold text-slate-800 mb-2">
                                                Uploading Image
                                            </h3>
                                            <p className="text-sm text-slate-600">
                                                Please wait while your image is being processed and uploaded...
                                            </p>
                                        </div>
                                    </div>
              }

                                <div className="mb-6">
                                    <Badge className="bg-blue-100 text-blue-700 mb-2">
                                        {currentSlideId ? 'Edit Slide' : 'New Slide'}
                                    </Badge>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                                        {currentSlideId ? 'Edit Slide' : 'Create a Slide'}
                                    </h2>
                                    <p className="text-sm text-slate-600">
                                        Add content for this slide: title, image with location, and description.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {/* Slide Title Button */}
                                    <Button
                  onClick={() => setCurrentStep(11)}
                  className={`w-full h-28 justify-between border-0 shadow-lg ${
                  slideTitle ?
                  'bg-green-500 hover:bg-green-600' :
                  'bg-indigo-500 hover:bg-indigo-600'}`
                  }
                  disabled={isUploading}>

                                        <Mic className="w-24 h-24 text-white flex-shrink-0" strokeWidth={2.5} />
                                        <p className="font-black text-white text-2xl flex-1 text-center">SLIDE TITLE</p>
                                        {slideTitle && <Check className="w-16 h-16 text-white flex-shrink-0" strokeWidth={4} />}
                                    </Button>

                                    {/* Slide Image Button */}
                                    <input
                  ref={slideImageInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleSlideImageUpload}
                  className="hidden" />

                                    <Button
                  onClick={() => slideImageInputRef.current?.click()}
                  className={`w-full h-28 justify-between border-0 shadow-lg ${
                  slideImage ?
                  'bg-green-500 hover:bg-green-600' :
                  'bg-cyan-500 hover:bg-cyan-600'}`
                  }
                  disabled={isUploading}>

                                        {isUploading ?
                  <Loader2 className="w-24 h-24 text-white flex-shrink-0 animate-spin" strokeWidth={2.5} /> :

                  <Camera className="w-24 h-24 text-white flex-shrink-0" strokeWidth={2.5} />
                  }
                                        <p className="font-black text-white text-2xl flex-1 text-center">TAKE PHOTO</p>
                                        {slideImage && <Check className="w-16 h-16 text-white flex-shrink-0" strokeWidth={4} />}
                                    </Button>

                                    {/* Preview Image */}
                                    {slideImage &&
                <div className="relative w-full h-40 rounded-lg overflow-hidden border-2 border-slate-200">
                                            <img src={slideImage.url} alt="Slide" className="w-full h-full object-cover" />
                                            {slideLocation &&
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {slideLocation.coords}
                                                </div>
                  }
                                        </div>
                }

                                    {/* Slide Description Button */}
                                    <Button
                  onClick={() => setCurrentStep(12)}
                  className={`w-full h-28 justify-between border-0 shadow-lg ${
                  slideDescription ?
                  'bg-green-500 hover:bg-green-600' :
                  'bg-pink-500 hover:bg-pink-600'}`
                  }
                  disabled={isUploading}>

                                        <Mic className="w-24 h-24 text-white flex-shrink-0" strokeWidth={2.5} />
                                        <p className="font-black text-white text-2xl flex-1 text-center">DESCRIPTION</p>
                                        {slideDescription && <Check className="w-16 h-16 text-white flex-shrink-0" strokeWidth={4} />}
                                    </Button>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-3 pt-4">
                                        <Button
                    onClick={handleSaveAndAddAnotherSlide}
                    className="w-full bg-green-600 hover:bg-green-700 h-16 text-lg font-bold shadow-lg"
                    disabled={isSaving || !slideTitle || isUploading}>

                                            {isSaving ?
                    <>
                                                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                                                    Saving...
                                                </> :

                    <>
                                                    Add Another Slide
                                                    <ChevronRight className="w-6 h-6 ml-2" />
                                                </>
                    }
                                        </Button>
                                        <Button
                    onClick={handleSaveAndReviewSlides}
                    variant="outline"
                    className="w-full h-14 text-base font-semibold border-2"
                    disabled={isUploading}>

                                            <FileText className="w-6 h-6 mr-2" />
                                            Review Slides ({slides.length + (slideTitle && !currentSlideId ? 1 : 0)})
                                        </Button>
                                        <Button
                    onClick={handleSaveAndAddNewChapter}
                    variant="outline"
                    className="w-full h-14 text-base font-semibold border-2"
                    disabled={isUploading}>

                                            <ChevronRight className="w-6 h-6 mr-2" />
                                            Add New Chapter
                                        </Button>
                                        <Button
                    onClick={handleExitStory}
                    variant="outline"
                    className="w-full h-14 text-base font-semibold border-2"
                    disabled={isUploading}>

                                            <X className="w-6 h-6 mr-2" />
                                            Exit Story
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
            }

                        {/* Slide Title Recording Screen */}
                        {currentStep === 11 &&
            <motion.div
              key="slide-title-recording"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="p-6 space-y-6">

                                <div>
                                    <Badge className="bg-blue-100 text-blue-700 mb-2">Slide Title</Badge>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                                        Dictate Slide Title
                                    </h2>
                                    <p className="text-sm text-slate-600">
                                        Record the title for this slide.
                                    </p>
                                </div>

                                <VoiceNarrationRecorder
                onTranscriptChange={setSlideTitle}
                initialTranscript={slideTitle} />


                                <div className="flex gap-2">
                                    <Button
                  onClick={() => setCurrentStep(4)}
                  variant="outline"
                  className="flex-1">

                                        <ChevronLeft className="w-4 h-4 mr-2" />
                                        Back
                                    </Button>
                                    {slideTitle &&
                <Button
                  onClick={() => setCurrentStep(4)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700">

                                            Done
                                            <Check className="w-4 h-4 ml-2" />
                                        </Button>
                }
                                </div>
                            </motion.div>
            }

                        {/* Slide Description Recording Screen */}
                        {currentStep === 12 &&
            <motion.div
              key="slide-description-recording"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="p-6 space-y-6">

                                <div>
                                    <Badge className="bg-blue-100 text-blue-700 mb-2">Slide Description</Badge>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                                        Dictate Description
                                    </h2>
                                    <p className="text-sm text-slate-600">
                                        Record a short paragraph describing this slide.
                                    </p>
                                </div>

                                <VoiceNarrationRecorder
                onTranscriptChange={setSlideDescription}
                initialTranscript={slideDescription} />


                                <div className="flex gap-2">
                                    <Button
                  onClick={() => setCurrentStep(4)}
                  variant="outline"
                  className="flex-1">

                                        <ChevronLeft className="w-4 h-4 mr-2" />
                                        Back
                                    </Button>
                                    <Button
                  onClick={() => setCurrentStep(4)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700">

                                        Done
                                        <Check className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </motion.div>
            }

                        {/* Review Slides Screen */}
                        {currentStep === 5 &&
            <motion.div
              key="review-slides"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="p-6 space-y-6">

                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                                        Review Slides
                                    </h2>
                                    <p className="text-sm text-slate-600">
                                        {slides.length} slide{slides.length !== 1 ? 's' : ''} created for this chapter.
                                    </p>
                                </div>

                                {isLoadingSlides ?
              <div className="text-center py-12">
                                        <Loader2 className="w-8 h-8 mx-auto animate-spin text-slate-400" />
                                    </div> :
              slides.length === 0 ?
              <div className="text-center py-12 text-slate-500">
                                        <p>No slides yet. Create your first slide!</p>
                                    </div> :

              <div className="space-y-3">
                                        {slides.map((slide, index) =>
                <button
                  key={slide.id}
                  onClick={() => loadSlideForEdit(slide)}
                  className="w-full bg-slate-50 border-2 border-slate-200 hover:border-blue-600 hover:bg-blue-50 rounded-lg p-4 text-left transition-colors">

                                                <div className="flex gap-3">
                                                    {slide.image &&
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="w-20 h-20 object-cover rounded flex-shrink-0" />

                    }
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Badge variant="outline" className="text-xs">
                                                                Slide {index + 1}
                                                            </Badge>
                                                            {slide.coordinates &&
                        <MapPin className="w-3 h-3 text-green-600" />
                        }
                                                        </div>
                                                        <h3 className="font-semibold text-slate-800 mb-1 truncate">
                                                            {slide.title}
                                                        </h3>
                                                        {slide.description &&
                      <p className="text-xs text-slate-600 line-clamp-2">
                                                                {slide.description}
                                                            </p>
                      }
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 self-center" />
                                                </div>
                                            </button>
                )}
                                    </div>
              }

                                <div className="flex gap-2 pt-4">
                                    <Button
                  onClick={() => setCurrentStep(4)}
                  variant="outline"
                  className="flex-1">

                                        <ChevronLeft className="w-4 h-4 mr-2" />
                                        Back to Slide Entry
                                    </Button>
                                    <Button
                  onClick={() => {
                    alert('Chapter complete! Navigate to desktop editor to finalize.');
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700">

                                        Done
                                        <Check className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </motion.div>
            }


                    </AnimatePresence>
                </div>
            </div>
        </div>);

}

function Label({ children, className = '' }) {
  return <label className={`block font-medium ${className}`}>{children}</label>;
}