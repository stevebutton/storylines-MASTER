import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
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

export default function Storyboarder() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [storyTitle, setStoryTitle] = useState('');
    const [coverPhoto, setCoverPhoto] = useState(null);
    const [startingLocation, setStartingLocation] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef(null);

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
                hero_image: coverPhoto?.url || undefined
            };

            const story = await base44.entities.Story.create(storyData);

            if (startingLocation) {
                await base44.entities.Chapter.create({
                    story_id: story.id,
                    order: 0,
                    coordinates: [startingLocation.lat, startingLocation.lng],
                    zoom: 12,
                    map_style: 'light',
                    alignment: 'left'
                });
            }

            setCurrentStep(3);
        } catch (error) {
            console.error('Error creating story:', error);
            alert('Failed to create story. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
            {/* Persistent Header Banner */}
            <header className="bg-amber-600 text-white px-6 py-4 shadow-md sticky top-0 z-50">
                <button 
                    onClick={() => setCurrentStep(0)} 
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                    <Sparkles className="w-6 h-6" />
                    <h1 className="text-2xl font-bold">Storyboarder</h1>
                </button>
            </header>

            {/* Main Content Area */}
            <div className="max-w-2xl mx-auto p-6">
                <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                    <AnimatePresence mode="wait">
                        {/* Home/Welcome Screen */}
                        {currentStep === 0 && (
                            <motion.div
                                key="welcome"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="p-8 space-y-8 text-center"
                            >
                                <div className="py-6">
                                    <h2 className="text-4xl font-bold text-slate-800 mb-6">
                                        Storyboarder
                                    </h2>
                                    <p className="text-lg text-slate-700 leading-relaxed mb-2">
                                        is your companion for
                                    </p>
                                    <p className="text-lg text-slate-700 leading-relaxed">
                                        building stories on location.
                                    </p>
                                </div>

                                <p className="text-slate-600 leading-relaxed max-w-lg mx-auto">
                                    Use intuitive voice, image, and location capture tools to build your story on the go, 
                                    ready for editing in the Storylines desktop editor.
                                </p>

                                <Button 
                                    onClick={() => setCurrentStep(1)}
                                    className="w-full max-w-md mx-auto bg-amber-600 hover:bg-amber-700 h-14 text-lg"
                                >
                                    Start a new story
                                    <ChevronRight className="w-5 h-5 ml-2" />
                                </Button>
                            </motion.div>
                        )}

                        {/* Story Setup Actions Screen */}
                        {currentStep === 1 && (
                            <motion.div
                                key="setup"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="p-6 space-y-6"
                            >
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                                        New Story Details
                                    </h2>
                                    <p className="text-sm text-slate-600">
                                        Provide the essential details for your story.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {/* Story Title Button */}
                                    <Button
                                        onClick={() => setCurrentStep(10)}
                                        variant="outline"
                                        className="w-full h-20 justify-start text-left border-2 hover:border-amber-600 hover:bg-amber-50"
                                    >
                                        <Mic className="w-6 h-6 mr-4 text-amber-600 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="font-semibold text-slate-800 text-base">Story Title</p>
                                            <p className="text-xs text-slate-500 mt-1">Record your story's main title</p>
                                        </div>
                                        {storyTitle && <Check className="w-5 h-5 text-green-600 ml-2 flex-shrink-0" />}
                                    </Button>

                                    {/* Cover Photo Button */}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                    <Button
                                        onClick={handleTakePhoto}
                                        variant="outline"
                                        className="w-full h-20 justify-start text-left border-2 hover:border-amber-600 hover:bg-amber-50"
                                        disabled={isUploading}
                                    >
                                        {isUploading ? (
                                            <Loader2 className="w-6 h-6 mr-4 text-amber-600 flex-shrink-0 animate-spin" />
                                        ) : (
                                            <Camera className="w-6 h-6 mr-4 text-amber-600 flex-shrink-0" />
                                        )}
                                        <div className="flex-1">
                                            <p className="font-semibold text-slate-800 text-base">Take a Cover Photo</p>
                                            <p className="text-xs text-slate-500 mt-1">Optional hero image for your story</p>
                                        </div>
                                        {coverPhoto && <Check className="w-5 h-5 text-green-600 ml-2 flex-shrink-0" />}
                                    </Button>

                                    {/* Capture Location Button */}
                                    <Button
                                        onClick={handleCaptureLocation}
                                        variant="outline"
                                        className="w-full h-20 justify-start text-left border-2 hover:border-amber-600 hover:bg-amber-50"
                                    >
                                        <MapPin className="w-6 h-6 mr-4 text-amber-600 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="font-semibold text-slate-800 text-base">Capture Location</p>
                                            <p className="text-xs text-slate-500 mt-1">Set the story's starting GPS point</p>
                                        </div>
                                        {startingLocation && <Check className="w-5 h-5 text-green-600 ml-2 flex-shrink-0" />}
                                    </Button>

                                    {/* Review Button */}
                                    <Button
                                        onClick={() => setCurrentStep(2)}
                                        className="w-full bg-blue-600 hover:bg-blue-700 h-14 text-base mt-6"
                                    >
                                        Review Story
                                        <ChevronRight className="w-5 h-5 ml-2" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* Story Title Recording Screen */}
                        {currentStep === 10 && (
                            <motion.div
                                key="title-recording"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="p-6 space-y-6"
                            >
                                <div>
                                    <Badge className="bg-amber-100 text-amber-700 mb-2">Story Title</Badge>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                                        Dictate Story Title
                                    </h2>
                                    <p className="text-sm text-slate-600">
                                        Press the microphone to record your story's main title.
                                    </p>
                                </div>

                                <VoiceNarrationRecorder
                                    onTranscriptChange={setStoryTitle}
                                    initialTranscript={storyTitle}
                                />

                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => setCurrentStep(1)}
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-2" />
                                        Back
                                    </Button>
                                    {storyTitle && (
                                        <Button
                                            onClick={() => setCurrentStep(1)}
                                            className="flex-1 bg-amber-600 hover:bg-amber-700"
                                        >
                                            Done
                                            <Check className="w-4 h-4 ml-2" />
                                        </Button>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Review Story Setup Screen */}
                        {currentStep === 2 && (
                            <motion.div
                                key="review-setup"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="p-6 space-y-6"
                            >
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                                        Review Story Setup
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
                                        {coverPhoto ? (
                                            <img 
                                                src={coverPhoto.url} 
                                                alt="Cover" 
                                                className="w-full h-40 object-cover rounded-lg mt-2"
                                            />
                                        ) : (
                                            <p className="text-sm text-slate-600 italic">No cover photo selected.</p>
                                        )}
                                    </div>

                                    {/* Starting Location Review */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MapPin className="w-5 h-5 text-slate-600" />
                                            <h3 className="font-semibold text-slate-800">Starting Location</h3>
                                        </div>
                                        <p className="text-sm text-slate-600">
                                            {startingLocation ? (
                                                startingLocation.coords
                                            ) : (
                                                <span className="italic">No starting location captured.</span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 mt-6">
                                    <Button
                                        onClick={() => setCurrentStep(1)}
                                        variant="outline"
                                        className="flex-1 h-12"
                                    >
                                        <ChevronLeft className="w-5 h-5 mr-2" />
                                        Make Changes
                                    </Button>
                                    <Button
                                        onClick={handleCreateStory}
                                        className="flex-1 bg-green-600 hover:bg-green-700 h-12"
                                        disabled={isSaving}
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                All good? Let's Create a Chapter
                                                <ChevronRight className="w-5 h-5 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* Placeholder for future chapter creation screen */}
                        {currentStep === 3 && (
                            <motion.div
                                key="create-chapter"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="p-6 space-y-6"
                            >
                                <div className="text-center py-12">
                                    <h2 className="text-2xl font-bold text-slate-800 mb-4">
                                        Chapter Creation
                                    </h2>
                                    <p className="text-slate-600">
                                        This screen will be implemented in the next phase.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* Old Narrate Step - Removed */}
                        {currentStep === 999 && (
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
            </div>
        </div>
    );
}

function Label({ children, className = '' }) {
    return <label className={`block font-medium ${className}`}>{children}</label>;
}