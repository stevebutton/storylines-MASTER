import React, { useState, useEffect } from 'react';
import { X, FileEdit, Images, MessageSquare, Smartphone, ChevronRight, Mail, Pencil, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/api/supabaseClient';
import InterviewModePanel from './InterviewModePanel';
import MapDataImportPanel from './MapDataImportPanel';
import RichTextEditor from './RichTextEditor';

const PANEL_ID = 'new-story';

const OPTION_META = {
    scratch:      { icon: FileEdit,    colors: { bg: 'bg-blue-50',   hover: 'hover:bg-blue-100',   icon: 'text-blue-600',   text: 'text-blue-700'   } },
    map:          { icon: Images,      colors: { bg: 'bg-amber-50',   hover: 'hover:bg-amber-100',  icon: 'text-amber-600',  text: 'text-amber-700'  } },
    interview:    { icon: MessageSquare, colors: { bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100', icon: 'text-indigo-600', text: 'text-indigo-700' } },
    storyboarder: { icon: Smartphone,  colors: { bg: 'bg-orange-50',  hover: 'hover:bg-orange-100', icon: 'text-orange-600', text: 'text-orange-700' } },
};

const OPTION_ACTIONS = {
    scratch:      (navigate, onClose) => () => { navigate(createPageUrl('StoryEditor')); onClose(); },
    map:          (navigate, onClose, setMapOpen) => () => setMapOpen(true),
    interview:    (navigate, onClose, setMapOpen, setInterviewOpen) => () => setInterviewOpen(true),
    storyboarder: (navigate, onClose, setMapOpen, setInterviewOpen, setExpanded) => () => setExpanded(v => !v),
};

export default function StoryCreationOptionsPanel({ isOpen, onClose }) {
    const navigate = useNavigate();
    const [isInterviewModeOpen, setIsInterviewModeOpen] = useState(false);
    const [isMapDataImportOpen, setIsMapDataImportOpen] = useState(false);
    const [storyboarderExpanded, setStoryboarderExpanded] = useState(false);
    const [emailAddress, setEmailAddress] = useState('');
    const [emailSent, setEmailSent] = useState(false);

    const [content, setContent] = useState({});   // keyed by topic_id → {id, title, body}
    const [isEditing, setIsEditing] = useState(false);
    const [drafts, setDrafts] = useState({});      // keyed by topic_id → {title, body}
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        loadContent();
    }, [isOpen]);

    const loadContent = async () => {
        const { data } = await supabase
            .from('app_content')
            .select('*')
            .eq('panel_id', PANEL_ID)
            .order('display_order');
        if (data) {
            const map = {};
            data.forEach(row => { map[row.topic_id] = row; });
            setContent(map);
        }
    };

    const handleSendEmail = () => {
        if (!emailAddress.trim()) return;
        const url = `${window.location.origin}${createPageUrl('Storyboarder')}`;
        const subject = encodeURIComponent('Your Storyboarder link');
        const body = encodeURIComponent(
            `Open this link on your mobile device to start capturing your story:\n\n${url}\n\nStoryboarder lets you capture chapters, photos, voice descriptions, and GPS locations in the field — ready to finish in the Storylines Story Editor.`
        );
        window.location.href = `mailto:${emailAddress.trim()}?subject=${subject}&body=${body}`;
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 3000);
    };

    const startEditing = () => {
        const d = {};
        Object.entries(content).forEach(([id, row]) => {
            d[id] = { title: row.title, body: row.body };
        });
        setDrafts(d);
        setIsEditing(true);
    };

    const handleSaveAll = async () => {
        setIsSaving(true);
        await Promise.all(
            Object.entries(drafts).map(([topicId, draft]) => {
                const row = content[topicId];
                if (!row) return Promise.resolve();
                return supabase.from('app_content')
                    .update({ title: draft.title, body: draft.body, updated_at: new Date().toISOString() })
                    .eq('id', row.id);
            })
        );
        // Refresh content
        await loadContent();
        setIsSaving(false);
        setIsEditing(false);
    };

    const setDraftBody = (topicId, body) => {
        setDrafts(d => ({ ...d, [topicId]: { ...d[topicId], body } }));
    };

    const getBody = (topicId) => isEditing
        ? (drafts[topicId]?.body ?? content[topicId]?.body ?? '')
        : (content[topicId]?.body ?? '');

    const getTitle = (topicId) => content[topicId]?.title ?? '';

    // Option order and keys
    const optionOrder = ['scratch', 'map', 'interview', 'storyboarder'];

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
                        className="fixed right-0 top-0 h-full w-[60vw] bg-white shadow-2xl z-[70] flex flex-col"
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
                                        New Story
                                    </h1>
                                    {!isEditing ? (
                                        <button
                                            onClick={startEditing}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium transition-colors"
                                        >
                                            <Pencil className="w-4 h-4" /> Edit
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveAll}
                                                disabled={isSaving}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                                            >
                                                <Check className="w-4 h-4" /> {isSaving ? 'Saving…' : 'Save All'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <p className="text-sm text-slate-600 mb-6">
                                Choose how you want to start. Each method is designed for a different workflow — from building in the editor to capturing on location.
                            </p>

                            <div className="space-y-4">
                                {optionOrder.map((id) => {
                                    const meta = OPTION_META[id];
                                    const Icon = meta.icon;
                                    const colorSet = meta.colors;
                                    const title = getTitle(id);

                                    const handleClick = {
                                        scratch:      () => { navigate(createPageUrl('StoryEditor')); onClose(); },
                                        map:          () => setIsMapDataImportOpen(true),
                                        interview:    () => setIsInterviewModeOpen(true),
                                        storyboarder: () => setStoryboarderExpanded(v => !v),
                                    }[id];

                                    return (
                                        <div key={id} className={`w-full rounded-lg text-left overflow-hidden ${colorSet.bg}`}>
                                            <button
                                                onClick={isEditing ? undefined : handleClick}
                                                className={`w-full text-left ${isEditing ? '' : colorSet.hover + ' transition-colors'}`}
                                            >
                                                <div className="flex items-start gap-4 p-4">
                                                    <div className="p-3 flex-shrink-0">
                                                        <Icon className={`w-8 h-8 ${colorSet.icon}`} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className={`text-lg font-semibold mb-2 ${colorSet.text}`}>
                                                            {title || id}
                                                        </h3>
                                                        {isEditing ? (
                                                            <div onClick={e => e.stopPropagation()}>
                                                                <RichTextEditor
                                                                    content={getBody(id)}
                                                                    onChange={body => setDraftBody(id, body)}
                                                                    placeholder="Option description…"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div
                                                                className="prose prose-sm prose-slate max-w-none text-slate-600"
                                                                dangerouslySetInnerHTML={{ __html: getBody(id) }}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </button>

                                            {/* ── Storyboarder expanded detail ── */}
                                            {id === 'storyboarder' && storyboarderExpanded && (
                                                <div className="px-5 pb-6 border-t border-orange-200">
                                                    {isEditing ? (
                                                        <div className="mt-4" onClick={e => e.stopPropagation()}>
                                                            <RichTextEditor
                                                                content={getBody('storyboarder-steps')}
                                                                onChange={body => setDraftBody('storyboarder-steps', body)}
                                                                placeholder="Storyboarder step-by-step instructions…"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className="prose prose-sm prose-slate max-w-none mt-4 text-slate-700"
                                                            dangerouslySetInnerHTML={{ __html: getBody('storyboarder-steps') }}
                                                        />
                                                    )}

                                                    {/* Action buttons — always functional */}
                                                    <div className="mt-5 flex flex-col gap-3">
                                                        <button
                                                            onClick={() => { navigate(createPageUrl('Storyboarder')); onClose(); }}
                                                            className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold rounded-xl transition-colors w-fit"
                                                        >
                                                            Open Storyboarder <ChevronRight className="w-4 h-4" />
                                                        </button>
                                                        <div>
                                                            <p className="text-xs text-slate-500 mb-2">Or send the link to your phone:</p>
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="email"
                                                                    value={emailAddress}
                                                                    onChange={(e) => setEmailAddress(e.target.value)}
                                                                    onKeyDown={(e) => e.key === 'Enter' && handleSendEmail()}
                                                                    placeholder="your@email.com"
                                                                    className="flex-1 px-4 py-2.5 rounded-xl border border-orange-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-400 transition-colors"
                                                                />
                                                                <button
                                                                    onClick={handleSendEmail}
                                                                    disabled={!emailAddress.trim()}
                                                                    className="flex items-center gap-2 px-4 py-2.5 bg-orange-100 hover:bg-orange-200 disabled:opacity-40 text-orange-700 text-sm font-semibold rounded-xl transition-colors border border-orange-200 flex-shrink-0"
                                                                >
                                                                    <Mail className="w-4 h-4" />
                                                                    {emailSent ? 'Sent!' : 'Send'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}

            {/* Interview Mode Panel */}
            <InterviewModePanel
                isOpen={isInterviewModeOpen}
                onClose={() => setIsInterviewModeOpen(false)}
            />

            {/* Map / Photo Import Panel */}
            <MapDataImportPanel
                isOpen={isMapDataImportOpen}
                onClose={() => setIsMapDataImportOpen(false)}
            />
        </AnimatePresence>
    );
}
