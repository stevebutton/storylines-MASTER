import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Loader2, MapPin, Image, FileText, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function MapDataImportPanel({ isOpen, onClose }) {
    const navigate = useNavigate();
    const [files, setFiles] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [step, setStep] = useState('upload'); // upload, processing, preview, creating
    const [extractedData, setExtractedData] = useState(null);
    const [storyTitle, setStoryTitle] = useState('');

    const handleFileUpload = (e) => {
        const uploadedFiles = Array.from(e.target.files);
        setFiles(uploadedFiles);
    };

    const processFiles = async () => {
        if (files.length === 0) return;

        setIsProcessing(true);
        setStep('processing');

        try {
            // Upload files
            const fileUrls = [];
            for (const file of files) {
                const { file_url } = await base44.integrations.Core.UploadFile({ file });
                fileUrls.push(file_url);
            }

            // Extract EXIF coordinates from images
            const { data: exifData } = await base44.functions.invoke('extractExifCoordinates', {
                file_urls: fileUrls
            });

            // Build coordinate context for LLM
            const coordinateContext = exifData.results
                .map((result, idx) => {
                    if (result.has_gps_data) {
                        return `Image ${idx + 1} (${result.image_url}): GPS coordinates [${result.coordinates[0]}, ${result.coordinates[1]}] (latitude, longitude in decimal degrees)`;
                    }
                    return `Image ${idx + 1} (${result.image_url}): No GPS data available`;
                })
                .join('\n');

            // Extract location data using LLM with vision
            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `You are analyzing geotagged field documentation images to create a geographic narrative.

EXTRACTED GPS COORDINATES (Decimal Degrees):
${coordinateContext}

For each image provided:
1. Use the EXACT GPS coordinates listed above (already in decimal degree format: [latitude, longitude]).
2. Identify the location name based on the coordinates and image content.
3. Create a descriptive chapter title and detailed narrative description.
4. Include the exact image_url that corresponds to this chapter.

If an image has no GPS data, analyze the image to identify the location visually and provide estimated coordinates.

Create a structured story outline with:
- Overall story title (maximum 34 characters) and subtitle
- One chapter per image
- Each chapter must include: image_url, title, location name, description, and coordinates in [latitude, longitude] decimal degree format

Return the structured JSON as specified.`,
                file_urls: fileUrls,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        subtitle: { type: "string" },
                        chapters: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    title: { type: "string" },
                                    location: { type: "string" },
                                    description: { type: "string" },
                                    coordinates: {
                                        type: "array",
                                        items: { type: "number" }
                                    },
                                    image_url: { type: "string" }
                                }
                            }
                        }
                    }
                }
            });

            setExtractedData(response);
            setStoryTitle(response.title);
            setStep('preview');
        } catch (error) {
            console.error('Failed to process files:', error);
            alert('Failed to process files. Please try again.');
            setStep('upload');
        } finally {
            setIsProcessing(false);
        }
    };

    const createStory = async () => {
        setIsProcessing(true);
        setStep('creating');

        try {
            // Truncate title if exceeds limit
            let finalTitle = storyTitle || extractedData.title;
            if (finalTitle.length > 34) {
                finalTitle = finalTitle.substring(0, 34);
            }

            // Create story
            const newStory = await base44.entities.Story.create({
                title: finalTitle,
                subtitle: extractedData.subtitle,
                category: 'travel',
                is_published: false
            });

            // Create chapters and slides
            for (let i = 0; i < extractedData.chapters.length; i++) {
                const chapterData = extractedData.chapters[i];
                const newChapter = await base44.entities.Chapter.create({
                    story_id: newStory.id,
                    order: i,
                    alignment: 'left'
                });

                await base44.entities.Slide.create({
                    chapter_id: newChapter.id,
                    order: 0,
                    title: chapterData.title,
                    description: chapterData.description,
                    location: chapterData.location,
                    image: chapterData.image_url,
                    coordinates: chapterData.coordinates,
                    zoom: 12
                });
            }

            setTimeout(() => {
                navigate(`${createPageUrl('StoryEditor')}?id=${newStory.id}`);
            }, 1000);
        } catch (error) {
            console.error('Failed to create story:', error);
            setIsProcessing(false);
        }
    };

    const resetPanel = () => {
        setFiles([]);
        setExtractedData(null);
        setStoryTitle('');
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
                                            Upload Field Documentation
                                        </h3>
                                        <p className="text-sm text-slate-600 mb-6">
                                            We'll analyze location-tagged images and help structure them into a cohesive geographic narrative. Upload photos containing location metadata or recognizable landmarks.
                                        </p>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            id="file-upload"
                                        />
                                        <label htmlFor="file-upload">
                                            <Button className="bg-blue-600 hover:bg-blue-700" asChild>
                                                <span>Choose Files</span>
                                            </Button>
                                        </label>
                                    </div>

                                    {files.length > 0 && (
                                        <div>
                                            <h3 className="font-semibold text-slate-800 mb-3">
                                                Selected Files ({files.length})
                                            </h3>
                                            <div className="grid grid-cols-3 gap-4">
                                                {files.map((file, idx) => (
                                                    <div key={idx} className="border rounded-lg overflow-hidden">
                                                        <div className="aspect-video bg-slate-100 flex items-center justify-center">
                                                            <Image className="w-8 h-8 text-slate-400" />
                                                        </div>
                                                        <div className="p-2">
                                                            <p className="text-xs text-slate-600 truncate">{file.name}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <Button 
                                                onClick={processFiles}
                                                className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
                                            >
                                                Process Files & Extract Locations
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Processing Step */}
                            {step === 'processing' && (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <Loader2 className="w-16 h-16 animate-spin text-blue-600 mb-4" />
                                    <h3 className="text-xl font-semibold text-slate-800 mb-2">
                                        Processing Field Documentation...
                                    </h3>
                                    <p className="text-sm text-slate-600">
                                        We're extracting location data and organizing content into chapters
                                    </p>
                                </div>
                            )}

                            {/* Preview Step */}
                            {step === 'preview' && extractedData && (
                                <div className="space-y-6">
                                    <div>
                                        <Label>Story Title</Label>
                                        <Input
                                            value={storyTitle}
                                            onChange={(e) => setStoryTitle(e.target.value)}
                                            className="mt-2"
                                        />
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
                                                            <MapPin className="w-6 h-6 text-blue-600" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="font-semibold text-slate-800 mb-1">
                                                                Chapter {idx + 1}: {chapter.title}
                                                            </h4>
                                                            <p className="text-sm text-slate-600 mb-2">
                                                                {chapter.location}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {chapter.description}
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
                                            onClick={createStory}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                                        >
                                            Create Story
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Creating Step */}
                            {step === 'creating' && (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
                                    <h3 className="text-xl font-semibold text-slate-800 mb-2">
                                        Building Your Narrative...
                                    </h3>
                                    <p className="text-sm text-slate-600">
                                        We're organizing chapters and integrating your documentation
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}