import React, { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import JSZip from 'jszip';
import * as exifr from 'exifr';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Loader2, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import VoiceSelectionPanel from './VoiceSelectionPanel';
import { toast } from "sonner";

const generateId = () => crypto.randomUUID().replace(/-/g, '').substring(0, 24);

// appendToStoryId — when provided, skips story creation and appends chapters to existing story
export default function MapDataImportPanel({ isOpen, onClose, appendToStoryId = null }) {
    const navigate = useNavigate();
    const isAppendMode = !!appendToStoryId;

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
            const zip = await JSZip.loadAsync(file);

            // Group image files by their immediate parent folder → chapters
            const folderMap = {};
            zip.forEach((relativePath, entry) => {
                if (entry.dir) return;
                if (!/\.(jpe?g|heic|png|webp)$/i.test(relativePath)) return;
                // Skip macOS resource fork / metadata files (._filename)
                const basename = relativePath.split('/').pop();
                if (basename.startsWith('._')) return;
                const parts = relativePath.split('/');
                if (parts.length < 2) return;
                const folder = parts[parts.length - 2];
                if (!folderMap[folder]) folderMap[folder] = [];
                folderMap[folder].push({ relativePath, entry });
            });

            const sortedFolders = Object.keys(folderMap).sort();

            let storyId;
            let orderOffset = 0;

            if (isAppendMode) {
                // Use existing story, get current chapter count for order offset
                storyId = appendToStoryId;
                const { count } = await supabase
                    .from('chapters')
                    .select('*', { count: 'exact', head: true })
                    .eq('story_id', storyId);
                orderOffset = count || 0;
            } else {
                // Create new story
                storyId = generateId();
                const { error: storyErr } = await supabase.from('stories').insert({
                    id: storyId,
                    title: file.name.replace(/\.zip$/i, ''),
                    subtitle: '',
                    created_date: new Date().toISOString(),
                });
                if (storyErr) throw storyErr;
            }

            let totalSlides = 0;
            let slidesWithGps = 0;
            let heicCount = 0;
            let failedUploads = 0;
            const chaptersOverview = [];
            const allSlideIds = [];

            for (let ci = 0; ci < sortedFolders.length; ci++) {
                const folderName = sortedFolders[ci];
                const images = folderMap[folderName];
                if (images.length === 0) continue;

                const chapterId = generateId();
                const { error: chapterErr } = await supabase.from('chapters').insert({
                    id: chapterId,
                    story_id: storyId,
                    name: folderName,
                    order: orderOffset + ci,
                });
                if (chapterErr) throw chapterErr;

                const sortedImages = images.sort((a, b) =>
                    a.relativePath.localeCompare(b.relativePath)
                );

                let slideOrder = 0;
                for (let si = 0; si < sortedImages.length; si++) {
                    const img = sortedImages[si];

                    // Use only the base filename, never the full folder path
                    const rawName = img.relativePath.split('/').pop();
                    const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');
                    const ext = safeName.split('.').pop().toLowerCase();
                    const isHeic = ext === 'heic' || ext === 'heif';
                    const contentType = ext === 'png' ? 'image/png'
                        : ext === 'webp' ? 'image/webp'
                        : isHeic ? 'image/heic'
                        : 'image/jpeg';

                    if (isHeic) heicCount++;

                    const blob = await img.entry.async('blob');
                    const imageFile = new File([blob], safeName, { type: contentType });

                    // Extract GPS from the original file before any processing
                    let coordinates = null;
                    try {
                        const gps = await exifr.gps(imageFile);
                        if (gps?.latitude && gps?.longitude) {
                            coordinates = [gps.latitude, gps.longitude];
                            slidesWithGps++;
                        } else {
                            console.warn('[EXIF] No GPS in', rawName, gps);
                        }
                    } catch (e) {
                        console.warn('[EXIF] Failed to read GPS from', rawName, e);
                    }

                    // Upload — non-fatal: if this image fails, skip it and continue
                    const filePath = `${generateId()}-${safeName}`;
                    const { error: upErr } = await supabase.storage
                        .from('media').upload(filePath, imageFile, { contentType, upsert: false });
                    if (upErr) {
                        console.error('[Upload] Failed for', rawName, upErr);
                        failedUploads++;
                        continue; // skip slide insert, move on to next image
                    }
                    const { data: { publicUrl: image_url } } = supabase.storage
                        .from('media').getPublicUrl(filePath);

                    const slideId = generateId();
                    const { error: slideErr } = await supabase.from('slides').insert({
                        id: slideId,
                        chapter_id: chapterId,
                        order: slideOrder,
                        title: rawName.replace(/\.[^.]+$/, ''),
                        image: image_url,
                        coordinates,
                    });
                    if (slideErr) throw slideErr;
                    allSlideIds.push(slideId);
                    totalSlides++;
                    slideOrder++;
                }
                chaptersOverview.push({ name: folderName, slide_count: slideOrder });
            }

            setCurrentStoryId(storyId);
            setStoryOverview({
                chapter_count: chaptersOverview.length,
                slide_count: totalSlides,
                slides_with_gps: slidesWithGps,
                heic_count: heicCount,
                failed_uploads: failedUploads,
                chapters: chaptersOverview,
                slide_ids: allSlideIds,
            });
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
            const slideIds = storyOverview?.slide_ids || [];
            const BATCH = 4; // 4 slides × ~1.5s per Haiku call ≈ 6s — within Netlify's 10s limit
            let totalUpdated = 0;

            if (slideIds.length === 0) {
                // Fallback: let the function fetch slides itself (legacy path)
                const resp = await fetch('/.netlify/functions/generate-captions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ story_id: currentStoryId, ...config }),
                });
                if (!resp.ok) throw new Error((await resp.json()).error || 'Caption generation failed');
                totalUpdated = (await resp.json()).updated_count;
            } else {
                for (let i = 0; i < slideIds.length; i += BATCH) {
                    const batch = slideIds.slice(i, i + BATCH);
                    const resp = await fetch('/.netlify/functions/generate-captions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ story_id: currentStoryId, slide_ids: batch, ...config }),
                    });
                    if (!resp.ok) {
                        const err = await resp.json().catch(() => ({}));
                        throw new Error(err.error || 'Caption generation failed');
                    }
                    totalUpdated += (await resp.json()).updated_count;
                }
            }

            setStoryOverview(prev => ({ ...prev, captions_generated: totalUpdated }));
            setStep('overview');
        } catch (error) {
            console.error('Failed to generate descriptions:', error.message);
            toast.error(`Caption generation failed: ${error.message}`, { duration: 8000 });
            setStep('overview');
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
                                    <h2 className="text-4xl font-bold text-slate-800">
                                        {isAppendMode ? 'Add Chapters to Story' : 'Import from Map Data'}
                                    </h2>
                                    <p className="text-sm text-slate-600 mt-1">
                                        {isAppendMode
                                            ? 'Upload a ZIP to append new chapters to this story'
                                            : 'Generate narratives from field documentation and geotagged media'}
                                    </p>
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
                                                {isAppendMode ? 'Chapters Added Successfully' : 'Story Created Successfully'}
                                            </h3>
                                            <p className="text-sm text-slate-600">
                                                Review your {isAppendMode ? 'new chapters' : 'story structure'} below
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

                                    {/* HEIC warning */}
                                    {storyOverview.heic_count > 0 && (
                                        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-amber-800">
                                                    {storyOverview.heic_count} HEIC image{storyOverview.heic_count !== 1 ? 's' : ''} detected
                                                </p>
                                                <p className="text-xs text-amber-700 mt-1">
                                                    Chrome cannot display HEIC files. On your iPhone, go to Settings → Camera → Formats and select <strong>Most Compatible</strong> to shoot in JPEG, then re-export and re-import your ZIP.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Failed uploads warning */}
                                    {storyOverview.failed_uploads > 0 && (
                                        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
                                            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                            <p className="text-sm text-red-800">
                                                {storyOverview.failed_uploads} image{storyOverview.failed_uploads !== 1 ? 's' : ''} failed to upload and were skipped. Check the browser console for details.
                                            </p>
                                        </div>
                                    )}

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
                                        {isAppendMode ? (
                                            <Button onClick={handleClose} className="bg-blue-600 hover:bg-blue-700">
                                                Done
                                            </Button>
                                        ) : (
                                            <Button
                                                onClick={() => navigate(`${createPageUrl('StoryEditor')}?id=${currentStoryId}`)}
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                Open in Editor
                                            </Button>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Voice Selection Modal */}
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
