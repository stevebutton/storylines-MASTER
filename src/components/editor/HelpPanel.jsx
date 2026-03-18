import React, { useState, useEffect } from 'react';
import { X, Pencil, Check, Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/api/supabaseClient';
import RichTextEditor from './RichTextEditor';

const PANEL_ID = 'help';

function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `topic-${Date.now()}`;
}

export default function HelpPanel({ isOpen, onClose }) {
    const [topics, setTopics] = useState([]);
    const [activeTopic, setActiveTopic] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    // draft holds edits for the currently active topic
    const [draft, setDraft] = useState({ title: '', body: '' });

    // ── Load topics from DB ──────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        loadTopics();
    }, [isOpen]);

    const loadTopics = async () => {
        const { data, error } = await supabase
            .from('app_content')
            .select('*')
            .eq('panel_id', PANEL_ID)
            .order('display_order');
        if (!error && data?.length) {
            setTopics(data);
            setActiveTopic(prev => prev ?? data[0].topic_id);
        }
    };

    const activeContent = topics.find(t => t.topic_id === activeTopic);

    // Sync draft whenever active topic or edit mode changes
    useEffect(() => {
        if (isEditing && activeContent) {
            setDraft({ title: activeContent.title, body: activeContent.body });
        }
    }, [activeTopic, isEditing]);

    // ── Save current draft ───────────────────────────────────────────────────
    const handleSave = async () => {
        if (!activeContent) return;
        setIsSaving(true);
        const { error } = await supabase
            .from('app_content')
            .update({ title: draft.title, body: draft.body, updated_at: new Date().toISOString() })
            .eq('id', activeContent.id);
        if (!error) {
            setTopics(prev => prev.map(t => t.id === activeContent.id ? { ...t, ...draft } : t));
        }
        setIsSaving(false);
        setIsEditing(false);
    };

    // ── Add new topic ────────────────────────────────────────────────────────
    const handleAddTopic = async () => {
        const maxOrder = topics.reduce((m, t) => Math.max(m, t.display_order), -1);
        const newTopic = {
            panel_id: PANEL_ID,
            topic_id: `topic-${Date.now()}`,
            title: 'New Topic',
            body: '<p>Add your content here.</p>',
            display_order: maxOrder + 1,
        };
        const { data, error } = await supabase.from('app_content').insert(newTopic).select().single();
        if (!error && data) {
            setTopics(prev => [...prev, data]);
            setActiveTopic(data.topic_id);
            setDraft({ title: data.title, body: data.body });
            setIsEditing(true);
        }
    };

    // ── Delete active topic ──────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!activeContent || topics.length <= 1) return;
        if (!window.confirm(`Delete "${activeContent.title}"?`)) return;
        const { error } = await supabase.from('app_content').delete().eq('id', activeContent.id);
        if (!error) {
            const remaining = topics.filter(t => t.id !== activeContent.id);
            setTopics(remaining);
            setActiveTopic(remaining[0]?.topic_id ?? null);
            setIsEditing(false);
        }
    };

    // ── Move topic up/down ───────────────────────────────────────────────────
    const handleMove = async (topicId, direction) => {
        const idx = topics.findIndex(t => t.topic_id === topicId);
        const swapIdx = idx + direction;
        if (swapIdx < 0 || swapIdx >= topics.length) return;
        const reordered = [...topics];
        [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
        const updated = reordered.map((t, i) => ({ ...t, display_order: i }));
        setTopics(updated);
        // Persist new orders
        await Promise.all(updated.map(t =>
            supabase.from('app_content').update({ display_order: t.display_order }).eq('id', t.id)
        ));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 z-[60]"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed left-80 right-0 top-0 h-full bg-white shadow-2xl z-[70] flex flex-col"
                    >
                        {/* Header */}
                        <div className="bg-white border-b shadow-sm">
                            <div className="px-4 py-3">
                                <div className="flex items-center gap-4 mb-4">
                                    <button
                                        onClick={onClose}
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
                                    <h1 className="text-[42px] font-bold text-slate-900 flex-1 leading-tight">
                                        Help
                                    </h1>
                                    {/* Edit / Save controls */}
                                    {!isEditing ? (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium transition-colors"
                                        >
                                            <Pencil className="w-4 h-4" /> Edit
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handleDelete}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" /> Delete
                                            </button>
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

                        {/* Main Layout */}
                        <div className="flex flex-1 overflow-hidden">
                            {/* Sidebar */}
                            <div className="w-56 border-r bg-slate-50 overflow-y-auto flex flex-col">
                                <div className="flex flex-col p-3 gap-1 flex-1">
                                    {topics.map((topic, idx) => (
                                        <div key={topic.topic_id} className="flex items-center gap-1 group">
                                            {/* Reorder arrows (edit mode only) */}
                                            {isEditing && (
                                                <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleMove(topic.topic_id, -1)}
                                                        disabled={idx === 0}
                                                        className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-[10px] leading-none"
                                                        title="Move up"
                                                    >▲</button>
                                                    <button
                                                        onClick={() => handleMove(topic.topic_id, 1)}
                                                        disabled={idx === topics.length - 1}
                                                        className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-[10px] leading-none"
                                                        title="Move down"
                                                    >▼</button>
                                                </div>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setActiveTopic(topic.topic_id);
                                                    if (isEditing) setDraft({ title: topic.title, body: topic.body });
                                                }}
                                                className={cn(
                                                    'justify-start flex-1 text-left truncate',
                                                    activeTopic === topic.topic_id
                                                        ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white'
                                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                                )}
                                            >
                                                {topic.title}
                                            </Button>
                                        </div>
                                    ))}
                                </div>

                                {/* Add topic button (edit mode) */}
                                {isEditing && (
                                    <div className="p-3 border-t border-slate-200">
                                        <button
                                            onClick={handleAddTopic}
                                            className="flex items-center gap-1.5 w-full px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-medium transition-colors"
                                        >
                                            <Plus className="w-4 h-4" /> Add Topic
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {isEditing && activeContent ? (
                                    <div className="space-y-4 max-w-2xl">
                                        <input
                                            type="text"
                                            value={draft.title}
                                            onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                                            className="w-full text-lg font-semibold text-slate-900 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400"
                                            placeholder="Topic title"
                                        />
                                        <RichTextEditor
                                            content={draft.body}
                                            onChange={body => setDraft(d => ({ ...d, body }))}
                                            placeholder="Write help content…"
                                        />
                                    </div>
                                ) : (
                                    <div className="prose prose-slate max-w-none">
                                        <h3 className="text-lg font-semibold text-slate-900 mb-4">
                                            {activeContent?.title}
                                        </h3>
                                        <div
                                            dangerouslySetInnerHTML={{ __html: activeContent?.body ?? '' }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
