import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Loader2, MapPin, Image, FileText, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import VoiceSelectionPanel from './VoiceSelectionPanel';

export default function MapDataImportPanel({ isOpen, onClose }) {
    const navigate = useNavigate();
    const [zipFile, setZipFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [step, setStep] = useState('upload'); // upload, uploading, preview, voice, generating, complete
    const [extractedData, setExtractedData] = useState(null);
    const [storyId, setStoryId] = useState(null);
    const [voiceConfig, setVoiceConfig] = useState(null);

    const handleFileUpload = (e) => {
        const uploadedFile = e.target.files[0];
        if (uploadedFile && uploadedFile.name.endsWith('.zip')) {
            setZipFile(uploadedFile);
        } else {
            alert('Please upload a .zip file containing folders with images');
        }
    };

    const handleUploadZip = async () => {
        if (!zipFile) return;

        setIsProcessing(true);
        setStep('uploading');

        try {
            // Upload zip file
            const { file_url } = await base44.integrations.Core.UploadFile({ file: zipFile });

            // Process zip file to extract images and structure
            const { data: response } = await base44.functions.invoke('processZipForStory', {
                zip_url: file_url
            });

            setExtractedData(response);
            setStep('preview');
        } catch (error) {
            console.error('Failed to upload zip file:', error);
            alert('Failed to upload zip file. Please try again.');
            setStep('upload');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleVoiceContinue = async (config) => {
        setVoiceConfig(config);
        setIsProcessing(true);
        setStep('generating');

        try {
            // Generate descriptions using the separate function
            const { data: response } = await base44.functions.invoke('generateStoryDescriptions', {
                story_id: storyId,
                caption_voice: config.caption_voice,
                custom_caption_voice_description: config.custom_caption_voice_description,
                story_context: config.story_context
            });

            setStep('complete');
            
            setTimeout(() => {
                navigate(`${createPageUrl('StoryEditor')}?id=${storyId}`);
            }, 1500);
        } catch (error) {
            console.error('Failed to generate descriptions:', error);
            alert('Failed to generate descriptions. Please try again.');
            setStep('preview');
        } finally {
            setIsProcessing(false);
        }
    };

    const createStoryStructure = async () => {
        setIsProcessing(true);

        try {
            // Create story with placeholder title
            const newStory = await base44.entities.Story.create({
                title: 'Untitled Story',
                subtitle: '',
                category: 'travel',
                is_published: false
            });

            // Create chapters and slides
            for (let i = 0; i < extractedData.chapters.length; i++) {
                const chapterData = extractedData.chapters[i];
                const newChapter = await base44.entities.Chapter.create({
                    story_id: newStory.id,
                    name: chapterData.folder_name,
                    order: i,
                    alignment: 'left'
                });

                // Create slides for this chapter (without descriptions yet)
                for (let j = 0; j < chapterData.slides.length; j++) {
                    const slideData = chapterData.slides[j];
                    await base44.entities.Slide.create({
                        chapter_id: newChapter.id,
                        order: j,
                        title: 'Slide ' + (j + 1),
                        image: slideData.image_url,
                        coordinates: slideData.coordinates,
                        zoom: 12
                    });
                }
            }

            setStoryId(newStory.id);
            setStep('voice');
        } catch (error) {
            console.error('Failed to create story structure:', error);
            alert('Failed to create story structure. Please try again.');
            setStep('preview');
        } finally {
            setIsProcessing(false);
        }
    };

    const resetPanel = () => {
        setZipFile(null);
        setExtractedData(null);
        setStoryId(null);
        setVoiceConfig(null);
        setStep('upload');
        setIsProcessing(false);
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
                        onClick={onClose}
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
                            <Button variant="ghost" size="icon" onClick={onClose}>
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

                                    {zipFile && (
                                        <div>
                                            <h3 className="font-semibold text-slate-800 mb-3">
                                                Selected File
                                            </h3>
                                            <div className="border rounded-lg p-4 flex items-center gap-3">
                                                <FileText className="w-8 h-8 text-blue-600" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-slate-800">{zipFile.name}</p>
                                                    <p className="text-xs text-slate-500">{(zipFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                                </div>
                                            </div>
                                            <Button 
                                                onClick={handleUploadZip}
                                                className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
                                                disabled={isProcessing}
                                            >
                                                Upload and Extract Images
                                            </Button>
                                        </div>
                                    )}
                                    </div>
                                    )}

                            {/* Uploading Step */}
                            {step === 'uploading' && (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <Loader2 className="w-16 h-16 animate-spin text-blue-600 mb-4" />
                                    <h3 className="text-xl font-semibold text-slate-800 mb-2">
                                        Uploading and Extracting Images...
                                    </h3>
                                    <p className="text-sm text-slate-600">
                                        We're extracting location data and organizing images into chapters
                                    </p>
                                </div>
                            )}

                            {/* Preview Step */}
                            {step === 'preview' && extractedData && (
                                <div className="space-y-6">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                            <h3 className="font-semibold text-green-800">Upload Complete</h3>
                                        </div>
                                        <p className="text-sm text-green-700">
                                            All images have been successfully uploaded and organized.
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="font-semibold text-slate-800 mb-3">
                                            Chapters ({extractedData.chapters.length})
                                        </h3>
                                        <div className="space-y-3">
                                            {extractedData.chapters.map((chapter, idx) => (
                                                <div key={idx} className="border rounded-lg p-4">
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-20 h-20 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                            <Image className="w-6 h-6 text-blue-600" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="font-semibold text-slate-800 mb-1">
                                                                Chapter {idx + 1}: {chapter.folder_name}
                                                            </h4>
                                                            <p className="text-sm text-slate-600 mb-2">
                                                                {chapter.slides.length} image{chapter.slides.length !== 1 ? 's' : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={resetPanel}
                                            className="flex-1"
                                        >
                                            Start Over
                                        </Button>
                                        <Button
                                            onClick={createStoryStructure}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                                            disabled={isProcessing}
                                        >
                                            Continue to Voice Selection
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Generating Step */}
                            {step === 'generating' && (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <Loader2 className="w-16 h-16 animate-spin text-blue-600 mb-4" />
                                    <h3 className="text-xl font-semibold text-slate-800 mb-2">
                                        Generating Captions and Descriptions...
                                    </h3>
                                    <p className="text-sm text-slate-600">
                                        AI is analyzing your images and creating contextual narratives
                                    </p>
                                </div>
                            )}

                            {/* Complete Step */}
                            {step === 'complete' && (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
                                    <h3 className="text-xl font-semibold text-slate-800 mb-2">
                                        Story Created Successfully!
                                    </h3>
                                    <p className="text-sm text-slate-600">
                                        Redirecting to the story editor...
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Separate Voice Selection Modal */}
            {step === 'voice' && (
                <VoiceSelectionPanel
                    isOpen={step === 'voice'}
                    onClose={() => {
                        setStep('upload');
                        setZipFile(null);
                    }}
                    onContinue={handleVoiceContinue}
                />
            )}
        </>
    );
}