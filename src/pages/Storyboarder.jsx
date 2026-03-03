import React, { useState, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
    Camera, ChevronRight, Loader2, Check, Plus, Sparkles, BookOpen, RotateCcw,
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
            className="p-6 flex flex-col gap-6"
        >
            <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">{eyebrow}</p>
                <h2 className="text-2xl font-bold">{label}</h2>
            </div>

            <div className="bg-zinc-800 rounded-2xl p-4">
                <VoiceNarrationRecorder onTranscriptChange={setTitle} initialTranscript="" />
            </div>

            {title ? (
                <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase tracking-widest">Captured title</p>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-4 text-white text-xl font-semibold focus:outline-none focus:border-amber-500 transition-colors"
                    />
                </div>
            ) : (
                <p className="text-zinc-600 text-sm text-center italic">{placeholder}</p>
            )}

            <button
                onClick={() => onConfirm(title)}
                disabled={!title.trim() || saving}
                className="w-full h-14 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg font-semibold transition-colors mt-auto"
            >
                {saving
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating…</>
                    : <>Confirm <ChevronRight className="w-5 h-5" /></>
                }
            </button>
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
                    <span className="ml-auto text-sm text-zinc-400 truncate max-w-[180px]">{storyTitle}</span>
                )}
            </header>

            <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">

                    {/* ── 0: Welcome ─────────────────────────────────────────── */}
                    {step === 0 && (
                        <motion.div key="welcome"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center min-h-[calc(100vh-60px)] p-8 text-center"
                        >
                            <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mb-8">
                                <BookOpen className="w-10 h-10 text-amber-400" />
                            </div>
                            <h2 className="text-4xl font-bold mb-3">Storyboarder</h2>
                            <p className="text-zinc-400 text-lg leading-relaxed max-w-sm mb-10">
                                Capture your story on location — voice, photos, and GPS in one go.
                            </p>
                            <button
                                onClick={() => setStep(1)}
                                className="w-full max-w-xs h-14 rounded-2xl bg-amber-500 hover:bg-amber-400 flex items-center justify-center gap-2 text-lg font-semibold transition-colors"
                            >
                                Start a new story <ChevronRight className="w-6 h-6" />
                            </button>
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

                    {/* ── 3: Capture loop — true 50/50 split, no scroll ──────── */}
                    {step === 3 && (
                        <motion.div key={`capture-${chapterId}`}
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -40 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="flex flex-col overflow-hidden"
                            style={{ height: 'calc(100vh - 60px)' }}
                        >
                            {/* Chapter label row */}
                            <div className="px-5 pt-4 pb-2 flex items-center gap-2 flex-shrink-0">
                                <span className="text-amber-400 font-medium text-sm">
                                    Chapter {String(chapterCountRef.current).padStart(2, '0')}
                                </span>
                                {slides.length > 0 && (
                                    <span className="text-zinc-600 text-xs">
                                        · {slides.length} photo{slides.length !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>

                            {/* ── TOP HALF: camera ───────────────────────────── */}
                            <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-0 px-5">
                                <input
                                    ref={cameraRef}
                                    type="file" accept="image/*" capture="environment"
                                    onChange={(e) => handlePhotoCapture(e.target.files?.[0])}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => cameraRef.current?.click()}
                                    disabled={saving}
                                    className="w-40 h-40 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 flex flex-col items-center justify-center gap-2 shadow-2xl shadow-amber-900/40 transition-all flex-shrink-0"
                                >
                                    {saving
                                        ? <><Loader2 className="w-12 h-12 animate-spin" /><span className="text-sm font-medium">Saving…</span></>
                                        : <><Camera className="w-12 h-12" /><span className="text-sm font-semibold">Take Photo</span></>
                                    }
                                </button>

                                {/* Saved flash */}
                                <AnimatePresence>
                                    {savedFlash && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                            className="bg-green-600 rounded-xl px-5 py-2 text-sm font-semibold flex items-center gap-2"
                                        >
                                            <Check className="w-4 h-4" /> Photo saved!
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Thumbnail strip */}
                            {slides.length > 0 && (
                                <div className="px-5 pb-3 flex-shrink-0">
                                    <div className="flex gap-2 overflow-x-auto">
                                        {slides.map((slide) => (
                                            <div key={slide.id}
                                                className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-zinc-800 ring-1 ring-zinc-700">
                                                <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── DIVIDER ────────────────────────────────────── */}
                            <div className="border-t border-zinc-800 flex-shrink-0" />

                            {/* ── BOTTOM HALF: description recorder ──────────── */}
                            <div className="flex-1 flex flex-col min-h-0 px-5 pt-4 pb-3 gap-3">
                                <p className="text-xs text-zinc-500 uppercase tracking-widest flex-shrink-0">
                                    {lastSavedSlideId ? 'Add a description' : 'Description — take a photo first'}
                                </p>

                                {/* Recorder — key resets it for each new photo */}
                                <div className="flex-1 min-h-0 overflow-hidden">
                                    <VoiceNarrationRecorder
                                        key={lastSavedSlideId ?? 'init'}
                                        onTranscriptChange={setPendingDescription}
                                        initialTranscript=""
                                    />
                                </div>

                                {/* Save / Clear — always visible */}
                                <div className="flex gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => setPendingDescription('')}
                                        disabled={!pendingDescription.trim()}
                                        className="flex-1 h-11 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-zinc-400 disabled:opacity-30 hover:bg-zinc-700 hover:text-white transition-colors"
                                    >
                                        Clear
                                    </button>
                                    <button
                                        onClick={saveDescription}
                                        disabled={!pendingDescription.trim() || !lastSavedSlideId}
                                        className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-sm font-semibold transition-colors"
                                    >
                                        {descSaved ? '✓ Saved!' : 'Save description'}
                                    </button>
                                </div>
                            </div>

                            {/* ── FOOTER ─────────────────────────────────────── */}
                            <div className="px-5 pb-5 pt-2 flex gap-3 flex-shrink-0 border-t border-zinc-800">
                                <button
                                    onClick={startNewChapter}
                                    className="flex-1 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> New Chapter
                                </button>
                                <button
                                    onClick={finishStory}
                                    className="flex-1 h-10 rounded-xl bg-zinc-700 border border-zinc-600 flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-600 hover:text-white transition-colors"
                                >
                                    <Check className="w-3.5 h-3.5" /> Finish Story
                                </button>
                            </div>

                        </motion.div>
                    )}

                    {/* ── 4: Finish screen ───────────────────────────────────── */}
                    {step === 4 && (
                        <motion.div key="finish"
                            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                            className="flex flex-col items-center justify-center min-h-[calc(100vh-60px)] p-8 text-center"
                        >
                            <motion.div
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                transition={{ delay: 0.15, duration: 0.5, type: 'spring', stiffness: 200 }}
                                className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mb-8"
                            >
                                <Check className="w-12 h-12 text-green-400" strokeWidth={2.5} />
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.4 }}
                                className="space-y-3 mb-10"
                            >
                                <h2 className="text-3xl font-bold">Story saved!</h2>
                                <p className="text-xl text-amber-400 font-medium">{storyTitle}</p>
                                <p className="text-zinc-400 text-base">
                                    {chapterCountRef.current} chapter{chapterCountRef.current !== 1 ? 's' : ''}
                                    {' · '}
                                    {totalPhotosRef.current} photo{totalPhotosRef.current !== 1 ? 's' : ''}
                                </p>
                                <p className="text-zinc-500 text-sm max-w-xs mx-auto leading-relaxed">
                                    Your story is ready to edit in the Storylines desktop editor.
                                </p>
                            </motion.div>

                            <motion.button
                                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 0.4 }}
                                onClick={startOver}
                                className="w-full max-w-xs h-14 rounded-2xl bg-amber-500 hover:bg-amber-400 flex items-center justify-center gap-2 text-lg font-semibold transition-colors"
                            >
                                <RotateCcw className="w-5 h-5" /> Capture another story
                            </motion.button>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
}
