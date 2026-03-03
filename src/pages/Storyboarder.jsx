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
function VoiceTitleStep({ label, eyebrow, placeholder, onConfirm, saving }) {
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

            {/* Voice recorder — primary input */}
            <div className="bg-zinc-800 rounded-2xl p-4">
                <VoiceNarrationRecorder
                    onTranscriptChange={setTitle}
                    initialTranscript=""
                />
            </div>

            {/* Transcript result — editable fallback */}
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
                {saving ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Creating…</>
                ) : (
                    <>Confirm <ChevronRight className="w-5 h-5" /></>
                )}
            </button>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Storyboarder() {
    // ── Step ──────────────────────────────────────────────────────────────────
    // 0 = welcome  1 = story name  2 = chapter name  3 = capture loop  4 = finish
    const [step, setStep] = useState(0);

    // ── Story ─────────────────────────────────────────────────────────────────
    const [storyTitle, setStoryTitle] = useState('');
    const [storyId, setStoryId] = useState(null);

    // ── Chapter ───────────────────────────────────────────────────────────────
    const [chapterId, setChapterId] = useState(null);
    const chapterCountRef = useRef(0);

    // ── Capture loop ──────────────────────────────────────────────────────────
    const [slides, setSlides] = useState([]);
    const [pendingTitle, setPendingTitle] = useState('');
    const [showVoice, setShowVoice] = useState(false);
    const totalPhotosRef = useRef(0);

    // ── Status ────────────────────────────────────────────────────────────────
    const [saving, setSaving] = useState(false);
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
            setStep(3);
        } catch (e) {
            console.error(e);
            alert('Could not create chapter. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // ── Auto-save slide on photo capture ──────────────────────────────────────
    const handlePhotoCapture = async (file) => {
        if (!file || saving) return;
        setSaving(true);
        setSavedFlash(false);
        try {
            const [resized, gps] = await Promise.all([resizeImage(file, 800), captureGPS()]);

            const filePath = `${generateId()}-${file.name}`;
            const { error: upErr } = await supabase.storage
                .from('media').upload(filePath, resized, { contentType: resized.type });
            if (upErr) throw upErr;

            const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);

            const title = pendingTitle.trim() || `Photo ${totalPhotosRef.current + 1}`;
            const slideId = generateId();
            const { error: slideErr } = await supabase.from('slides').insert({
                id: slideId,
                chapter_id: chapterId,
                title,
                image: publicUrl,
                order: slides.length,
                ...(gps ? { coordinates: [gps.lat, gps.lng], zoom: 15 } : {}),
            });
            if (slideErr) throw slideErr;

            totalPhotosRef.current += 1;
            setSlides((prev) => [...prev, { id: slideId, title, image: publicUrl }]);
            setPendingTitle('');
            setShowVoice(false);
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

    const startNewChapter = () => setStep(2);

    const finishStory = () => setStep(4);

    const startOver = () => {
        setStep(0);
        setStoryTitle('');
        setStoryId(null);
        setChapterId(null);
        chapterCountRef.current = 0;
        setSlides([]);
        setPendingTitle('');
        setShowVoice(false);
        totalPhotosRef.current = 0;
    };

    return (
        <div className="min-h-screen bg-zinc-900 text-white flex flex-col">
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <header className="bg-zinc-800 border-b border-zinc-700 px-5 py-4 flex items-center gap-3 sticky top-0 z-50">
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
                        <motion.div
                            key="welcome"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
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
                                Start a new story
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </motion.div>
                    )}

                    {/* ── 1: Story name (voice-first) ─────────────────────────── */}
                    {step === 1 && (
                        <VoiceTitleStep
                            key="story"
                            eyebrow="Step 1 of 2"
                            label="Say your story title"
                            placeholder="Speak into the mic to set your story title"
                            onConfirm={createStory}
                            saving={saving}
                        />
                    )}

                    {/* ── 2: Chapter name (voice-first) ───────────────────────── */}
                    {step === 2 && (
                        <VoiceTitleStep
                            key={`chapter-${chapterCountRef.current}`}
                            eyebrow={chapterCountRef.current === 0 ? 'Step 2 of 2' : 'New chapter'}
                            label="Say the chapter name"
                            placeholder="Speak into the mic to name this chapter"
                            onConfirm={createChapter}
                            saving={saving}
                        />
                    )}

                    {/* ── 3: Capture loop ────────────────────────────────────── */}
                    {step === 3 && (
                        <motion.div
                            key={`capture-${chapterId}`}
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -40 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="flex flex-col min-h-[calc(100vh-60px)]"
                        >
                            {/* Chapter label */}
                            <div className="px-5 pt-5 pb-2 flex items-baseline gap-2">
                                <span className="text-amber-400 font-medium">
                                    Chapter {String(chapterCountRef.current).padStart(2, '0')}
                                </span>
                                {slides.length > 0 && (
                                    <span className="text-zinc-500 text-sm">
                                        · {slides.length} photo{slides.length !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>

                            {/* Optional photo title — voice toggle */}
                            <div className="px-5 pb-4 space-y-3">
                                <div className="flex gap-2">
                                    <input
                                        value={pendingTitle}
                                        onChange={(e) => setPendingTitle(e.target.value)}
                                        placeholder="Photo title (optional)"
                                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                                    />
                                    <button
                                        onClick={() => setShowVoice((v) => !v)}
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                                            showVoice
                                                ? 'bg-amber-500 text-white'
                                                : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white'
                                        }`}
                                    >
                                        🎤
                                    </button>
                                </div>
                                <AnimatePresence>
                                    {showVoice && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            style={{ overflow: 'hidden' }}
                                        >
                                            <div className="bg-zinc-800 rounded-xl p-4">
                                                <VoiceNarrationRecorder
                                                    onTranscriptChange={setPendingTitle}
                                                    initialTranscript={pendingTitle}
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* ── Camera button ──────────────────────────────── */}
                            <div className="flex-1 flex items-center justify-center px-5 py-8">
                                <input
                                    ref={cameraRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) => handlePhotoCapture(e.target.files?.[0])}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => cameraRef.current?.click()}
                                    disabled={saving}
                                    className="w-44 h-44 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 flex flex-col items-center justify-center gap-2 shadow-2xl shadow-amber-900/40 transition-all"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-14 h-14 animate-spin" />
                                            <span className="text-sm font-medium">Saving…</span>
                                        </>
                                    ) : (
                                        <>
                                            <Camera className="w-14 h-14" />
                                            <span className="text-sm font-semibold">Take Photo</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Saved flash */}
                            <AnimatePresence>
                                {savedFlash && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="mx-5 mb-3 bg-green-600 rounded-xl py-2.5 text-center text-sm font-semibold flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-4 h-4" /> Photo saved!
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Thumbnail strip */}
                            {slides.length > 0 && (
                                <div className="px-5 pb-4">
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {slides.map((slide) => (
                                            <div
                                                key={slide.id}
                                                className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-zinc-800 ring-1 ring-zinc-700"
                                            >
                                                <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Footer actions */}
                            <div className="px-5 pb-8 pt-2 flex gap-3">
                                <button
                                    onClick={startNewChapter}
                                    className="flex-1 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center gap-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    New Chapter
                                </button>
                                <button
                                    onClick={finishStory}
                                    className="flex-1 h-12 rounded-xl bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 flex items-center justify-center gap-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                                >
                                    <Check className="w-4 h-4" />
                                    Finish Story
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── 4: Finish screen ───────────────────────────────────── */}
                    {step === 4 && (
                        <motion.div
                            key="finish"
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                            className="flex flex-col items-center justify-center min-h-[calc(100vh-60px)] p-8 text-center"
                        >
                            {/* Check mark */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.15, duration: 0.5, type: 'spring', stiffness: 200 }}
                                className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mb-8"
                            >
                                <Check className="w-12 h-12 text-green-400" strokeWidth={2.5} />
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
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
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 0.4 }}
                                onClick={startOver}
                                className="w-full max-w-xs h-14 rounded-2xl bg-amber-500 hover:bg-amber-400 flex items-center justify-center gap-2 text-lg font-semibold transition-colors"
                            >
                                <RotateCcw className="w-5 h-5" />
                                Capture another story
                            </motion.button>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
}
