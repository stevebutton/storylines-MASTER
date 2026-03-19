import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import JSZip from 'jszip';
import * as exifr from 'exifr';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Loader2, MapPin, CheckCircle, AlertTriangle, Pencil, Check } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import VoiceSelectionPanel from './VoiceSelectionPanel';
import RichTextEditor from './RichTextEditor';
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

    // Editable content (intro + steps)
    const [dbContent, setDbContent] = useState({});   // keyed by topic_id
    const [isEditing, setIsEditing] = useState(false);
    const [drafts, setDrafts] = useState({});          // keyed by topic_id → body string
    const [isSaving, setIsSaving] = useState(false);

    const TOPIC_IDS = ['panel-title', 'panel-title-append', 'intro', 'intro-append', 'steps', 'steps-append'];
    const TITLE_KEYS = ['panel-title', 'panel-title-append'];

    useEffect(() => {
        if (!isOpen) return;
        supabase.from('app_content')
            .select('*')
            .eq('panel_id', 'story-helper')
            .in('topic_id', TOPIC_IDS)
            .then(({ data }) => {
                if (data) {
                    const map = {};
                    data.forEach(r => { map[r.topic_id] = r; });
                    setDbContent(map);
                }
            });
    }, [isOpen]);

    const introKey      = isAppendMode ? 'intro-append'         : 'intro';
    const stepsKey      = isAppendMode ? 'steps-append'         : 'steps';
    const panelTitleKey = isAppendMode ? 'panel-title-append'   : 'panel-title';

    const getBody = (key) => isEditing
        ? (drafts[key] ?? dbContent[key]?.body ?? '')
        : (dbContent[key]?.body ?? '');

    const startEditing = () => {
        const d = {};
        TOPIC_IDS.forEach(k => {
            d[k] = TITLE_KEYS.includes(k)
                ? (dbContent[k]?.title ?? '')
                : (dbContent[k]?.body ?? '');
        });
        setDrafts(d);
        setIsEditing(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        await Promise.all(
            TOPIC_IDS
                .filter(k => dbContent[k])
                .map(k => {
                    const update = TITLE_KEYS.includes(k)
                        ? { title: drafts[k] ?? dbContent[k].title, updated_at: new Date().toISOString() }
                        : { body: drafts[k] ?? dbContent[k].body, updated_at: new Date().toISOString() };
                    return supabase.from('app_content').update(update).eq('id', dbContent[k].id);
                })
        );
        // Refresh
        const { data } = await supabase.from('app_content')
            .select('*').eq('panel_id', 'story-helper').in('topic_id', TOPIC_IDS);
        if (data) {
            const map = {};
            data.forEach(r => { map[r.topic_id] = r; });
            setDbContent(map);
        }
        setIsSaving(false);
        setIsEditing(false);
    };

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

                    // Extract GPS + capture date from the original file before any processing
                    let coordinates = null;
                    let captureDate = null;
                    try {
                        const exif = await exifr.parse(imageFile, ['DateTimeOriginal', 'CreateDate', 'GPSLatitude', 'GPSLongitude', 'GPSLatitudeRef', 'GPSLongitudeRef']);
                        if (exif?.GPSLatitude && exif?.GPSLongitude) {
                            const gps = await exifr.gps(imageFile);
                            if (gps?.latitude && gps?.longitude) {
                                coordinates = [gps.latitude, gps.longitude];
                                slidesWithGps++;
                            }
                        }
                        captureDate = exif?.DateTimeOriginal || exif?.CreateDate || null;
                    } catch (e) {
                        console.warn('[EXIF] Failed to read from', rawName, e);
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

                    // Register in media library (non-fatal)
                    await supabase.from('media').insert({
                        id: generateId(),
                        story_id: storyId,
                        url: image_url,
                        filename: safeName,
                        title: rawName.replace(/\.[^.]+$/, ''),
                        category: 'other',
                        tags: [],
                        type: 'image',
                        file_size: blob.size,
                        created_date: new Date().toISOString(),
                    }).then(({ error }) => {
                        if (error) console.warn('[MediaLibrary] insert failed for', rawName, error);
                    });

                    const slideId = generateId();
                    const { error: slideErr } = await supabase.from('slides').insert({
                        id: slideId,
                        chapter_id: chapterId,
                        order: slideOrder,
                        title: rawName.replace(/\.[^.]+$/, ''),
                        image: image_url,
                        coordinates,
                        ...(captureDate ? {
                            capture_date: captureDate.toISOString(),
                            story_date: captureDate.toISOString().split('T')[0],
                        } : {}),
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

                // Final call: generate chapter names/descriptions + story title/subtitle.
                // Non-critical — a failure here does not abort the overall process.
                await fetch('/.netlify/functions/generate-captions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ story_id: currentStoryId, is_full_run: true, ...config }),
                }).catch(e => console.warn('[metadata] generation failed:', e.message));
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
        onClose();
    };

    return (
        <>
            <AnimatePresence onExitComplete={resetPanel}>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-[69]"
                            onClick={handleClose}
                        />

                        {/* Panel */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ duration: 2, ease: [0.25, 1, 0.5, 1] }}
                            className="fixed right-0 top-0 h-full w-[60vw] bg-white shadow-2xl z-[80] flex flex-col"
                        >
                        {/* Header */}
                        <div className="bg-white border-b shadow-sm">
                            <div className="px-4 py-3">
                                <div className="flex items-center gap-4 mb-4">
                                    <button
                                        onClick={handleClose}
                                        className="p-2 text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0"
                                    >
                                        <X className="w-8 h-8" />
                                    </button>
                                    <Link to={createPageUrl('HomePageView')}>
                                        <img
                                            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/91ab42d74_logoadjustedpng.png"
                                            alt="Storylines"
                                            width="250"
                                            height="100"
                                            className="hover:opacity-80 transition-opacity cursor-pointer"
                                        />
                                    </Link>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={drafts[panelTitleKey] ?? dbContent[panelTitleKey]?.title ?? 'Story Helper'}
                                            onChange={e => setDrafts(d => ({ ...d, [panelTitleKey]: e.target.value }))}
                                            className="text-[42px] font-bold text-slate-900 flex-1 leading-tight bg-transparent border-b-2 border-amber-400 focus:outline-none"
                                        />
                                    ) : (
                                        <h1 className="text-[42px] font-bold text-slate-900 flex-1 leading-tight">
                                            {dbContent[panelTitleKey]?.title || 'Story Helper'}
                                        </h1>
                                    )}
                                    {!isEditing ? (
                                        <button
                                            onClick={startEditing}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium transition-colors flex-shrink-0"
                                        >
                                            <Pencil className="w-4 h-4" /> Edit
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                disabled={isSaving}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                                            >
                                                <Check className="w-4 h-4" /> {isSaving ? 'Saving…' : 'Save'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto py-6 pl-[100px] pr-[50px]">

                            {/* Upload Step */}
                            {step === 'upload' && (
                                <div className="space-y-6">

                                    {/* Intro */}
                                    <div className="bg-blue-50 rounded-lg px-6 py-5">
                                        {isEditing ? (
                                            <RichTextEditor
                                                content={getBody(introKey)}
                                                onChange={body => setDrafts(d => ({ ...d, [introKey]: body }))}
                                                placeholder="Describe how Story Helper works…"
                                            />
                                        ) : (
                                            <div
                                                className="prose prose-sm prose-slate max-w-none text-slate-700"
                                                dangerouslySetInnerHTML={{ __html: getBody(introKey) }}
                                            />
                                        )}
                                    </div>

                                    {/* Steps */}
                                    <div>
                                        {isEditing ? (
                                            <RichTextEditor
                                                content={getBody(stepsKey)}
                                                onChange={body => setDrafts(d => ({ ...d, [stepsKey]: body }))}
                                                placeholder="Add numbered steps…"
                                            />
                                        ) : (
                                            <div
                                                className="prose prose-sm prose-slate max-w-none"
                                                dangerouslySetInnerHTML={{ __html: getBody(stepsKey) }}
                                            />
                                        )}
                                    </div>

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
                    </>
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
