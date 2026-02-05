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
                                <div className="space-y-4">
                                    <label className="block text-lg font-bold text-slate-800 text-center">Story Title</label>
                                    {storyTitle && (
                                        <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200">
                                            <p className="text-slate-800 text-center">{storyTitle}</p>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-center py-6">
                                        <button
                                            onClick={() => isRecording && recordingFor === 'story-title' ? handleStopRecording() : handleStartRecording('story-title')}
                                            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all shadow-xl ${
                                                isRecording && recordingFor === 'story-title'
                                                    ? 'bg-red-500 animate-pulse' 
                                                    : 'bg-amber-600 hover:bg-amber-700'
                                            }`}
                                        >
                                            {isRecording && recordingFor === 'story-title' ? (
                                                <Square className="w-12 h-12 text-white" />
                                            ) : (
                                                <Mic className="w-16 h-16 text-white" />
                                            )}
                                        </button>
                                        <p className="mt-4 text-sm font-medium text-slate-600">
                                            {isRecording && recordingFor === 'story-title' ? 'Tap to Stop' : 'Tap to Record Title'}
                                        </p>
                                    </div>
                                </div>

                                {/* Hero Image */}
                                <div className="space-y-4">
                                    <label className="block text-lg font-bold text-slate-800 text-center">Hero Image</label>
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
                                            <img src={heroImage} alt="Hero" className="w-full h-56 object-cover rounded-xl border-4 border-slate-200" />
                                            <button
                                                onClick={() => setHeroImage(null)}
                                                className="absolute top-3 right-3 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 shadow-lg"
                                            >
                                                <X className="w-6 h-6" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center py-6">
                                            <button
                                                onClick={() => heroImageInputRef.current?.click()}
                                                disabled={isUploading}
                                                className="w-32 h-32 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-all shadow-xl disabled:opacity-50"
                                            >
                                                {isUploading ? (
                                                    <Loader2 className="w-16 h-16 text-white animate-spin" />
                                                ) : (
                                                    <Camera className="w-16 h-16 text-white" />
                                                )}
                                            </button>
                                            <p className="mt-4 text-sm font-medium text-slate-600">
                                                {isUploading ? 'Uploading...' : 'Tap to Capture'}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Starting Location */}
                                <div className="space-y-4">
                                    <label className="block text-lg font-bold text-slate-800 text-center">Starting Location</label>
                                    {storyLocation ? (
                                        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-green-800">Location Captured</p>
                                                    <p className="text-sm text-green-700">{storyLocation.coords}</p>
                                                </div>
                                                <button
                                                    onClick={() => setStoryLocation(null)}
                                                    className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center py-6">
                                            <button
                                                onClick={() => handleCaptureLocation('story')}
                                                className="w-32 h-32 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center transition-all shadow-xl"
                                            >
                                                <MapPin className="w-16 h-16 text-white" />
                                            </button>
                                            <p className="mt-4 text-sm font-medium text-slate-600">Tap to Capture</p>
                                        </div>
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
                                <div className="space-y-4">
                                    <label className="block text-lg font-bold text-slate-800 text-center">Chapter Title</label>
                                    {currentChapterTitle && (
                                        <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200">
                                            <p className="text-slate-800 text-center">{currentChapterTitle}</p>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-center py-6">
                                        <button
                                            onClick={() => isRecording && recordingFor === 'chapter-title' ? handleStopRecording() : handleStartRecording('chapter-title')}
                                            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all shadow-xl ${
                                                isRecording && recordingFor === 'chapter-title'
                                                    ? 'bg-red-500 animate-pulse' 
                                                    : 'bg-amber-600 hover:bg-amber-700'
                                            }`}
                                        >
                                            {isRecording && recordingFor === 'chapter-title' ? (
                                                <Square className="w-12 h-12 text-white" />
                                            ) : (
                                                <Mic className="w-16 h-16 text-white" />
                                            )}
                                        </button>
                                        <p className="mt-4 text-sm font-medium text-slate-600">
                                            {isRecording && recordingFor === 'chapter-title' ? 'Tap to Stop' : 'Tap to Record Title'}
                                        </p>
                                    </div>
                                </div>

                                {/* Chapter Location */}
                                <div className="space-y-4">
                                    <label className="block text-lg font-bold text-slate-800 text-center">Chapter Location</label>
                                    {currentChapterLocation ? (
                                        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-green-800">Location Captured</p>
                                                    <p className="text-sm text-green-700">{currentChapterLocation.coords}</p>
                                                </div>
                                                <button
                                                    onClick={() => setCurrentChapterLocation(null)}
                                                    className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center py-6">
                                            <button
                                                onClick={() => handleCaptureLocation('chapter')}
                                                className="w-32 h-32 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center transition-all shadow-xl"
                                            >
                                                <MapPin className="w-16 h-16 text-white" />
                                            </button>
                                            <p className="mt-4 text-sm font-medium text-slate-600">Tap to Capture</p>
                                        </div>
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
                                <div className="space-y-4">
                                    <label className="block text-lg font-bold text-slate-800 text-center">Slide Title</label>
                                    {currentSlideTitle && (
                                        <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200">
                                            <p className="text-slate-800 text-center">{currentSlideTitle}</p>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-center py-6">
                                        <button
                                            onClick={() => isRecording && recordingFor === 'slide-title' ? handleStopRecording() : handleStartRecording('slide-title')}
                                            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all shadow-xl ${
                                                isRecording && recordingFor === 'slide-title'
                                                    ? 'bg-red-500 animate-pulse' 
                                                    : 'bg-amber-600 hover:bg-amber-700'
                                            }`}
                                        >
                                            {isRecording && recordingFor === 'slide-title' ? (
                                                <Square className="w-12 h-12 text-white" />
                                            ) : (
                                                <Mic className="w-16 h-16 text-white" />
                                            )}
                                        </button>
                                        <p className="mt-4 text-sm font-medium text-slate-600">
                                            {isRecording && recordingFor === 'slide-title' ? 'Tap to Stop' : 'Tap to Record Title'}
                                        </p>
                                    </div>
                                </div>

                                {/* Slide Description */}
                                <div className="space-y-4">
                                    <label className="block text-lg font-bold text-slate-800 text-center">Description</label>
                                    {currentSlideDescription && (
                                        <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200 max-h-40 overflow-y-auto">
                                            <p className="text-slate-800">{currentSlideDescription}</p>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-center py-6">
                                        <button
                                            onClick={() => isRecording && recordingFor === 'slide-description' ? handleStopRecording() : handleStartRecording('slide-description')}
                                            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all shadow-xl ${
                                                isRecording && recordingFor === 'slide-description'
                                                    ? 'bg-red-500 animate-pulse' 
                                                    : 'bg-purple-600 hover:bg-purple-700'
                                            }`}
                                        >
                                            {isRecording && recordingFor === 'slide-description' ? (
                                                <Square className="w-12 h-12 text-white" />
                                            ) : (
                                                <Mic className="w-16 h-16 text-white" />
                                            )}
                                        </button>
                                        <p className="mt-4 text-sm font-medium text-slate-600">
                                            {isRecording && recordingFor === 'slide-description' ? 'Tap to Stop' : 'Tap to Record Description'}
                                        </p>
                                    </div>
                                </div>

                                {/* Slide Image */}
                                <div className="space-y-4">
                                    <label className="block text-lg font-bold text-slate-800 text-center">Image (Optional)</label>
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
                                            <img src={currentSlideImage} alt="Slide" className="w-full h-56 object-cover rounded-xl border-4 border-slate-200" />
                                            <button
                                                onClick={() => setCurrentSlideImage(null)}
                                                className="absolute top-3 right-3 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 shadow-lg"
                                            >
                                                <X className="w-6 h-6" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center py-6">
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploading}
                                                className="w-32 h-32 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-all shadow-xl disabled:opacity-50"
                                            >
                                                {isUploading ? (
                                                    <Loader2 className="w-16 h-16 text-white animate-spin" />
                                                ) : (
                                                    <Camera className="w-16 h-16 text-white" />
                                                )}
                                            </button>
                                            <p className="mt-4 text-sm font-medium text-slate-600">
                                                {isUploading ? 'Uploading...' : 'Tap to Capture'}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Slide Location */}
                                <div className="space-y-4">
                                    <label className="block text-lg font-bold text-slate-800 text-center">Location (Optional)</label>
                                    {currentSlideLocation ? (
                                        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-green-800">Location Captured</p>
                                                    <p className="text-sm text-green-700">{currentSlideLocation.coords}</p>
                                                </div>
                                                <button
                                                    onClick={() => setCurrentSlideLocation(null)}
                                                    className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center py-6">
                                            <button
                                                onClick={() => handleCaptureLocation('slide')}
                                                className="w-32 h-32 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center transition-all shadow-xl"
                                            >
                                                <MapPin className="w-16 h-16 text-white" />
                                            </button>
                                            <p className="mt-4 text-sm font-medium text-slate-600">Tap to Capture</p>
                                        </div>
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
    );
}