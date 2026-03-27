import React, { useState, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
    Camera, ChevronRight, Loader2, Check, Plus, Sparkles, BookOpen, RotateCcw, Mic,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import VoiceNarrationRecorder from '@/components/mobile/VoiceNarrationRecorder';
import { resizeImage } from '@/components/mobile/ImageResizer';
import * as exifr from 'exifr';

const generateId = () => crypto.randomUUID().replace(/-/g, '').substring(0, 24);

const captureGPS = () =>
    new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 8000 }
        );
    });

// ── Voice title step — shared by story name + chapter name ────────────────────
function VoiceTitleStep({ eyebrow, label, placeholder, onConfirm, saving }) {
    const [title, setTitle] = useState('');

    return (
        <motion.div
            key={eyebrow}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex flex-col"
            style={{ height: 'calc(100vh - 60px)' }}
        >
            {/* Heading */}
            <div className="flex-shrink-0 px-6 pt-6 pb-4 text-center">
                <p className="text-zinc-400 text-xl font-medium uppercase tracking-widest mb-2">{eyebrow}</p>
                <h2 className="text-5xl font-bold text-white leading-none">{label}</h2>
            </div>

            {/* Recorder + input + confirm — centred in remaining space */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 overflow-y-auto">
                <VoiceNarrationRecorder
                    onTranscriptChange={(t) => setTitle(t.trim())}
                    initialTranscript={title}
                />
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={placeholder}
                    autoCapitalize="words"
                    autoCorrect="off"
                    className="w-full bg-zinc-800 border-2 border-zinc-700 rounded-2xl px-5 py-6 text-white text-2xl font-semibold placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors text-center"
                />
                <div className="flex flex-col items-center gap-6">
                    <button
                        onClick={() => onConfirm(title)}
                        disabled={!title.trim() || saving}
                        className="w-40 h-40 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-90 disabled:opacity-40 flex items-center justify-center shadow-2xl shadow-amber-900/50 transition-all"
                    >
                        {saving
                            ? <Loader2 className="w-14 h-14 animate-spin" />
                            : <Check className="w-14 h-14" />
                        }
                    </button>
                    <span className="bg-white text-black font-semibold text-lg px-4 py-2 rounded-2xl shadow-md leading-none">
                        confirm
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Storyboarder() {
    // 0 = welcome  1 = story name  2 = chapter name  3 = capture loop  4 = finish
    const [step, setStep] = useState(0);

    const [storyTitle, setStoryTitle] = useState('');
    const [storyId, setStoryId]       = useState(null);
    const [chapterId, setChapterId]   = useState(null);
    const chapterCountRef             = useRef(0);

    const [slides, setSlides]                     = useState([]);
    const [lastSavedSlideId, setLastSavedSlideId] = useState(null);
    const [pendingDescription, setPendingDescription] = useState('');
    const [descSaved, setDescSaved]               = useState(false);
    const totalPhotosRef                          = useRef(0);

    const [saving, setSaving]       = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);

    const cameraRef = useRef(null);

    // ── Story creation ────────────────────────────────────────────────────────
    const createStory = async (title) => {
        if (!title.trim()) return;
        setSaving(true);
        try {
            const id = generateId();
            const { data, error } = await supabase
                .from('stories')
                .insert({ id, title: title.trim(), subtitle: 'Draft from mobile capture', is_published: false })
                .select().single();
            if (error) throw error;
            setStoryTitle(data.title);
            setStoryId(data.id);
            setStep(2);
        } catch (e) {
            console.error(e);
            alert('Could not create story. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // ── Chapter creation ──────────────────────────────────────────────────────
    const createChapter = async (name) => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            const id = generateId();
            const { data, error } = await supabase
                .from('chapters')
                .insert({ id, story_id: storyId, name: name.trim(), order: chapterCountRef.current, alignment: 'left' })
                .select().single();
            if (error) throw error;
            chapterCountRef.current += 1;
            setChapterId(data.id);
            setSlides([]);
            setLastSavedSlideId(null);
            setPendingDescription('');
            setStep(3);
        } catch (e) {
            console.error(e);
            alert('Could not create chapter. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // ── Save description ──────────────────────────────────────────────────────
    const saveDescription = async () => {
        if (!pendingDescription.trim() || !lastSavedSlideId) return;
        await supabase.from('slides')
            .update({ description: pendingDescription.trim() })
            .eq('id', lastSavedSlideId);
        setPendingDescription('');
        setDescSaved(true);
        setTimeout(() => setDescSaved(false), 1500);
    };

    // ── Auto-save slide on photo capture ──────────────────────────────────────
    const handlePhotoCapture = async (file) => {
        if (!file || saving) return;

        // Offer save-to-Photos via share sheet — fire and forget so upload continues in parallel.
        // The onChange event (triggered by iOS "Use Photo" tap) counts as a user gesture,
        // so the share API is allowed here. User can tap "Save Image" or dismiss.
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
            navigator.share({ files: [file] }).catch(() => {});
        }

        // Auto-save any pending description before moving to next photo
        if (pendingDescription.trim() && lastSavedSlideId) {
            await supabase.from('slides')
                .update({ description: pendingDescription.trim() })
                .eq('id', lastSavedSlideId);
        }
        setPendingDescription('');
        setSaving(true);
        setSavedFlash(false);
        try {
            // Extract EXIF date from original file before resize strips it
            let captureDate = null;
            try {
                const exif = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate']);
                captureDate = exif?.DateTimeOriginal || exif?.CreateDate || null;
            } catch (_) {}

            const [resized, gps] = await Promise.all([resizeImage(file, 800), captureGPS()]);

            const filePath = `${generateId()}-${file.name}`;
            const { error: upErr } = await supabase.storage
                .from('media').upload(filePath, resized, { contentType: resized.type });
            if (upErr) throw upErr;

            const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);

            const slideId = generateId();
            const title   = `Photo ${totalPhotosRef.current + 1}`;
            const { error: slideErr } = await supabase.from('slides').insert({
                id: slideId,
                chapter_id: chapterId,
                title,
                image: publicUrl,
                order: slides.length,
                ...(gps ? { coordinates: [gps.lat, gps.lng], zoom: 15 } : {}),
                ...(captureDate ? {
                    capture_date: captureDate.toISOString(),
                    story_date: captureDate.toISOString().split('T')[0],
                } : {}),
            });
            if (slideErr) throw slideErr;

            totalPhotosRef.current += 1;
            setSlides((prev) => [...prev, { id: slideId, title, image: publicUrl }]);
            setLastSavedSlideId(slideId);
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 2000);
        } catch (e) {
            console.error(e);
            alert('Could not save photo. Please try again.');
        } finally {
            setSaving(false);
            if (cameraRef.current) cameraRef.current.value = '';
        }
    };

    const startNewChapter = () => {
        setPendingDescription('');
        setStep(2);
    };

    const finishStory = () => setStep(4);

    const startOver = () => {
        setStep(0);
        setStoryTitle('');
        setStoryId(null);
        setChapterId(null);
        chapterCountRef.current = 0;
        setSlides([]);
        setLastSavedSlideId(null);
        setPendingDescription('');
        totalPhotosRef.current = 0;
    };

    return (
        <div className="min-h-screen bg-zinc-900 text-white flex flex-col">

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <header className="bg-zinc-800 border-b border-zinc-700 px-5 py-4 flex items-center gap-3 sticky top-0 z-50 flex-shrink-0"
                    style={{ height: 60 }}>
                <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <span className="text-lg font-semibold tracking-wide">Storyboarder</span>
                {storyTitle && step < 4 && (
                    <span className="ml-auto text-base font-semibold text-white truncate max-w-[200px]">{storyTitle}</span>
                )}
            </header>

            <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">

                    {/* ── 0: Welcome ─────────────────────────────────────────── */}
                    {step === 0 && (
                        <motion.div key="welcome"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center gap-10 text-center px-8"
                            style={{ height: 'calc(100vh - 60px)' }}
                        >
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-32 h-32 rounded-full bg-amber-500/20 flex items-center justify-center">
                                    <BookOpen className="w-16 h-16 text-amber-400" />
                                </div>
                                <h2 className="text-5xl font-bold text-white">storyboarder</h2>
                                <p className="text-zinc-300 text-2xl font-medium leading-snug max-w-xs">
                                    capture your story on location
                                </p>
                            </div>

                            <div className="flex flex-col items-center gap-6">
                                <button
                                    onClick={() => setStep(1)}
                                    className="w-40 h-40 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-90 flex items-center justify-center shadow-2xl shadow-amber-900/50 transition-all"
                                >
                                    <ChevronRight className="w-16 h-16" />
                                </button>
                                <span className="bg-white text-black font-semibold text-lg px-4 py-2 rounded-2xl shadow-md leading-none">
                                    start a new story
                                </span>
                            </div>
                        </motion.div>
                    )}

                    {/* ── 1: Story name ──────────────────────────────────────── */}
                    {step === 1 && (
                        <VoiceTitleStep key="story"
                            eyebrow="Step 1 of 2" label="Say your story title"
                            placeholder="Speak into the mic to set your story title"
                            onConfirm={createStory} saving={saving}
                        />
                    )}

                    {/* ── 2: Chapter name ────────────────────────────────────── */}
                    {step === 2 && (
                        <VoiceTitleStep key={`chapter-${chapterCountRef.current}`}
                            eyebrow={chapterCountRef.current === 0 ? 'Step 2 of 2' : 'New chapter'}
                            label="Say the chapter name"
                            placeholder="Speak into the mic to name this chapter"
                            onConfirm={createChapter} saving={saving}
                        />
                    )}

                    {/* ── 3: Capture loop ────────────────────────────────── */}
                    {step === 3 && (
                        <motion.div key={`capture-${chapterId}`}
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -40 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="flex flex-col"
                            style={{ height: 'calc(100vh - 60px)' }}
                        >
                            {/* Chapter label + thumbnail strip */}
                            <div className="px-5 pt-3 pb-2 flex-shrink-0 text-center">
                                <div className="text-white font-bold text-4xl tracking-tight mb-1">
                                    {storyTitle}
                                </div>
                                <div className="flex items-center justify-center gap-3">
                                    <span className="text-amber-400 font-bold text-3xl tracking-tight">
                                        Chapter {String(chapterCountRef.current).padStart(2, '0')}
                                    </span>
                                    {slides.length > 0 && (
                                        <span className="text-zinc-300 text-lg font-medium">
                                            {slides.length} photo{slides.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                                {slides.length > 0 && (
                                    <div className="flex gap-1.5 mt-2 overflow-x-auto">
                                        {slides.map((slide) => (
                                            <div key={slide.id} className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 ring-1 ring-zinc-700">
                                                <img src={slide.image} alt="" className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Two-column grid: buttons left, pills right ─────── */}
                            <div className="flex-1 grid grid-cols-[auto_auto] gap-x-0 gap-y-5 content-center items-center pl-6">

                                <input
                                    ref={cameraRef}
                                    type="file" accept="image/*" capture="environment"
                                    onChange={(e) => handlePhotoCapture(e.target.files?.[0])}
                                    className="hidden"
                                />

                                {/* Row 1: Take Photo */}
                                <button
                                    onClick={() => cameraRef.current?.click()}
                                    disabled={saving}
                                    className="w-40 h-40 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-90 disabled:opacity-50 flex items-center justify-center shadow-2xl shadow-amber-900/50 transition-all justify-self-center"
                                >
                                    {saving ? <Loader2 className="w-14 h-14 animate-spin" /> : <Camera className="w-14 h-14" />}
                                </button>
                                <div className="flex flex-col gap-2 justify-self-start">
                                    <span className="bg-white text-black font-semibold text-lg px-4 py-2 rounded-2xl shadow-md text-left leading-none justify-self-start">
                                        take photo
                                    </span>
                                    <AnimatePresence>
                                        {savedFlash && (
                                            <motion.span
                                                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                                                className="bg-green-500 text-white font-semibold text-base px-4 py-2 rounded-2xl shadow-md text-left leading-none"
                                            >
                                                ✓ saved!
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Row 2: Mic */}
                                <button
                                    onClick={saveDescription}
                                    disabled={!pendingDescription.trim() || !lastSavedSlideId}
                                    className="w-36 h-36 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-90 disabled:opacity-30 flex items-center justify-center shadow-xl shadow-blue-900/50 transition-all justify-self-center"
                                >
                                    {descSaved ? <Check className="w-14 h-14 text-white" /> : <Mic className="w-14 h-14 text-white" />}
                                </button>
                                <span className="bg-white text-black font-semibold text-lg px-4 py-2 rounded-2xl shadow-md text-left leading-none justify-self-start">
                                    record caption
                                </span>

                                {/* Row 3: New Chapter */}
                                <button
                                    onClick={startNewChapter}
                                    className="w-24 h-24 rounded-full bg-teal-500 hover:bg-teal-400 active:scale-90 flex items-center justify-center shadow-xl shadow-teal-900/50 transition-all justify-self-center"
                                >
                                    <Plus className="w-10 h-10" />
                                </button>
                                <span className="bg-white text-black font-semibold text-lg px-4 py-2 rounded-2xl shadow-md text-left leading-none justify-self-start">
                                    new chapter
                                </span>

                                {/* Row 4: Finish Story */}
                                <button
                                    onClick={finishStory}
                                    className="w-24 h-24 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-90 flex items-center justify-center shadow-xl shadow-rose-900/50 transition-all justify-self-center"
                                >
                                    <Check className="w-10 h-10" />
                                </button>
                                <span className="bg-white text-black font-semibold text-lg px-4 py-2 rounded-2xl shadow-md text-left leading-none justify-self-start">
                                    finish story
                                </span>

                            </div>

                        </motion.div>
                    )}

                    {/* ── 4: Finish screen ───────────────────────────────────── */}
                    {step === 4 && (
                        <motion.div key="finish"
                            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                            className="flex flex-col"
                            style={{ height: 'calc(100vh - 60px)' }}
                        >
                            {/* Story info — centred in top space */}
                            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                                <motion.div
                                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                                    transition={{ delay: 0.15, duration: 0.5, type: 'spring', stiffness: 200 }}
                                    className="w-32 h-32 rounded-full bg-green-500/20 flex items-center justify-center mb-8"
                                >
                                    <Check className="w-16 h-16 text-green-400" strokeWidth={2.5} />
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3, duration: 0.4 }}
                                    className="space-y-3"
                                >
                                    <h2 className="text-5xl font-bold text-white">story saved!</h2>
                                    <p className="text-3xl text-amber-400 font-semibold">{storyTitle}</p>
                                    <p className="text-2xl text-zinc-300 font-medium">
                                        {chapterCountRef.current} chapter{chapterCountRef.current !== 1 ? 's' : ''}
                                        {' · '}
                                        {totalPhotosRef.current} photo{totalPhotosRef.current !== 1 ? 's' : ''}
                                    </p>
                                </motion.div>
                            </div>

                            {/* Start over — circle + pill */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 0.4 }}
                                className="flex-shrink-0 pb-10 flex items-center pl-6"
                            >
                                <button
                                    onClick={startOver}
                                    className="w-40 h-40 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-90 flex items-center justify-center shadow-2xl shadow-amber-900/50 transition-all flex-shrink-0"
                                >
                                    <RotateCcw className="w-14 h-14" />
                                </button>
                                <span className="bg-white text-black font-semibold text-lg px-4 py-2 rounded-2xl shadow-md text-left leading-none">
                                    capture another story
                                </span>
                            </motion.div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
}
