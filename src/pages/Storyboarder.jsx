import React, { useState, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
    Camera, Mic, ChevronRight, Loader2, Check, Plus, Sparkles, BookOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import VoiceNarrationRecorder from '@/components/mobile/VoiceNarrationRecorder';
import { resizeImage } from '@/components/mobile/ImageResizer';

const generateId = () => crypto.randomUUID().replace(/-/g, '').substring(0, 24);

// Silent GPS capture — resolves null on any failure
const captureGPS = () =>
    new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 8000 }
        );
    });

export default function Storyboarder() {
    const navigate = useNavigate();

    // ── Step ──────────────────────────────────────────────────────────────────
    // 0 = welcome  1 = story name  2 = chapter name  3 = capture loop
    const [step, setStep] = useState(0);

    // ── Story ─────────────────────────────────────────────────────────────────
    const [storyTitle, setStoryTitle] = useState('');
    const [storyId, setStoryId] = useState(null);

    // ── Chapter ───────────────────────────────────────────────────────────────
    const [chapterName, setChapterName] = useState('');
    const [chapterId, setChapterId] = useState(null);
    const chapterCountRef = useRef(0);

    // ── Capture loop ──────────────────────────────────────────────────────────
    const [slides, setSlides] = useState([]);          // thumbnail strip
    const [pendingTitle, setPendingTitle] = useState('');
    const [showVoice, setShowVoice] = useState(false);

    // ── Status ────────────────────────────────────────────────────────────────
    const [saving, setSaving] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);

    const cameraRef = useRef(null);

    // ── Story creation ────────────────────────────────────────────────────────
    const createStory = async () => {
        if (!storyTitle.trim()) return;
        setSaving(true);
        try {
            const id = generateId();
            const { data, error } = await supabase
                .from('stories')
                .insert({
                    id,
                    title: storyTitle.trim(),
                    subtitle: 'Draft from mobile capture',
                    is_published: false,
                })
                .select()
                .single();
            if (error) throw error;
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
    const createChapter = async () => {
        if (!chapterName.trim()) return;
        setSaving(true);
        try {
            const id = generateId();
            const { data, error } = await supabase
                .from('chapters')
                .insert({
                    id,
                    story_id: storyId,
                    name: chapterName.trim(),
                    order: chapterCountRef.current,
                    alignment: 'left',
                })
                .select()
                .single();
            if (error) throw error;
            chapterCountRef.current += 1;
            setChapterId(data.id);
            setChapterName('');
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
            // Resize + GPS in parallel — neither blocks the other
            const [resized, gps] = await Promise.all([
                resizeImage(file, 800),
                captureGPS(),
            ]);

            const filePath = `${generateId()}-${file.name}`;
            const { error: upErr } = await supabase.storage
                .from('media')
                .upload(filePath, resized, { contentType: resized.type });
            if (upErr) throw upErr;

            const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);

            const title = pendingTitle.trim() || `Photo ${slides.length + 1}`;
            const slideId = generateId();
            const slideData = {
                id: slideId,
                chapter_id: chapterId,
                title,
                image: publicUrl,
                order: slides.length,
                ...(gps ? { coordinates: [gps.lat, gps.lng], zoom: 15 } : {}),
            };

            const { error: slideErr } = await supabase.from('slides').insert(slideData);
            if (slideErr) throw slideErr;

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

    const startNewChapter = () => {
        setChapterName('');
        setStep(2);
    };

    const finishStory = () => {
        navigate(createPageUrl('Stories'));
    };

    return (
        <div className="min-h-screen bg-zinc-900 text-white flex flex-col">
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <header className="bg-zinc-800 border-b border-zinc-700 px-5 py-4 flex items-center gap-3 sticky top-0 z-50">
                <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <span className="text-lg font-semibold tracking-wide">Storyboarder</span>
                {storyTitle && (
                    <span className="ml-auto text-sm text-zinc-400 truncate max-w-[180px]">{storyTitle}</span>
                )}
            </header>

            {/* ── Steps ──────────────────────────────────────────────────────── */}
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
                                Capture your story on location — photos, voice, and GPS all in one go.
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

                    {/* ── 1: Story name ──────────────────────────────────────── */}
                    {step === 1 && (
                        <motion.div
                            key="story"
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -40 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="p-6 space-y-6"
                        >
                            <div>
                                <p className="text-zinc-400 text-sm uppercase tracking-widest mb-1">Step 1</p>
                                <h2 className="text-2xl font-bold">Name your story</h2>
                            </div>

                            <input
                                autoFocus
                                value={storyTitle}
                                onChange={(e) => setStoryTitle(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && createStory()}
                                placeholder="e.g. Road Trip Through Patagonia"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-4 text-white placeholder-zinc-500 text-lg focus:outline-none focus:border-amber-500 transition-colors"
                            />

                            <button
                                onClick={createStory}
                                disabled={!storyTitle.trim() || saving}
                                className="w-full h-14 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg font-semibold transition-colors"
                            >
                                {saving ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Creating…</>
                                ) : (
                                    <>Create Story <ChevronRight className="w-5 h-5" /></>
                                )}
                            </button>
                        </motion.div>
                    )}

                    {/* ── 2: Chapter name ────────────────────────────────────── */}
                    {step === 2 && (
                        <motion.div
                            key="chapter"
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -40 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="p-6 space-y-6"
                        >
                            <div>
                                <p className="text-zinc-400 text-sm uppercase tracking-widest mb-1">
                                    {chapterCountRef.current === 0 ? 'Step 2' : 'New chapter'}
                                </p>
                                <h2 className="text-2xl font-bold">Name this chapter</h2>
                            </div>

                            <input
                                autoFocus
                                value={chapterName}
                                onChange={(e) => setChapterName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && createChapter()}
                                placeholder="e.g. Arriving in Buenos Aires"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-4 text-white placeholder-zinc-500 text-lg focus:outline-none focus:border-amber-500 transition-colors"
                            />

                            <button
                                onClick={createChapter}
                                disabled={!chapterName.trim() || saving}
                                className="w-full h-14 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg font-semibold transition-colors"
                            >
                                {saving ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Creating…</>
                                ) : (
                                    <>Start Capturing <ChevronRight className="w-5 h-5" /></>
                                )}
                            </button>
                        </motion.div>
                    )}

                    {/* ── 3: Capture loop ────────────────────────────────────── */}
                    {step === 3 && (
                        <motion.div
                            key="capture"
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

                            {/* Optional title + voice */}
                            <div className="px-5 pb-4 space-y-3">
                                <div className="flex gap-2">
                                    <input
                                        value={pendingTitle}
                                        onChange={(e) => setPendingTitle(e.target.value)}
                                        placeholder="Photo title (optional — fill before shooting)"
                                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                                    />
                                    <button
                                        onClick={() => setShowVoice((v) => !v)}
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                                            showVoice
                                                ? 'bg-amber-500 text-white'
                                                : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
                                        }`}
                                        aria-label="Voice input"
                                    >
                                        <Mic className="w-5 h-5" />
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

                            {/* ── Camera button (primary action) ─────────────── */}
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
                                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                                        {slides.map((slide) => (
                                            <div
                                                key={slide.id}
                                                className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-zinc-800 ring-1 ring-zinc-700"
                                            >
                                                <img
                                                    src={slide.image}
                                                    alt={slide.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Footer actions ──────────────────────────────── */}
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

                </AnimatePresence>
            </div>
        </div>
    );
}
