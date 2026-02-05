import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
    Mic, Camera, MapPin, ChevronRight, Plus,
    Check, Loader2, X, Square, Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MobileStoryCapture() {
    const navigate = useNavigate();
    
    // Story data
    const [storyTitle, setStoryTitle] = useState('');
    const [heroImage, setHeroImage] = useState(null);
    const [storyLocation, setStoryLocation] = useState(null);
    
    // Chapter data
    const [chapters, setChapters] = useState([]);
    const [currentChapterTitle, setCurrentChapterTitle] = useState('');
    const [currentChapterLocation, setCurrentChapterLocation] = useState(null);
    
    // Slide data
    const [currentSlideTitle, setCurrentSlideTitle] = useState('');
    const [currentSlideDescription, setCurrentSlideDescription] = useState('');
    const [currentSlideImage, setCurrentSlideImage] = useState(null);
    const [currentSlideLocation, setCurrentSlideLocation] = useState(null);
    
    // UI state
    const [currentScreen, setCurrentScreen] = useState('story-setup'); // 'story-setup', 'chapter-setup', 'slide-creation', 'slide-choice'
    const [isRecording, setIsRecording] = useState(false);
    const [recordingFor, setRecordingFor] = useState(null); // 'story-title', 'chapter-title', 'slide-title', 'slide-description'
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const fileInputRef = useRef(null);
    const heroImageInputRef = useRef(null);
    const recognitionRef = useRef(null);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript + ' ';
                    }
                }
                if (finalTranscript) {
                    const cleanTranscript = finalTranscript.trim();
                    if (recordingFor === 'story-title') {
                        setStoryTitle(prev => prev + ' ' + cleanTranscript);
                    } else if (recordingFor === 'chapter-title') {
                        setCurrentChapterTitle(prev => prev + ' ' + cleanTranscript);
                    } else if (recordingFor === 'slide-title') {
                        setCurrentSlideTitle(prev => prev + ' ' + cleanTranscript);
                    } else if (recordingFor === 'slide-description') {
                        setCurrentSlideDescription(prev => prev + ' ' + cleanTranscript);
                    }
                }
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsRecording(false);
                setRecordingFor(null);
            };

            recognitionRef.current.onend = () => {
                setIsRecording(false);
                setRecordingFor(null);
            };
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [recordingFor]);

    const handleStartRecording = (field) => {
        if (!recognitionRef.current) {
            alert('Speech recognition is not supported in this browser. Please use Safari on iOS.');
            return;
        }
        setIsRecording(true);
        setRecordingFor(field);
        recognitionRef.current.start();
    };

    const handleStopRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsRecording(false);
        setRecordingFor(null);
    };

    const handleHeroImageSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            setHeroImage(file_url);
        } catch (error) {
            console.error('Error uploading hero image:', error);
            alert('Failed to upload image. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSlideImageSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            setCurrentSlideImage(file_url);
        } catch (error) {
            console.error('Error uploading slide image:', error);
            alert('Failed to upload image. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleCaptureLocation = async (locationType) => {
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

            const locationData = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                coords: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
                accuracy: position.coords.accuracy
            };

            if (locationType === 'story') {
                setStoryLocation(locationData);
            } else if (locationType === 'chapter') {
                setCurrentChapterLocation(locationData);
            } else if (locationType === 'slide') {
                setCurrentSlideLocation(locationData);
            }
        } catch (error) {
            console.error('Error getting location:', error);
            alert('Unable to get your location. Please check permissions.');
        }
    };



    const handleCompleteStorySetup = () => {
        if (!storyTitle.trim()) {
            alert('Please enter a story title');
            return;
        }
        setCurrentScreen('chapter-setup');
    };

    const handleCompleteChapterSetup = () => {
        if (!currentChapterTitle.trim()) {
            alert('Please enter a chapter title');
            return;
        }
        setCurrentScreen('slide-creation');
    };

    const handleSaveSlide = () => {
        if (!currentSlideTitle.trim()) {
            alert('Please enter a slide title');
            return;
        }

        const newSlide = {
            id: `temp-${Date.now()}`,
            title: currentSlideTitle,
            description: currentSlideDescription,
            image: currentSlideImage,
            location: currentSlideLocation
        };

        const currentChapterIndex = chapters.length;
        if (chapters[currentChapterIndex]) {
            chapters[currentChapterIndex].slides.push(newSlide);
            setChapters([...chapters]);
        } else {
            setChapters([...chapters, {
                title: currentChapterTitle,
                location: currentChapterLocation,
                slides: [newSlide]
            }]);
        }

        // Reset slide form
        setCurrentSlideTitle('');
        setCurrentSlideDescription('');
        setCurrentSlideImage(null);
        setCurrentSlideLocation(null);

        setCurrentScreen('slide-choice');
    };

    const handleNewSlide = () => {
        setCurrentScreen('slide-creation');
    };

    const handleNewChapter = () => {
        setCurrentChapterTitle('');
        setCurrentChapterLocation(null);
        setCurrentScreen('chapter-setup');
    };

    const handleFinishStory = async () => {
        setIsSaving(true);
        try {
            const user = await base44.auth.me();
            
            const storyData = {
                title: storyTitle,
                subtitle: 'Created via Storyboarder',
                author: user.full_name || user.email,
                hero_image: heroImage,
                is_published: false
            };

            const story = await base44.entities.Story.create(storyData);

            for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex++) {
                const chapterData = chapters[chapterIndex];
                const chapter = await base44.entities.Chapter.create({
                    story_id: story.id,
                    order: chapterIndex,
                    coordinates: chapterData.location ? [chapterData.location.lat, chapterData.location.lng] : 
                                 (storyLocation ? [storyLocation.lat, storyLocation.lng] : [0, 0]),
                    zoom: 12,
                    map_style: 'light',
                    alignment: 'left'
                });

                for (let slideIndex = 0; slideIndex < chapterData.slides.length; slideIndex++) {
                    const slideData = chapterData.slides[slideIndex];
                    await base44.entities.Slide.create({
                        chapter_id: chapter.id,
                        order: slideIndex,
                        title: slideData.title,
                        description: slideData.description,
                        image: slideData.image,
                        coordinates: slideData.location ? [slideData.location.lat, slideData.location.lng] : undefined,
                        location: slideData.location ? slideData.location.coords : undefined
                    });
                }
            }

            navigate(`${createPageUrl('StoryEditor')}?id=${story.id}`);
        } catch (error) {
            console.error('Error saving story:', error);
            alert('Failed to save story. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
            {/* Header */}
            <div className="bg-amber-600 text-white px-6 py-6 shadow-lg">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold mb-2">Storyboarder</h1>
                    <p className="text-amber-100 text-sm">Remote story capture from Storylines</p>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                <AnimatePresence mode="wait">
                    {/* Story Setup Screen */}
                    {currentScreen === 'story-setup' && (
                            <motion.div
                                key="story-setup"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="bg-white rounded-lg shadow-md p-6 space-y-6"
                            >
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Start a New Story</h2>
                                    <p className="text-sm text-slate-600">
                                        Enter the basic information for your project story.
                                    </p>
                                </div>

                                {/* Story Title */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700">Story Title</label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={storyTitle}
                                            onChange={(e) => setStoryTitle(e.target.value)}
                                            placeholder="Enter title or use voice..."
                                            className="flex-1"
                                        />
                                        <Button
                                            onClick={() => isRecording && recordingFor === 'story-title' ? handleStopRecording() : handleStartRecording('story-title')}
                                            variant={isRecording && recordingFor === 'story-title' ? 'destructive' : 'outline'}
                                            size="icon"
                                        >
                                            {isRecording && recordingFor === 'story-title' ? (
                                                <Square className="w-4 h-4" />
                                            ) : (
                                                <Mic className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Hero Image */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700">Hero Image</label>
                                    <input
                                        ref={heroImageInputRef}
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={handleHeroImageSelect}
                                        className="hidden"
                                    />
                                    {heroImage ? (
                                        <div className="relative">
                                            <img src={heroImage} alt="Hero" className="w-full h-48 object-cover rounded-lg" />
                                            <Button
                                                onClick={() => setHeroImage(null)}
                                                variant="destructive"
                                                size="sm"
                                                className="absolute top-2 right-2"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            onClick={() => heroImageInputRef.current?.click()}
                                            variant="outline"
                                            className="w-full h-32"
                                            disabled={isUploading}
                                        >
                                            {isUploading ? (
                                                <Loader2 className="w-6 h-6 animate-spin" />
                                            ) : (
                                                <>
                                                    <Camera className="w-6 h-6 mr-2" />
                                                    Capture Hero Image
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>

                                {/* Starting Location */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700">Starting Location</label>
                                    {storyLocation ? (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-slate-800">Location Captured</p>
                                                    <p className="text-xs text-slate-600">{storyLocation.coords}</p>
                                                </div>
                                                <Button
                                                    onClick={() => setStoryLocation(null)}
                                                    variant="ghost"
                                                    size="sm"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button
                                            onClick={() => handleCaptureLocation('story')}
                                            variant="outline"
                                            className="w-full"
                                        >
                                            <MapPin className="w-4 h-4 mr-2" />
                                            Capture Location
                                        </Button>
                                    )}
                                </div>

                                <Button
                                    onClick={handleCompleteStorySetup}
                                    className="w-full bg-amber-600 hover:bg-amber-700"
                                >
                                    Continue to Chapter
                                    <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            </motion.div>
                    )}

                    {/* Chapter Setup Screen */}
                    {currentScreen === 'chapter-setup' && (
                            <motion.div
                                key="chapter-setup"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="bg-white rounded-lg shadow-md p-6 space-y-6"
                            >
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Create a Chapter</h2>
                                    <p className="text-sm text-slate-600">
                                        Set up a new chapter for this section of your story.
                                    </p>
                                </div>

                                {/* Chapter Title */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700">Chapter Title</label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={currentChapterTitle}
                                            onChange={(e) => setCurrentChapterTitle(e.target.value)}
                                            placeholder="Enter chapter title or use voice..."
                                            className="flex-1"
                                        />
                                        <Button
                                            onClick={() => isRecording && recordingFor === 'chapter-title' ? handleStopRecording() : handleStartRecording('chapter-title')}
                                            variant={isRecording && recordingFor === 'chapter-title' ? 'destructive' : 'outline'}
                                            size="icon"
                                        >
                                            {isRecording && recordingFor === 'chapter-title' ? (
                                                <Square className="w-4 h-4" />
                                            ) : (
                                                <Mic className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Chapter Location */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700">Chapter Location</label>
                                    {currentChapterLocation ? (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-slate-800">Location Captured</p>
                                                    <p className="text-xs text-slate-600">{currentChapterLocation.coords}</p>
                                                </div>
                                                <Button
                                                    onClick={() => setCurrentChapterLocation(null)}
                                                    variant="ghost"
                                                    size="sm"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button
                                            onClick={() => handleCaptureLocation('chapter')}
                                            variant="outline"
                                            className="w-full"
                                        >
                                            <MapPin className="w-4 h-4 mr-2" />
                                            Capture Location
                                        </Button>
                                    )}
                                </div>

                                <Button
                                    onClick={handleCompleteChapterSetup}
                                    className="w-full bg-amber-600 hover:bg-amber-700"
                                >
                                    Create First Slide
                                    <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            </motion.div>
                    )}

                    {/* Slide Creation Screen */}
                    {currentScreen === 'slide-creation' && (
                            <motion.div
                                key="slide-creation"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="bg-white rounded-lg shadow-md p-6 space-y-6"
                            >
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Create a Slide</h2>
                                    <p className="text-sm text-slate-600">
                                        Add content for this slide in your chapter.
                                    </p>
                                </div>

                                {/* Slide Title */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700">Slide Title</label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={currentSlideTitle}
                                            onChange={(e) => setCurrentSlideTitle(e.target.value)}
                                            placeholder="Enter slide title or use voice..."
                                            className="flex-1"
                                        />
                                        <Button
                                            onClick={() => isRecording && recordingFor === 'slide-title' ? handleStopRecording() : handleStartRecording('slide-title')}
                                            variant={isRecording && recordingFor === 'slide-title' ? 'destructive' : 'outline'}
                                            size="icon"
                                        >
                                            {isRecording && recordingFor === 'slide-title' ? (
                                                <Square className="w-4 h-4" />
                                            ) : (
                                                <Mic className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Slide Description */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700">Description</label>
                                    <div className="space-y-2">
                                        <Textarea
                                            value={currentSlideDescription}
                                            onChange={(e) => setCurrentSlideDescription(e.target.value)}
                                            placeholder="Enter description or use voice..."
                                            rows={4}
                                        />
                                        <Button
                                            onClick={() => isRecording && recordingFor === 'slide-description' ? handleStopRecording() : handleStartRecording('slide-description')}
                                            variant={isRecording && recordingFor === 'slide-description' ? 'destructive' : 'outline'}
                                            size="sm"
                                            className="w-full"
                                        >
                                            {isRecording && recordingFor === 'slide-description' ? (
                                                <>
                                                    <Square className="w-4 h-4 mr-2" />
                                                    Stop Recording
                                                </>
                                            ) : (
                                                <>
                                                    <Mic className="w-4 h-4 mr-2" />
                                                    Record Description
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Slide Image */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700">Image (Optional)</label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={handleSlideImageSelect}
                                        className="hidden"
                                    />
                                    {currentSlideImage ? (
                                        <div className="relative">
                                            <img src={currentSlideImage} alt="Slide" className="w-full h-48 object-cover rounded-lg" />
                                            <Button
                                                onClick={() => setCurrentSlideImage(null)}
                                                variant="destructive"
                                                size="sm"
                                                className="absolute top-2 right-2"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            onClick={() => fileInputRef.current?.click()}
                                            variant="outline"
                                            className="w-full"
                                            disabled={isUploading}
                                        >
                                            {isUploading ? (
                                                <Loader2 className="w-6 h-6 animate-spin" />
                                            ) : (
                                                <>
                                                    <Camera className="w-4 h-4 mr-2" />
                                                    Add Image
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>

                                {/* Slide Location */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700">Location (Optional)</label>
                                    {currentSlideLocation ? (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-slate-800">Location Captured</p>
                                                    <p className="text-xs text-slate-600">{currentSlideLocation.coords}</p>
                                                </div>
                                                <Button
                                                    onClick={() => setCurrentSlideLocation(null)}
                                                    variant="ghost"
                                                    size="sm"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button
                                            onClick={() => handleCaptureLocation('slide')}
                                            variant="outline"
                                            className="w-full"
                                        >
                                            <MapPin className="w-4 h-4 mr-2" />
                                            Capture Location
                                        </Button>
                                    )}
                                </div>

                                <Button
                                    onClick={handleSaveSlide}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                >
                                    <Check className="w-4 h-4 mr-2" />
                                    Save Slide
                                </Button>
                            </motion.div>
                    )}

                    {/* Slide Choice Screen */}
                    {currentScreen === 'slide-choice' && (
                            <motion.div
                                key="slide-choice"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="bg-white rounded-lg shadow-md p-6 space-y-6"
                            >
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Check className="w-8 h-8 text-green-600" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Slide Saved!</h2>
                                    <p className="text-sm text-slate-600">
                                        What would you like to do next?
                                    </p>
                                </div>

                                {/* Summary */}
                                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Chapters:</span>
                                        <span className="font-semibold text-slate-800">{chapters.length}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Total Slides:</span>
                                        <span className="font-semibold text-slate-800">
                                            {chapters.reduce((sum, ch) => sum + ch.slides.length, 0)}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Button
                                        onClick={handleNewSlide}
                                        variant="outline"
                                        className="w-full h-16 border-2 border-amber-300"
                                    >
                                        <Plus className="w-5 h-5 mr-2" />
                                        Add Another Slide
                                    </Button>

                                    <Button
                                        onClick={handleNewChapter}
                                        variant="outline"
                                        className="w-full h-16 border-2 border-blue-300"
                                    >
                                        <Plus className="w-5 h-5 mr-2" />
                                        Start New Chapter
                                    </Button>

                                    <Button
                                        onClick={handleFinishStory}
                                        className="w-full h-16 bg-green-600 hover:bg-green-700"
                                        disabled={isSaving}
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                Saving Story...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-5 h-5 mr-2" />
                                                Finish & Open in Editor
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </motion.div>
                    )}
                </AnimatePresence>
            </div>
            </div>
        </div>
    );
}