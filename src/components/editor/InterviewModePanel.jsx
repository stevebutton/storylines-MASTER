import React, { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import TitleValidationDialog from '@/components/editor/TitleValidationDialog';

const generateId = () => crypto.randomUUID().replace(/-/g, '').substring(0, 24);

export default function InterviewModePanel({ isOpen, onClose }) {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [locations, setLocations] = useState('');
    const [description, setDescription] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState(null);
    const [showTitleValidationDialog, setShowTitleValidationDialog] = useState(false);
    const [pendingTitle, setPendingTitle] = useState('');

    const handleCreate = async () => {
        if (!title.trim()) return;

        if (title.trim().length > 34) {
            setPendingTitle(title.trim());
            setShowTitleValidationDialog(true);
            return;
        }

        setIsCreating(true);
        setError(null);

        try {
            const { data: newStory, error: storyErr } = await supabase
                .from('stories')
                .insert({
                    id: generateId(),
                    title: title.trim(),
                    story_description: description.trim() || null,
                    story_locations: locations.trim() || null,
                    is_published: false,
                })
                .select()
                .single();

            if (storyErr) throw storyErr;

            navigate(`${createPageUrl('StoryEditor')}?id=${newStory.id}`);
            onClose();
        } catch (err) {
            console.error('[project-brief] create failed:', err);
            setError('Failed to create project. Please try again.');
            setIsCreating(false);
        }
    };

    const handleClose = () => {
        setTitle('');
        setLocations('');
        setDescription('');
        setError(null);
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
                        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-amber-50 to-orange-50">
                            <div className="flex items-center gap-3">
                                <Sparkles className="w-8 h-8 text-amber-600" />
                                <div>
                                    <h2 className="text-4xl font-bold text-slate-800">Project Brief</h2>
                                    <p className="text-sm text-slate-600 mt-1">Three questions to define your project — takes 60 seconds</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={handleClose}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Form */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            {/* Q1 */}
                            <div className="space-y-2">
                                <div className="flex items-baseline gap-3">
                                    <span className="text-3xl font-bold text-amber-500">1</span>
                                    <Label htmlFor="brief-title" className="text-lg font-semibold text-slate-800">
                                        What do you want to call this project?
                                    </Label>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="brief-title"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g. Water Access in the Sahel"
                                        className="h-12 text-base pr-16"
                                        maxLength={60}
                                    />
                                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${
                                        title.length > 34 ? 'text-amber-500 font-medium' : 'text-slate-400'
                                    }`}>
                                        {title.length}/34
                                    </span>
                                </div>
                                {title.length > 34 && (
                                    <p className="text-xs text-amber-600">
                                        Titles over 34 characters may be truncated in map view — you can shorten it in the editor.
                                    </p>
                                )}
                            </div>

                            {/* Q2 */}
                            <div className="space-y-2">
                                <div className="flex items-baseline gap-3">
                                    <span className="text-3xl font-bold text-amber-500">2</span>
                                    <Label htmlFor="brief-locations" className="text-lg font-semibold text-slate-800">
                                        Where does it take place?
                                    </Label>
                                </div>
                                <Input
                                    id="brief-locations"
                                    value={locations}
                                    onChange={(e) => setLocations(e.target.value)}
                                    placeholder="e.g. Northern Mali, Burkina Faso border region"
                                    className="h-12 text-base"
                                />
                                <p className="text-xs text-slate-500">
                                    Used to give the AI geographic context when generating captions.
                                </p>
                            </div>

                            {/* Q3 */}
                            <div className="space-y-2">
                                <div className="flex items-baseline gap-3">
                                    <span className="text-3xl font-bold text-amber-500">3</span>
                                    <Label htmlFor="brief-description" className="text-lg font-semibold text-slate-800">
                                        What is it about, and what tone should the narrative take?
                                    </Label>
                                </div>
                                <Textarea
                                    id="brief-description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g. A field documentation of a rural water infrastructure programme, focusing on community impact. Tone: factual, empathetic, suitable for donor reporting."
                                    rows={5}
                                    className="text-base resize-none"
                                />
                                <p className="text-xs text-slate-500">
                                    Becomes the Story Description and shapes how captions are written throughout.
                                </p>
                            </div>

                            {error && (
                                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t p-6 flex items-center justify-between">
                            <Button variant="outline" onClick={handleClose} disabled={isCreating}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreate}
                                disabled={!title.trim() || isCreating}
                                className="bg-amber-600 hover:bg-amber-700 min-w-[160px]"
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Creating…
                                    </>
                                ) : (
                                    'Create Project'
                                )}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Title length advisory */}
            <TitleValidationDialog
                isOpen={showTitleValidationDialog}
                onClose={() => {
                    setShowTitleValidationDialog(false);
                    setPendingTitle('');
                }}
                title={pendingTitle}
                onEdit={() => {
                    setShowTitleValidationDialog(false);
                    setPendingTitle('');
                    // User stays in the form to edit title
                }}
            />
        </>
    );
}
