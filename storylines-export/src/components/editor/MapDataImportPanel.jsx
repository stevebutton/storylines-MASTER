import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Loader2, MapPin, FileText, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import VoiceSelectionPanel from './VoiceSelectionPanel';
import { toast } from "sonner";

export default function MapDataImportPanel({ isOpen, onClose }) {
    const navigate = useNavigate();
    const [zipFile, setZipFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [step, setStep] = useState('upload'); // upload, processing_zip, voice_selection, generating_descriptions, overview
    const [currentStoryId, setCurrentStoryId] = useState(null);
    const [storyOverview, setStoryOverview] = useState(null);

    const handleFileUpload = (e) => {
        const uploadedFile = e.target.files[0];
        if (uploadedFile && uploadedFile.name.endsWith('.zip')) {
            setZipFile(uploadedFile);
            processZipAndCreateStructure(uploadedFile);
        } else {
            toast.error('Please upload a .zip file containing folders with images.');
        }
    };

    const processZipAndCreateStructure = async (file) => {
        setIsProcessing(true);
        setStep('processing_zip');

        try {
            // Upload zip file
            const { file_url } = await base44.integrations.Core.UploadFile({ file: file });

            // Process zip: extract images, create Story/Chapter/Slide entities, return story_id
            const { data: response } = await base44.functions.invoke('processZipForStory', {
                zip_url: file_url
            });

            setCurrentStoryId(response.story_id);
            setStep('voice_selection');
        } catch (error) {
            console.error('Failed to process zip file:', error);
            toast.error('Failed to process zip file. Please try again.');
            setStep('upload');
            setZipFile(null);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleVoiceContinue = async (config) => {
        setIsProcessing(true);
        setStep('generating_descriptions');

        try {
            const result = await base44.functions.invoke('generateStoryDescriptions', {
                story_id: currentStoryId,
                caption_voice: config.caption_voice,
                custom_caption_voice_description: config.custom_caption_voice_description,
                story_context: config.story_context
            });

            // Handle both wrapped ({ data: ... }) and direct response formats
            const response = result?.data ?? result;
            console.log('[generateStoryDescriptions] response:', JSON.stringify(response));

            if (response?.overview) {
                setStoryOverview(response.overview);
                setStep('overview');
            } else if (response?.error) {
                throw new Error(response.error);
            } else {
                throw new Error(`Unexpected response: ${JSON.stringify(response)}`);
            }
        } catch (error) {
            // Surface the actual server error if available (Axios wraps it in error.response.data)
            const msg = error.response?.data?.error || error.message;
            console.error('Failed to generate descriptions:', msg, error);
            toast.error(`Failed to generate descriptions: ${msg}`, { duration: 8000 });
            setStep('upload');
            setZipFile(null);
            setCurrentStoryId(null);
        } finally {
            setIsProcessing(false);
        }
    };

    const resetPanel = () => {
        setZipFile(null);
        setCurrentStoryId(null);
        setStoryOverview(null);
        setStep('upload');
        setIsProcessing(false);
    };

    const handleClose = () => {
        resetPanel();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-[69]"
                        onClick={handleClose}
                    />
                )}
            </AnimatePresence>

            {/* Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-[60vw] bg-white shadow-2xl z-[80] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-cyan-50">
                            <div className="flex items-center gap-3">
                                <MapPin className="w-8 h-8 text-blue-600" />
                                <div>
                                    <h2 className="text-4xl font-bold text-slate-800">Import from Map Data</h2>
                                    <p className="text-sm text-slate-600 mt-1">Generate narratives from field documentation and geotagged media</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={handleClose}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">

                            {/* Upload Step */}
                            {step === 'upload' && (
                                <div className="space-y-6">
                                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center">
                                        <Upload className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-slate-800 mb-2">
                                            Upload Field Documentation Archive
                                        </h3>
                                        <p className="text-sm text-slate-600 mb-6">
                                            Upload a .zip file containing folders with location-tagged images. Each folder will become a chapter, with images as slides.
                                        </p>
                                        <input
                                            type="file"
                                            accept=".zip"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            id="file-upload"
                                        />
                                        <label htmlFor="file-upload">
                                            <Button className="bg-blue-600 hover:bg-blue-700" asChild>
                                                <span>Choose ZIP File</span>
                                            </Button>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Processing Zip Step */}
                            {step === 'processing_zip' && (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <Loader2 className="w-16 h-16 animate-spin text-blue-600 mb-4" />
                                    <h3 className="text-xl font-semibold text-slate-800 mb-2">
                                        Processing Field Documentation...
                                    </h3>
                                    <p className="text-sm text-slate-600">
                                        Extracting location data, uploading images, and organising into chapters
                                    </p>
                                </div>
                            )}

                            {/* Generating Descriptions Step */}
                            {step === 'generating_descriptions' && (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <Loader2 className="w-16 h-16 animate-spin text-blue-600 mb-4" />
                                    <h3 className="text-xl font-semibold text-slate-800 mb-2">
                                        Generating Story Narratives...
                                    </h3>
                                    <p className="text-sm text-slate-600">
                                        Crafting captions and descriptions using the selected voice
                                    </p>
                                </div>
                            )}

                            {/* Overview Step */}
                            {step === 'overview' && storyOverview && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-6"
                                >
                                    <div className="flex items-center gap-3 mb-6">
                                        <CheckCircle className="w-8 h-8 text-green-600" />
                                        <div>
                                            <h3 className="text-2xl font-bold text-slate-800">
                                                Story Created Successfully
                                            </h3>
                                            <p className="text-sm text-slate-600">
                                                Review your story structure below
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-6 space-y-4">
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div className="bg-white rounded-lg p-4 shadow-sm">
                                                <div className="text-3xl font-bold text-blue-600">{storyOverview.chapter_count}</div>
                                                <div className="text-sm text-slate-600">Chapters</div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 shadow-sm">
                                                <div className="text-3xl font-bold text-cyan-600">{storyOverview.slide_count}</div>
                                                <div className="text-sm text-slate-600">Slides</div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 shadow-sm">
                                                <div className="text-3xl font-bold text-green-600">{storyOverview.slides_with_gps}</div>
                                                <div className="text-sm text-slate-600">With GPS</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 max-h-96 overflow-y-auto">
                                        {storyOverview.chapters.map((chapter, idx) => (
                                            <div key={idx} className="bg-white rounded-lg border border-slate-200 p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                                                        {idx + 1}
                                                    </div>
                                                    <h4 className="font-semibold text-slate-800">{chapter.name}</h4>
                                                    <span className="text-xs text-slate-500 ml-auto">{chapter.slide_count} slides</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <Button
                                            onClick={() => navigate(`${createPageUrl('StoryEditor')}?id=${currentStoryId}`)}
                                            className="bg-blue-600 hover:bg-blue-700"
                                        >
                                            Open in Editor
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Voice Selection Modal — rendered outside the panel so it layers correctly */}
            {step === 'voice_selection' && (
                <VoiceSelectionPanel
                    isOpen={true}
                    onClose={handleClose}
                    onContinue={handleVoiceContinue}
                />
            )}
        </>
    );
}
