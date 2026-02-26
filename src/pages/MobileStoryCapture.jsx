import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const generateId = () => crypto.randomUUID().replace(/-/g, '').substring(0, 24);
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Mic, Camera, MapPin, ChevronRight, ChevronLeft, 
    Check, FileText, Image as ImageIcon, MapPinned, Sparkles, Upload, Loader2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import VoiceNarrationRecorder from '@/components/mobile/VoiceNarrationRecorder';

export default function MobileStoryCapture() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [transcript, setTranscript] = useState('');
    const [photos, setPhotos] = useState([]);
    const [locations, setLocations] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef(null);

    const steps = [
        { id: 'welcome', title: 'Welcome', icon: Sparkles },
        { id: 'narrate', title: 'Narrate', icon: Mic },
        { id: 'photos', title: 'Photos', icon: Camera },
        { id: 'locations', title: 'Locations', icon: MapPin },
        { id: 'review', title: 'Review', icon: Check }
    ];

    const handleTakePhoto = async () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileSelect = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        setIsUploading(true);
        try {
            for (const file of files) {
                let locationData = null;
                
                if (navigator.geolocation) {
                    try {
                        const position = await new Promise((resolve, reject) => {
                            navigator.geolocation.getCurrentPosition(resolve, reject, {
                                enableHighAccuracy: true,
                                timeout: 5000
                            });
                        });
                        locationData = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            accuracy: position.coords.accuracy
                        };
                    } catch (error) {
                        console.log('Location access denied or unavailable');
                    }
                }

                const filePath = `${generateId()}-${file.name}`;
                const { error: upErr } = await supabase.storage.from('media').upload(filePath, file, { contentType: file.type, upsert: false });
                if (upErr) throw upErr;
                const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
                const file_url = publicUrl;

                setPhotos(prev => [...prev, {
                    id: Date.now() + Math.random(),
                    name: file.name,
                    url: file_url,
                    location: locationData
                }]);

                if (locationData && !locations.some(loc => 
                    Math.abs(loc.lat - locationData.lat) < 0.0001 && 
                    Math.abs(loc.lng - locationData.lng) < 0.0001
                )) {
                    setLocations(prev => [...prev, {
                        id: Date.now() + Math.random(),
                        name: `Photo location ${prev.length + 1}`,
                        lat: locationData.lat,
                        lng: locationData.lng,
                        coords: `${locationData.lat.toFixed(6)}, ${locationData.lng.toFixed(6)}`
                    }]);
                }
            }
        } catch (error) {
            console.error('Error uploading photos:', error);
            alert('Failed to upload photos. Please try again.');
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
                name: `Location ${locations.length + 1}`,
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                coords: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
                accuracy: position.coords.accuracy
            };

            setLocations(prev => [...prev, newLocation]);
        } catch (error) {
            console.error('Error getting location:', error);
            alert('Unable to get your location. Please check permissions.');
        }
    };

    const handleRemovePhoto = (photoId) => {
        setPhotos(prev => prev.filter(p => p.id !== photoId));
    };

    const handleSaveDraft = async () => {
        setIsSaving(true);
        try {
            const storyId = generateId();
            const { data: story, error: storyErr } = await supabase
                .from('stories')
                .insert({ id: storyId, title: `Field Story ${new Date().toLocaleDateString()}`, subtitle: 'Draft from mobile capture', is_published: false })
                .select().single();
            if (storyErr) throw storyErr;

            if (locations.length > 0) {
                const chapterId = generateId();
                const { data: chapter, error: chapErr } = await supabase
                    .from('chapters')
                    .insert({ id: chapterId, story_id: story.id, order: 0, coordinates: [locations[0].lat, locations[0].lng], zoom: 12, map_style: 'light', alignment: 'left' })
                    .select().single();
                if (chapErr) throw chapErr;

                for (let i = 0; i < photos.length; i++) {
                    const photo = photos[i];
                    const { error: slideErr } = await supabase.from('slides').insert({
                        id: generateId(),
                        chapter_id: chapter.id,
                        order: i,
                        title: photo.name.replace(/\.[^/.]+$/, ''),
                        description: i === 0 && transcript ? transcript : '',
                        image: photo.url,
                        coordinates: photo.location ? [photo.location.lat, photo.location.lng] : undefined,
                        location: photo.location ? `${photo.location.lat.toFixed(4)}, ${photo.location.lng.toFixed(4)}` : undefined
                    });
                    if (slideErr) throw slideErr;
                }
            }

            navigate(`${createPageUrl('StoryEditor')}?id=${story.id}`);
        } catch (error) {
            console.error('Error saving draft:', error);
            alert('Failed to save draft. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
            {/* Mobile Device Frame */}
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-8 border-slate-800">
                {/* Status Bar */}
                <div className="bg-slate-800 text-white px-6 py-2 flex items-center justify-between text-xs">
                    <span>9:41</span>
                    <div className="flex gap-1">
                        <div className="w-4 h-3 border border-white rounded-sm"></div>
                        <div className="w-4 h-3 border border-white rounded-sm"></div>
                        <div className="w-4 h-3 border border-white rounded-sm"></div>
                    </div>
                </div>

                {/* Header */}
                <div className="bg-amber-600 text-white px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                        <button className="text-white">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-xl font-bold">Field Story Capture</h1>
                        <div className="w-6"></div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="h-[600px] overflow-y-auto">
                    <AnimatePresence mode="wait">
                        {/* Welcome Step */}
                        {currentStep === 0 && (
                            <motion.div
                                key="welcome"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="p-6 space-y-6"
                            >
                                <div className="text-center py-8">
                                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Sparkles className="w-10 h-10 text-amber-600" />
                                    </div>
                                    <h2 className="text-4xl font-bold text-slate-800 mb-2">
                                        Storyboarder
                                    </h2>
                                    <p className="text-amber-600 font-medium mb-4">
                                        Remote story capture from Storylines
                                    </p>
                                    <p className="text-slate-600 leading-relaxed text-sm">
                                        Quickly capture your story elements on the go. Dictate your narrative, 
                                        add photos, and capture locations to build a draft story for later 
                                        refinement on your desktop.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                                        <Mic className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h3 className="font-semibold text-slate-800 text-sm">Voice Narration</h3>
                                            <p className="text-xs text-slate-600">Dictate your outline hands-free</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                                        <Camera className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h3 className="font-semibold text-slate-800 text-sm">Photo Documentation</h3>
                                            <p className="text-xs text-slate-600">Capture visuals directly from your device</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                                        <MapPin className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h3 className="font-semibold text-slate-800 text-sm">GPS Coordinates</h3>
                                            <p className="text-xs text-slate-600">Automatic location capture</p>
                                        </div>
                                    </div>
                                </div>

                                <Button 
                                    onClick={() => setCurrentStep(1)}
                                    className="w-full bg-amber-600 hover:bg-amber-700 h-12 text-base"
                                >
                                    Start New Story
                                    <ChevronRight className="w-5 h-5 ml-2" />
                                </Button>
                            </motion.div>
                        )}

                        {/* Narrate Step */}
                        {currentStep === 1 && (
                            <motion.div
                                key="narrate"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="p-6 space-y-6"
                            >
                                <div>
                                    <Badge className="bg-amber-100 text-amber-700 mb-2">Step 1 of 4</Badge>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                                        Narrate Your Outline
                                    </h2>
                                    <p className="text-sm text-slate-600">
                                        Press the microphone to dictate your story's main points. We'll transcribe 
                                        it into chapter and slide ideas.
                                    </p>
                                </div>

                                <VoiceNarrationRecorder 
                                    onTranscriptChange={setTranscript}
                                    initialTranscript={transcript}
                                />

                                {transcript && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        <Button 
                                            onClick={() => setCurrentStep(2)}
                                            className="w-full bg-amber-600 hover:bg-amber-700"
                                        >
                                            Next: Add Photos
                                            <ChevronRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}

                        {/* Photos Step */}
                        {currentStep === 2 && (
                            <motion.div
                                key="photos"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="p-6 space-y-6"
                            >
                                <div>
                                    <Badge className="bg-amber-100 text-amber-700 mb-2">Step 2 of 4</Badge>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                                        Add Supporting Visuals
                                    </h2>
                                    <p className="text-sm text-slate-600">
                                        Upload images from your gallery or take new photos to illustrate 
                                        your chapters and slides.
                                    </p>
                                </div>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    capture="environment"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                <div className="flex flex-col items-center py-8">
                                    <button
                                        onClick={handleTakePhoto}
                                        disabled={isUploading}
                                        className="w-32 h-32 rounded-full flex items-center justify-center transition-all bg-amber-600 hover:bg-amber-700 shadow-lg disabled:opacity-50"
                                    >
                                        {isUploading ? (
                                            <Loader2 className="w-16 h-16 text-white animate-spin" />
                                        ) : (
                                            <Camera className="w-16 h-16 text-white" />
                                        )}
                                    </button>
                                    <p className="mt-4 text-sm text-slate-600 font-medium">
                                        {isUploading ? 'Uploading...' : photos.length > 0 ? `${photos.length} Photos Added` : 'Tap to Capture or Upload'}
                                    </p>
                                    {photos.length > 0 && (
                                        <Button
                                            onClick={handleTakePhoto}
                                            variant="outline"
                                            size="sm"
                                            className="mt-4"
                                            disabled={isUploading}
                                        >
                                            <Upload className="w-4 h-4 mr-2" />
                                            Add More Photos
                                        </Button>
                                    )}
                                </div>

                                {photos.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-3"
                                    >
                                        <Label className="text-sm font-semibold text-slate-700">Selected Photos:</Label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {photos.map((photo) => (
                                                <div key={photo.id} className="bg-slate-100 rounded-lg p-2 border border-slate-200 relative">
                                                    <button
                                                        onClick={() => handleRemovePhoto(photo.id)}
                                                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 z-10"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                    <div className="aspect-video bg-slate-200 rounded flex items-center justify-center mb-2 overflow-hidden">
                                                        <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                                                    </div>
                                                    <p className="text-xs text-slate-600 truncate">{photo.name}</p>
                                                    {photo.location && (
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <MapPin className="w-3 h-3 text-green-600" />
                                                            <span className="text-xs text-green-600">GPS</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <Button 
                                            onClick={() => setCurrentStep(3)}
                                            className="w-full bg-amber-600 hover:bg-amber-700"
                                        >
                                            Next: Pinpoint Locations
                                            <ChevronRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}

                        {/* Locations Step */}
                        {currentStep === 3 && (
                            <motion.div
                                key="locations"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="p-6 space-y-6"
                            >
                                <div>
                                    <Badge className="bg-amber-100 text-amber-700 mb-2">Step 3 of 4</Badge>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                                        Pinpoint Locations
                                    </h2>
                                    <p className="text-sm text-slate-600">
                                        Automatically capture your current GPS location for each story segment.
                                    </p>
                                </div>

                                <div className="flex flex-col items-center py-8">
                                    <button
                                        onClick={handleCaptureLocation}
                                        className="w-32 h-32 rounded-full bg-amber-600 hover:bg-amber-700 flex items-center justify-center transition-all shadow-lg"
                                    >
                                        <MapPinned className="w-16 h-16 text-white" />
                                    </button>
                                    <p className="mt-4 text-sm text-slate-600 font-medium">
                                        Tap to Capture Current Location
                                    </p>
                                </div>

                                {locations.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-3"
                                    >
                                        <Label className="text-sm font-semibold text-slate-700">
                                            Captured Locations ({locations.length}):
                                        </Label>
                                        <div className="space-y-2">
                                            {locations.map((location) => (
                                                <div key={location.id} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                                    <div className="flex items-start gap-2">
                                                        <MapPin className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-slate-800">{location.name}</p>
                                                            <p className="text-xs text-slate-500">{location.coords}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <Button 
                                            onClick={() => setCurrentStep(4)}
                                            className="w-full bg-amber-600 hover:bg-amber-700"
                                        >
                                            Next: Review Draft
                                            <ChevronRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}

                        {/* Review Step */}
                        {currentStep === 4 && (
                            <motion.div
                                key="review"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="p-6 space-y-6"
                            >
                                <div>
                                    <Badge className="bg-green-100 text-green-700 mb-2">Step 4 of 4</Badge>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                                        Review Story Draft
                                    </h2>
                                    <p className="text-sm text-slate-600">
                                        Your mobile story draft is complete. Save it now to refine the details 
                                        on your desktop.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    {/* Outline Summary */}
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <FileText className="w-5 h-5 text-amber-600" />
                                            <h3 className="font-semibold text-slate-800">Narrated Outline</h3>
                                        </div>
                                        <p className="text-xs text-slate-600 line-clamp-3">{transcript}</p>
                                    </div>

                                    {/* Photos Summary */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <ImageIcon className="w-5 h-5 text-blue-600" />
                                            <h3 className="font-semibold text-slate-800">Photos</h3>
                                        </div>
                                        <p className="text-xs text-slate-600">{photos.length} images captured</p>
                                    </div>

                                    {/* Locations Summary */}
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MapPin className="w-5 h-5 text-green-600" />
                                            <h3 className="font-semibold text-slate-800">Locations</h3>
                                        </div>
                                        <p className="text-xs text-slate-600">{locations.length} GPS coordinates captured</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Button 
                                        className="w-full bg-green-600 hover:bg-green-700 h-12"
                                        onClick={handleSaveDraft}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                Saving Draft...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-5 h-5 mr-2" />
                                                Save Draft & Open Editor
                                            </>
                                        )}
                                    </Button>
                                    <Button 
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => {
                                            setCurrentStep(0);
                                            setTranscript('');
                                            setPhotos([]);
                                            setLocations([]);
                                        }}
                                        disabled={isSaving}
                                    >
                                        Start Over
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Progress Indicator */}
                <div className="bg-white border-t border-slate-200 px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                        {steps.map((step, idx) => {
                            const Icon = step.icon;
                            return (
                                <div key={step.id} className="flex flex-col items-center flex-1">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                        currentStep === idx 
                                            ? 'bg-amber-600 text-white' 
                                            : currentStep > idx 
                                                ? 'bg-green-500 text-white' 
                                                : 'bg-slate-200 text-slate-400'
                                    }`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <span className={`text-xs mt-1 ${
                                        currentStep === idx ? 'text-amber-600 font-semibold' : 'text-slate-500'
                                    }`}>
                                        {step.title}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Label({ children, className = '' }) {
    return <label className={`block font-medium ${className}`}>{children}</label>;
}