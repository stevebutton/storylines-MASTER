import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
    Mic, Camera, MapPin, ChevronRight, Plus,
    Check, Loader2, X, Square, Edit3, Home
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
    const [currentScreen, setCurrentScreen] = useState('welcome'); // 'welcome', 'story-setup', 'chapter-setup', 'slide-creation', 'slide-choice'
    const [isRecording, setIsRecording] = useState(false);
    const [recordingFor, setRecordingFor] = useState(null); // 'story-title', 'chapter-title', 'slide-title', 'slide-description'
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const fileInputRef = useRef(null);
    const heroImageInputRef = useRef(null);
    const recognitionRef = useRef(null);
    const recordingForRef = useRef(null);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error, 'Field:', recordingForRef.current);
                setIsRecording(false);
            };

            recognitionRef.current.onend = () => {
                setIsRecording(false);
            };
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    useEffect(() => {
        recordingForRef.current = recordingFor;
    }, [recordingFor]);

    useEffect(() => {
        if (recognitionRef.current) {
            recognitionRef.current.onresult = (event) => {
                console.log('Speech recognition onresult fired, event:', event);
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript + ' ';
                    }
                }
                if (finalTranscript) {
                    const cleanTranscript = finalTranscript.trim();
                    const currentField = recordingForRef.current;
                    console.log('Transcript received:', cleanTranscript, 'for field:', currentField);
                    if (currentField === 'story-title') {
                        console.log('Setting story title');
                        setStoryTitle(prev => {
                            const newValue = (prev + ' ' + cleanTranscript).trim();
                            console.log('Story title updated from', prev, 'to', newValue);
                            return newValue;
                        });
                    } else if (currentField === 'chapter-title') {
                        setCurrentChapterTitle(prev => (prev + ' ' + cleanTranscript).trim());
                    } else if (currentField === 'slide-title') {
                        setCurrentSlideTitle(prev => (prev + ' ' + cleanTranscript).trim());
                    } else if (currentField === 'slide-description') {
                        setCurrentSlideDescription(prev => (prev + ' ' + cleanTranscript).trim());
                    }
                } else {
                    console.log('No final transcript received');
                }
            };
        }
    }, []);

    const handleStartRecording = (field) => {
        if (!recognitionRef.current) {
            alert('Speech recognition is not supported in this browser. Please use Safari on iOS.');
            return;
        }
        console.log('Starting recording for field:', field);
        setIsRecording(true);
        setRecordingFor(field);
        try {
            recognitionRef.current.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
            setIsRecording(false);
        }
    };

    const handleStopRecording = () => {
        console.log('Stopping recording for field:', recordingForRef.current);
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
            <div className="bg-amber-600 text-white px-6 py-4 shadow-lg">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-center relative mb-3">
                        {currentScreen !== 'welcome' && (
                            <button
                                onClick={() => setCurrentScreen('welcome')}
                                className="absolute left-0 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                            >
                                <Home className="w-4 h-4 text-white" />
                            </button>
                        )}
                        <h1 className="text-lg font-medium">Storyboarder</h1>
                    </div>
                    <div className="text-center">
                        {currentScreen === 'story-setup' && (
                            <p className="text-white text-2xl font-bold">Start a New Story</p>
                        )}
                        {currentScreen === 'chapter-setup' && (
                            <p className="text-white text-2xl font-bold">Create a Chapter</p>
                        )}
                        {currentScreen === 'slide-creation' && (
                            <p className="text-white text-2xl font-bold">Create a Slide</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-4xl mx-auto px-4 py-4">
                <AnimatePresence mode="wait">
                        {/* Welcome Screen */}
                        {currentScreen === 'welcome' && (
                            <motion.div
                                key="welcome"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="bg-white rounded-lg shadow-md p-6 space-y-6"
                            >
                                <div className="text-center space-y-4">
                                    <h2 className="text-2xl font-bold text-slate-800">Welcome to Storyboarder</h2>
                                    <p className="text-base text-slate-600 leading-relaxed">
                                        Storyboarder is your companion for building stories in the field that integrate with the Storylines platform. Utilize intuitive voice, image, and location capture tools to build compelling narratives on the go. Your stories are structured into chapters and slides, ready for refinement and further editing within the Storylines desktop editor. Start building impactful narratives with Storyboarder today.
                                    </p>
                                </div>

                                <Button
                                    onClick={() => setCurrentScreen('story-setup')}
                                    className="w-full bg-amber-600 hover:bg-amber-700 h-12 text-base"
                                >
                                    Start a Story
                                </Button>
                            </motion.div>
                        )}

                        {/* Story Setup Screen */}
                        {currentScreen === 'story-setup' && (
                            <motion.div
                                key="story-setup"
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -50 }}
                                className="bg-white rounded-lg shadow-md p-6 space-y-6"
                            >
                                {/* Story Title */}
                                <div className="space-y-3">
                                    {storyTitle && (
                                        <div className="bg-slate-50 rounded-lg p-3 border-2 border-slate-200">
                                            <p className="text-slate-800 text-center">{storyTitle}</p>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-center py-3 space-y-2">
                                        <button
                                            onClick={() => isRecording && recordingFor === 'story-title' ? handleStopRecording() : handleStartRecording('story-title')}
                                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl ${
                                                isRecording && recordingFor === 'story-title'
                                                    ? 'bg-red-500 animate-pulse' 
                                                    : 'bg-amber-600 hover:bg-amber-700'
                                            }`}
                                        >
                                            {isRecording && recordingFor === 'story-title' ? (
                                                <Square className="w-10 h-10 text-white" />
                                            ) : (
                                                <Mic className="w-12 h-12 text-white" />
                                            )}
                                        </button>
                                        <p className="text-lg font-bold text-slate-800">Story Title</p>
                                        <p className="text-sm font-medium text-slate-600">
                                            {isRecording && recordingFor === 'story-title' ? 'Tap to Stop' : 'Tap to Record'}
                                        </p>
                                    </div>
                                </div>

                                {/* Hero Image */}
                                <div className="space-y-3">
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
                                            <img src={heroImage} alt="Hero" className="w-full h-40 object-cover rounded-xl border-4 border-slate-200" />
                                            <button
                                                onClick={() => setHeroImage(null)}
                                                className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 shadow-lg"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center py-3 space-y-2">
                                            <button
                                                onClick={() => heroImageInputRef.current?.click()}
                                                disabled={isUploading}
                                                className="w-20 h-20 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-all shadow-xl disabled:opacity-50"
                                            >
                                                {isUploading ? (
                                                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                                                ) : (
                                                    <Camera className="w-12 h-12 text-white" />
                                                )}
                                            </button>
                                            <p className="text-lg font-bold text-slate-800">Hero Image</p>
                                            <p className="text-sm font-medium text-slate-600">
                                                {isUploading ? 'Uploading...' : 'Tap to Capture'}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Starting Location */}
                                <div className="space-y-3">
                                    {storyLocation ? (
                                        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-green-800">Location Captured</p>
                                                    <p className="text-sm text-green-700">{storyLocation.coords}</p>
                                                </div>
                                                <button
                                                    onClick={() => setStoryLocation(null)}
                                                    className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center py-3 space-y-2">
                                            <button
                                                onClick={() => handleCaptureLocation('story')}
                                                className="w-20 h-20 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center transition-all shadow-xl"
                                            >
                                                <MapPin className="w-12 h-12 text-white" />
                                            </button>
                                            <p className="text-lg font-bold text-slate-800">Starting Location</p>
                                            <p className="text-sm font-medium text-slate-600">Tap to Capture</p>
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
                                {/* Chapter Title */}
                                <div className="space-y-3">
                                    {currentChapterTitle && (
                                        <div className="bg-slate-50 rounded-lg p-3 border-2 border-slate-200">
                                            <p className="text-slate-800 text-center">{currentChapterTitle}</p>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-center py-3 space-y-2">
                                        <button
                                            onClick={() => isRecording && recordingFor === 'chapter-title' ? handleStopRecording() : handleStartRecording('chapter-title')}
                                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl ${
                                                isRecording && recordingFor === 'chapter-title'
                                                    ? 'bg-red-500 animate-pulse' 
                                                    : 'bg-amber-600 hover:bg-amber-700'
                                            }`}
                                        >
                                            {isRecording && recordingFor === 'chapter-title' ? (
                                                <Square className="w-10 h-10 text-white" />
                                            ) : (
                                                <Mic className="w-12 h-12 text-white" />
                                            )}
                                        </button>
                                        <p className="text-lg font-bold text-slate-800">Chapter Title</p>
                                        <p className="text-sm font-medium text-slate-600">
                                            {isRecording && recordingFor === 'chapter-title' ? 'Tap to Stop' : 'Tap to Record'}
                                        </p>
                                    </div>
                                </div>

                                {/* Chapter Location */}
                                <div className="space-y-3">
                                    {currentChapterLocation ? (
                                        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-green-800">Location Captured</p>
                                                    <p className="text-sm text-green-700">{currentChapterLocation.coords}</p>
                                                </div>
                                                <button
                                                    onClick={() => setCurrentChapterLocation(null)}
                                                    className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center py-3 space-y-2">
                                            <button
                                                onClick={() => handleCaptureLocation('chapter')}
                                                className="w-20 h-20 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center transition-all shadow-xl"
                                            >
                                                <MapPin className="w-12 h-12 text-white" />
                                            </button>
                                            <p className="text-lg font-bold text-slate-800">Chapter Location</p>
                                            <p className="text-sm font-medium text-slate-600">Tap to Capture</p>
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
                                {/* Slide Title */}
                                <div className="space-y-3">
                                    {currentSlideTitle && (
                                        <div className="bg-slate-50 rounded-lg p-3 border-2 border-slate-200">
                                            <p className="text-slate-800 text-center">{currentSlideTitle}</p>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-center py-3 space-y-2">
                                        <button
                                            onClick={() => isRecording && recordingFor === 'slide-title' ? handleStopRecording() : handleStartRecording('slide-title')}
                                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl ${
                                                isRecording && recordingFor === 'slide-title'
                                                    ? 'bg-red-500 animate-pulse' 
                                                    : 'bg-amber-600 hover:bg-amber-700'
                                            }`}
                                        >
                                            {isRecording && recordingFor === 'slide-title' ? (
                                                <Square className="w-10 h-10 text-white" />
                                            ) : (
                                                <Mic className="w-12 h-12 text-white" />
                                            )}
                                        </button>
                                        <p className="text-lg font-bold text-slate-800">Slide Title</p>
                                        <p className="text-sm font-medium text-slate-600">
                                            {isRecording && recordingFor === 'slide-title' ? 'Tap to Stop' : 'Tap to Record'}
                                        </p>
                                    </div>
                                </div>

                                {/* Slide Description */}
                                <div className="space-y-3">
                                    {currentSlideDescription && (
                                        <div className="bg-slate-50 rounded-lg p-3 border-2 border-slate-200 max-h-32 overflow-y-auto">
                                            <p className="text-slate-800">{currentSlideDescription}</p>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-center py-3 space-y-2">
                                        <button
                                            onClick={() => isRecording && recordingFor === 'slide-description' ? handleStopRecording() : handleStartRecording('slide-description')}
                                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl ${
                                                isRecording && recordingFor === 'slide-description'
                                                    ? 'bg-red-500 animate-pulse' 
                                                    : 'bg-purple-600 hover:bg-purple-700'
                                            }`}
                                        >
                                            {isRecording && recordingFor === 'slide-description' ? (
                                                <Square className="w-10 h-10 text-white" />
                                            ) : (
                                                <Mic className="w-12 h-12 text-white" />
                                            )}
                                        </button>
                                        <p className="text-lg font-bold text-slate-800">Description</p>
                                        <p className="text-sm font-medium text-slate-600">
                                            {isRecording && recordingFor === 'slide-description' ? 'Tap to Stop' : 'Tap to Record'}
                                        </p>
                                    </div>
                                </div>

                                {/* Slide Image */}
                                <div className="space-y-3">
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
                                            <img src={currentSlideImage} alt="Slide" className="w-full h-40 object-cover rounded-xl border-4 border-slate-200" />
                                            <button
                                                onClick={() => setCurrentSlideImage(null)}
                                                className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 shadow-lg"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center py-3 space-y-2">
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploading}
                                                className="w-20 h-20 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-all shadow-xl disabled:opacity-50"
                                            >
                                                {isUploading ? (
                                                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                                                ) : (
                                                    <Camera className="w-12 h-12 text-white" />
                                                )}
                                            </button>
                                            <p className="text-lg font-bold text-slate-800">Image (Optional)</p>
                                            <p className="text-sm font-medium text-slate-600">
                                                {isUploading ? 'Uploading...' : 'Tap to Capture'}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Slide Location */}
                                <div className="space-y-3">
                                    {currentSlideLocation ? (
                                        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-green-800">Location Captured</p>
                                                    <p className="text-sm text-green-700">{currentSlideLocation.coords}</p>
                                                </div>
                                                <button
                                                    onClick={() => setCurrentSlideLocation(null)}
                                                    className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center py-3 space-y-2">
                                            <button
                                                onClick={() => handleCaptureLocation('slide')}
                                                className="w-20 h-20 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center transition-all shadow-xl"
                                            >
                                                <MapPin className="w-12 h-12 text-white" />
                                            </button>
                                            <p className="text-lg font-bold text-slate-800">Location (Optional)</p>
                                            <p className="text-sm font-medium text-slate-600">Tap to Capture</p>
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